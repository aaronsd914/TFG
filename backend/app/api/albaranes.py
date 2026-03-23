from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session, selectinload
from typing import List, Optional
from backend.app.database import get_db, SessionLocal
from backend.app.entidades.albaran import (
    DeliveryNote,
    DeliveryNoteDB,
    DeliveryNoteItemCreate,
    DeliveryNoteStatus,
)
from backend.app.entidades.linea_albaran import DeliveryNoteLineDB
from backend.app.entidades.cliente import CustomerDB, CustomerCreate
from backend.app.entidades.producto import ProductDB
from backend.app.entidades.movimiento import MovementDB
from sqlalchemy import func

from backend.app.utils.emailer import send_email_with_pdf
from backend.app.utils.albaran_pdf import generate_delivery_note_pdf
from backend.app.utils.templates import render
from backend.app.dependencies import get_current_user
from backend.app.api.configuracion import get_value as get_cfg

from pydantic import BaseModel
from datetime import date
import logging

router = APIRouter(dependencies=[Depends(get_current_user)])
log = logging.getLogger("albaranes")


class DeliveryNoteCreateFull(BaseModel):
    """
    Full payload for creating a delivery note. Accepts a new customer (object)
    or an existing customer (customer_id). The deposit_amount field is optional:
    if not provided, it defaults to 30% of the total.
    """

    date: date
    description: Optional[str] = None
    customer_id: Optional[int] = None
    customer: Optional[CustomerCreate] = None
    items: List[DeliveryNoteItemCreate]
    status: DeliveryNoteStatus = "FIANZA"
    register_deposit: bool = True
    deposit_amount: Optional[float] = None


class StatusUpdate(BaseModel):
    status: DeliveryNoteStatus


def _send_delivery_note_email_task(delivery_note_id: int):
    """
    Background task: generates the delivery note PDF and sends it by email to the customer.
    Opens its own DB session because it runs outside the HTTP request context.
    """
    db = SessionLocal()
    try:
        log.info("[email] Preparing send for delivery note #%s", delivery_note_id)
        delivery_note = db.query(DeliveryNoteDB).filter(DeliveryNoteDB.id == delivery_note_id).first()
        if not delivery_note:
            log.warning("[email] Delivery note %s does not exist", delivery_note_id)
            return

        customer = db.query(CustomerDB).filter(CustomerDB.id == delivery_note.customer_id).first()
        if not customer or not customer.email:
            log.warning(
                "[email] Customer missing or no email for delivery note %s", delivery_note_id
            )
            return

        lines = (
            db.query(DeliveryNoteLineDB)
            .filter(DeliveryNoteLineDB.delivery_note_id == delivery_note.id)
            .all()
        )
        prods = {}
        if lines:
            prod_ids = {ln.product_id for ln in lines}
            for p in db.query(ProductDB).filter(ProductDB.id.in_(prod_ids)).all():
                prods[p.id] = p

        enriched_lines = []
        total = 0.0
        for ln in lines:
            subtotal = (ln.quantity or 0) * (ln.unit_price or 0.0)
            total += subtotal
            name = (
                prods.get(ln.product_id).name
                if prods.get(ln.product_id)
                else f"Producto {ln.product_id}"
            )
            enriched_lines.append(
                {
                    "producto_nombre": name,
                    "cantidad": ln.quantity,
                    "precio_unitario": ln.unit_price,
                    "p_unit_eur": f"{ln.unit_price:.2f} €",
                    "subtotal": subtotal,
                    "subtotal_eur": f"{subtotal:.2f} €",
                }
            )

        store_name = get_cfg(db, "tienda_nombre")
        logo_base64 = get_cfg(db, "logo_empresa") or None
        email_signature = get_cfg(db, "firma_email")

        html = render(
            "albaran_email.html",
            albaran=delivery_note,
            cliente=customer,
            lineas=enriched_lines,
            fecha_humana=delivery_note.date.strftime("%d/%m/%Y"),
            total_eur=f"{(delivery_note.total or total):.2f} €",
            tienda_nombre=store_name,
            firma_email=email_signature,
        )

        pdf_bytes = generate_delivery_note_pdf(
            delivery_note,
            customer,
            enriched_lines,
            tienda_nombre=store_name,
            logo_base64=logo_base64,
        )
        subject = f"Albaran #{delivery_note.id} - {delivery_note.date.strftime('%d/%m/%Y')}"
        filename = f"albaran_{delivery_note.id}.pdf"

        send_email_with_pdf(
            to_email=customer.email,
            subject=subject,
            html_body=html,
            pdf_bytes=pdf_bytes,
            pdf_filename=filename,
        )
        log.info(
            "[email] Send OK to customer %s for delivery note #%s", customer.email, delivery_note.id
        )
    except Exception as e:
        log.exception("[email] Error sending delivery note #%s: %s", delivery_note_id, e)
    finally:
        db.close()


@router.post("/albaranes/post", response_model=DeliveryNote)
def create_delivery_note(
    payload: DeliveryNoteCreateFull,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """
    Creates a full delivery note: customer (new or existing), order lines and
    deposit movement (30% of total by default). Sends the PDF by email to the
    customer in the background.
    """
    if payload.customer_id:
        customer = db.query(CustomerDB).filter(CustomerDB.id == payload.customer_id).first()
        if not customer:
            raise HTTPException(404, "Cliente no encontrado")
        customer_id = customer.id
    elif payload.customer:
        c = None
        if payload.customer.dni:
            c = db.query(CustomerDB).filter(CustomerDB.dni == payload.customer.dni).first()
        if not c and payload.customer.email:
            c = (
                db.query(CustomerDB)
                .filter(CustomerDB.email == payload.customer.email)
                .first()
            )
        if c:
            for k, v in payload.customer.model_dump().items():
                if v is not None:
                    setattr(c, k, v)
            customer_id = c.id
        else:
            c = CustomerDB(**payload.customer.model_dump())
            db.add(c)
            db.flush()
            customer_id = c.id
    else:
        raise HTTPException(400, "Debes indicar cliente_id o datos de cliente")

    delivery_note = DeliveryNoteDB(
        date=payload.date,
        description=payload.description or "",
        customer_id=customer_id,
        total=0.0,
        status=payload.status or "FIANZA",
    )
    db.add(delivery_note)
    db.flush()

    total = 0.0
    for it in payload.items:
        prod = db.query(ProductDB).filter(ProductDB.id == it.product_id).first()
        if not prod:
            raise HTTPException(404, f"Producto {it.product_id} no existe")
        unit_price = it.unit_price if it.unit_price is not None else prod.price
        line = DeliveryNoteLineDB(
            delivery_note_id=delivery_note.id,
            product_id=it.product_id,
            quantity=it.quantity,
            unit_price=unit_price,
        )
        total += unit_price * it.quantity
        db.add(line)

    delivery_note.total = total
    db.commit()
    db.refresh(delivery_note)

    deposit_description = f"Fianza albaran #{delivery_note.id}"
    existing = (
        db.query(MovementDB)
        .filter(
            MovementDB.type == "INGRESO",
            MovementDB.date == delivery_note.date,
            MovementDB.description == deposit_description,
        )
        .first()
    )
    if not existing:
        deposit_amount = payload.deposit_amount
        if deposit_amount is None:
            deposit_amount = round((delivery_note.total or 0) * 0.30, 2)
        mov = MovementDB(
            date=delivery_note.date,
            description=deposit_description,
            amount=float(deposit_amount),
            type="INGRESO",
        )
        db.add(mov)
        db.commit()

    background_tasks.add_task(_send_delivery_note_email_task, delivery_note.id)

    return delivery_note


@router.get("/albaranes/get", response_model=List[DeliveryNote])
def list_delivery_notes(db: Session = Depends(get_db)):
    return db.query(DeliveryNoteDB).all()


@router.get("/albaranes/get/{delivery_note_id}", response_model=DeliveryNote)
def get_delivery_note(delivery_note_id: int, db: Session = Depends(get_db)):
    delivery_note = db.query(DeliveryNoteDB).filter(DeliveryNoteDB.id == delivery_note_id).first()
    if not delivery_note:
        raise HTTPException(404, "Albaran no encontrado")
    return delivery_note


@router.get("/albaranes/by-cliente/{customer_id}", response_model=List[DeliveryNote])
def delivery_notes_by_customer(customer_id: int, db: Session = Depends(get_db)):
    q = (
        db.query(DeliveryNoteDB)
        .options(selectinload(DeliveryNoteDB.items))
        .filter(DeliveryNoteDB.customer_id == customer_id)
        .order_by(DeliveryNoteDB.date.desc(), DeliveryNoteDB.id.desc())
    )
    return q.all()


@router.patch("/albaranes/{delivery_note_id}/estado", response_model=DeliveryNote)
def update_status(
    delivery_note_id: int, payload: StatusUpdate, db: Session = Depends(get_db)
):
    """
    Marks a delivery note as ENTREGADO (only allowed status change).
    If there is a remaining amount after subtracting the deposit, an INGRESO
    movement is automatically registered for the difference.
    """
    if (payload.status or "").upper() != "ENTREGADO":
        raise HTTPException(
            status_code=400, detail="Solo se permite cambiar a ENTREGADO."
        )

    delivery_note = db.query(DeliveryNoteDB).filter(DeliveryNoteDB.id == delivery_note_id).first()
    if not delivery_note:
        raise HTTPException(404, "Albaran no encontrado")

    delivery_note.status = "ENTREGADO"
    db.commit()
    db.refresh(delivery_note)

    deposit = (
        db.query(func.coalesce(func.sum(MovementDB.amount), 0.0))
        .filter(
            MovementDB.type == "INGRESO",
            MovementDB.description == f"Fianza albaran #{delivery_note.id}",
        )
        .scalar()
        or 0.0
    )
    remaining = max(0.0, float(delivery_note.total or 0) - float(deposit or 0))

    if remaining > 0:
        mov = MovementDB(
            date=date.today(),
            description=f"Cobro albaran #{delivery_note.id} (pendiente)",
            amount=float(remaining),
            type="INGRESO",
        )
        db.add(mov)
        db.commit()

    return delivery_note


@router.get("/albaranes/{delivery_note_id}/pdf")
def download_delivery_note_pdf(delivery_note_id: int, db: Session = Depends(get_db)):
    """Generates and downloads the PDF for a specific delivery note."""
    from fastapi.responses import StreamingResponse
    from io import BytesIO

    delivery_note = db.query(DeliveryNoteDB).filter(DeliveryNoteDB.id == delivery_note_id).first()
    if not delivery_note:
        raise HTTPException(404, "Albaran no encontrado")

    customer = db.query(CustomerDB).filter(CustomerDB.id == delivery_note.customer_id).first()

    lines = (
        db.query(DeliveryNoteLineDB).filter(DeliveryNoteLineDB.delivery_note_id == delivery_note.id).all()
    )
    prods = {}
    if lines:
        prod_ids = {ln.product_id for ln in lines}
        for p in db.query(ProductDB).filter(ProductDB.id.in_(prod_ids)).all():
            prods[p.id] = p

    enriched_lines = []
    total = 0.0
    for ln in lines:
        subtotal = (ln.quantity or 0) * (ln.unit_price or 0.0)
        total += subtotal
        name = (
            prods.get(ln.product_id).name
            if prods.get(ln.product_id)
            else f"Producto {ln.product_id}"
        )
        enriched_lines.append(
            {
                "producto_nombre": name,
                "cantidad": ln.quantity,
                "precio_unitario": ln.unit_price,
                "p_unit_eur": f"{ln.unit_price:.2f} €",
                "subtotal": subtotal,
                "subtotal_eur": f"{subtotal:.2f} €",
            }
        )

    pdf_bytes = generate_delivery_note_pdf(delivery_note, customer, enriched_lines)

    customer_name = ""
    if customer:
        customer_name = f"_{customer.name}_{customer.surnames}".replace(" ", "_")
    filename = f"albaran_{delivery_note.id}{customer_name}.pdf"

    return StreamingResponse(
        BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/transporte/almacen", response_model=List[DeliveryNote])
def orders_in_warehouse(db: Session = Depends(get_db)):
    """Returns delivery notes in ALMACEN status, ordered by entry date."""
    return (
        db.query(DeliveryNoteDB)
        .filter(DeliveryNoteDB.status == "ALMACEN")
        .order_by(DeliveryNoteDB.date.asc(), DeliveryNoteDB.id.asc())
        .all()
    )


@router.get("/transporte/ruta", response_model=List[DeliveryNote])
def orders_in_route(db: Session = Depends(get_db)):
    """Returns delivery notes in RUTA status (already assigned to a truck)."""
    return (
        db.query(DeliveryNoteDB)
        .filter(DeliveryNoteDB.status == "RUTA")
        .order_by(DeliveryNoteDB.date.asc(), DeliveryNoteDB.id.asc())
        .all()
    )