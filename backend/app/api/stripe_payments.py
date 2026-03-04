from __future__ import annotations

import logging
from datetime import datetime
from typing import Optional

import stripe
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.entidades.movimiento import MovimientoDB
from backend.app.entidades.stripe_checkout import StripeCheckoutDB
from backend.app.stripe_settings import (
    STRIPE_CANCEL_URL,
    STRIPE_CURRENCY,
    STRIPE_PUBLISHABLE_KEY,
    STRIPE_SECRET_KEY,
    STRIPE_SUCCESS_URL,
)


log = logging.getLogger("stripe")

router = APIRouter(prefix="/api/stripe", tags=["stripe"])


class CheckoutIn(BaseModel):
    amount: float
    description: str = "Cobro"
    # opcional: por si luego quieres enlazarlo a un albarán
    albaran_id: Optional[int] = None


class ConfirmIn(BaseModel):
    session_id: str


@router.get("/status")
def stripe_status():
    """Devuelve la configuración activa de Stripe: moneda, clave pública y URLs de retorno."""
    return {
        "configured": bool(STRIPE_SECRET_KEY),
        "currency": STRIPE_CURRENCY,
        # publishable se puede exponer
        "publishable_key": STRIPE_PUBLISHABLE_KEY or None,
        "success_url": STRIPE_SUCCESS_URL,
        "cancel_url": STRIPE_CANCEL_URL,
    }


@router.post("/checkout")
def create_checkout(payload: CheckoutIn):
    """
    Crea una Stripe Checkout Session con el importe indicado y devuelve
    su id y URL. El frontend redirige al usuario a esa URL para completar el pago.
    """
    if not STRIPE_SECRET_KEY:
        raise HTTPException(500, "Stripe no está configurado (STRIPE_SECRET_KEY)")

    amount = float(payload.amount or 0)
    if amount <= 0:
        raise HTTPException(400, "El importe debe ser mayor que 0")

    stripe.api_key = STRIPE_SECRET_KEY

    # Stripe trabaja en céntimos
    unit_amount = int(round(amount * 100))
    meta = {
        "description": (payload.description or "Cobro")[:200],
    }
    if payload.albaran_id is not None:
        meta["albaran_id"] = str(payload.albaran_id)

    try:
        session = stripe.checkout.Session.create(
            mode="payment",
            payment_method_types=["card"],
            line_items=[
                {
                    "price_data": {
                        "currency": STRIPE_CURRENCY,
                        "product_data": {"name": meta["description"]},
                        "unit_amount": unit_amount,
                    },
                    "quantity": 1,
                }
            ],
            success_url=STRIPE_SUCCESS_URL,
            cancel_url=STRIPE_CANCEL_URL,
            metadata=meta,
        )
    except Exception as e:
        log.exception("Error creando Checkout Session: %s", e)
        raise HTTPException(502, f"Stripe error creando checkout: {e}")

    # Devuelve el id y la URL de redirección para que el frontend lleve al usuario a pagar
    return {"id": session.id, "url": session.url}


@router.post("/confirm")
def confirm_checkout(payload: ConfirmIn, db: Session = Depends(get_db)):
    """CONFIRM simple (sin webhook):

    - El frontend llama a este endpoint al volver de Stripe (success_url).
    - El backend verifica en Stripe que el pago está 'paid'.
    - Si es la primera vez que vemos ese session_id, crea un Movimiento (INGRESO).

    Para un TFG es perfecto y evita configurar Stripe CLI + webhook.
    """

    if not STRIPE_SECRET_KEY:
        raise HTTPException(500, "Stripe no está configurado (STRIPE_SECRET_KEY)")
    sid = (payload.session_id or "").strip()
    if not sid:
        raise HTTPException(400, "session_id requerido")

    # idempotencia
    already = db.query(StripeCheckoutDB).filter(StripeCheckoutDB.session_id == sid).first()
    if already:
        return {
            "ok": True,
            "created": False,
            "session_id": sid,
            "amount": already.amount,
            "currency": already.currency,
            "description": already.description,
        }

    stripe.api_key = STRIPE_SECRET_KEY
    try:
        session = stripe.checkout.Session.retrieve(sid)
    except Exception as e:
        raise HTTPException(502, f"No se pudo recuperar la sesión en Stripe: {e}")

    payment_status = getattr(session, "payment_status", None) or (
        session.get("payment_status") if isinstance(session, dict) else None
    )
    status = getattr(session, "status", None) or (session.get("status") if isinstance(session, dict) else None)
    if payment_status != "paid":
        raise HTTPException(400, f"La sesión no está pagada (payment_status={payment_status}, status={status})")

    amount_total = getattr(session, "amount_total", None) or (
        session.get("amount_total") if isinstance(session, dict) else 0
    )
    currency = (
        getattr(session, "currency", None)
        or (session.get("currency") if isinstance(session, dict) else STRIPE_CURRENCY)
        or STRIPE_CURRENCY
    ).lower()
    meta = getattr(session, "metadata", None) or (session.get("metadata") if isinstance(session, dict) else {}) or {}
    desc = meta.get("description") or "Cobro"
    pi = getattr(session, "payment_intent", None) or (session.get("payment_intent") if isinstance(session, dict) else None)

    # Fecha del cobro = fecha creación sesión (o hoy si no viene)
    created_ts = getattr(session, "created", None) or (session.get("created") if isinstance(session, dict) else None)
    fecha = datetime.utcfromtimestamp(created_ts).date() if created_ts else datetime.utcnow().date()

    amount_eur = round(float(amount_total or 0) / 100.0, 2)
    concepto = f"Cobro Stripe · {desc} · {sid}"

    # 1) registrar session (idempotencia)
    rec = StripeCheckoutDB(
        session_id=sid,
        payment_intent_id=str(pi) if pi else None,
        amount=float(amount_eur),
        currency=currency,
        description=desc,
        status="paid",
    )
    db.add(rec)

    # 2) crear movimiento
    mov = MovimientoDB(
        fecha=fecha,
        concepto=concepto,
        cantidad=float(amount_eur),
        tipo="INGRESO",
    )
    db.add(mov)

    db.commit()

    return {
        "ok": True,
        "created": True,
        "session_id": sid,
        "amount": amount_eur,
        "currency": currency,
        "description": desc,
    }


@router.get("/checkouts")
def list_checkouts(limit: int = 25, db: Session = Depends(get_db)):
    """Devuelve los últimos pagos confirmados vía Stripe, ordenados del más reciente al más antiguo."""
    limit = max(1, min(int(limit or 25), 200))
    rows = (
        db.query(StripeCheckoutDB)
        .order_by(StripeCheckoutDB.created_at.desc(), StripeCheckoutDB.id.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "session_id": r.session_id,
            "payment_intent_id": r.payment_intent_id,
            "amount": r.amount,
            "currency": r.currency,
            "description": r.description,
            "status": r.status,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]
