from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session, selectinload
from typing import List, Optional
from backend.app.database import get_db, SessionLocal
from backend.app.entidades.albaran import (
    Albaran,
    AlbaranDB,
    AlbaranLineaCreate,
    OneWordEstado,
)
from backend.app.entidades.linea_albaran import LineaAlbaranDB
from backend.app.entidades.cliente import ClienteDB, ClienteCreate
from backend.app.entidades.producto import ProductoDB
from backend.app.entidades.movimiento import MovimientoDB
from sqlalchemy import func

from backend.app.utils.emailer import send_email_with_pdf
from backend.app.utils.albaran_pdf import generar_pdf_albaran
from backend.app.utils.templates import render

from pydantic import BaseModel
from datetime import date
import logging

router = APIRouter()
log = logging.getLogger("albaranes")


class AlbaranCreateFull(BaseModel):
    """
    Payload completo para crear un albarán. Admite cliente nuevo (objeto)
    o cliente existente (cliente_id). El campo fianza_cantidad es opcional:
    si no se indica, se calcula automáticamente como el 30% del total.
    """

    fecha: date
    descripcion: Optional[str] = None
    cliente_id: Optional[int] = None
    cliente: Optional[ClienteCreate] = None
    items: List[AlbaranLineaCreate]
    estado: OneWordEstado = "FIANZA"
    registrar_fianza: bool = True
    fianza_cantidad: Optional[float] = None


class EstadoUpdate(BaseModel):
    estado: OneWordEstado


def _send_albaran_email_task(albaran_id: int):
    """
    Tarea de fondo: genera el PDF del albarán y lo envía por email al cliente.
    Abre su propia sesión de BD porque se ejecuta fuera del contexto de la petición HTTP.
    """
    db = SessionLocal()
    try:
        log.info("[email] Preparando envío para albarán #%s", albaran_id)
        albaran = db.query(AlbaranDB).filter(AlbaranDB.id == albaran_id).first()
        if not albaran:
            log.warning("[email] Albarán %s no existe", albaran_id)
            return

        cliente = db.query(ClienteDB).filter(ClienteDB.id == albaran.cliente_id).first()
        if not cliente or not cliente.email:
            log.warning(
                "[email] Cliente inexistente o sin email para albarán %s", albaran_id
            )
            return

        lineas = (
            db.query(LineaAlbaranDB)
            .filter(LineaAlbaranDB.albaran_id == albaran.id)
            .all()
        )
        prods = {}
        if lineas:
            prod_ids = {ln.producto_id for ln in lineas}
            for p in db.query(ProductoDB).filter(ProductoDB.id.in_(prod_ids)).all():
                prods[p.id] = p

        lineas_ext = []
        total = 0.0
        for ln in lineas:
            subtotal = (ln.cantidad or 0) * (ln.precio_unitario or 0.0)
            total += subtotal
            nombre = (
                prods.get(ln.producto_id).nombre
                if prods.get(ln.producto_id)
                else f"Producto {ln.producto_id}"
            )
            lineas_ext.append(
                {
                    "producto_nombre": nombre,
                    "cantidad": ln.cantidad,
                    "precio_unitario": ln.precio_unitario,
                    "p_unit_eur": f"{ln.precio_unitario:.2f} €",
                    "subtotal": subtotal,
                    "subtotal_eur": f"{subtotal:.2f} €",
                }
            )

        html = render(
            "albaran_email.html",
            albaran=albaran,
            cliente=cliente,
            lineas=lineas_ext,
            fecha_humana=albaran.fecha.strftime("%d/%m/%Y"),
            total_eur=f"{(albaran.total or total):.2f} €",
        )

        pdf_bytes = generar_pdf_albaran(albaran, cliente, lineas_ext)
        subject = f"Albarán #{albaran.id} - {albaran.fecha.strftime('%d/%m/%Y')}"
        filename = f"albaran_{albaran.id}.pdf"

        send_email_with_pdf(
            to_email=cliente.email,
            subject=subject,
            html_body=html,
            pdf_bytes=pdf_bytes,
            pdf_filename=filename,
        )
        log.info(
            "[email] Envío OK al cliente %s para albarán #%s", cliente.email, albaran.id
        )
    except Exception as e:
        log.exception("[email] Error enviando albarán #%s: %s", albaran_id, e)
    finally:
        db.close()


@router.post("/albaranes/post", response_model=Albaran)
def crear_albaran(
    payload: AlbaranCreateFull,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """
    Crea un albarán completo: cliente (nuevo o existente), líneas de pedido y
    movimiento de fianza (30 % del total por defecto). Envía el PDF por email
    al cliente en segundo plano.
    """
    # 1) Resolver o crear el cliente
    if payload.cliente_id:
        cliente = db.query(ClienteDB).filter(ClienteDB.id == payload.cliente_id).first()
        if not cliente:
            raise HTTPException(404, "Cliente no encontrado")
        cliente_id = cliente.id
    elif payload.cliente:
        c = None
        if payload.cliente.dni:
            c = db.query(ClienteDB).filter(ClienteDB.dni == payload.cliente.dni).first()
        if not c and payload.cliente.email:
            c = (
                db.query(ClienteDB)
                .filter(ClienteDB.email == payload.cliente.email)
                .first()
            )
        if c:
            for k, v in payload.cliente.model_dump().items():
                if v is not None:
                    setattr(c, k, v)
            cliente_id = c.id
        else:
            c = ClienteDB(**payload.cliente.model_dump())
            db.add(c)
            db.flush()
            cliente_id = c.id
    else:
        raise HTTPException(400, "Debes indicar cliente_id o datos de cliente")

    # 2) Albarán
    albaran = AlbaranDB(
        fecha=payload.fecha,
        descripcion=payload.descripcion or "",
        cliente_id=cliente_id,
        total=0.0,
        estado=payload.estado or "FIANZA",
    )
    db.add(albaran)
    db.flush()

    # 3) Líneas + total
    total = 0.0
    for it in payload.items:
        prod = db.query(ProductoDB).filter(ProductoDB.id == it.producto_id).first()
        if not prod:
            raise HTTPException(404, f"Producto {it.producto_id} no existe")
        precio_unitario = (
            it.precio_unitario if it.precio_unitario is not None else prod.precio
        )
        linea = LineaAlbaranDB(
            albaran_id=albaran.id,
            producto_id=it.producto_id,
            cantidad=it.cantidad,
            precio_unitario=precio_unitario,
        )
        total += precio_unitario * it.cantidad
        db.add(linea)

    albaran.total = total
    db.commit()
    db.refresh(albaran)

    # 3.1) Movimiento de fianza (INGRESO) — SIEMPRE
    # Evitamos duplicados por reintentos del cliente.
    concepto_fianza = f"Fianza albarán #{albaran.id}"
    ya = (
        db.query(MovimientoDB)
        .filter(
            MovimientoDB.tipo == "INGRESO",
            MovimientoDB.fecha == albaran.fecha,
            MovimientoDB.concepto == concepto_fianza,
        )
        .first()
    )
    if not ya:
        fianza = payload.fianza_cantidad
        if fianza is None:
            fianza = round((albaran.total or 0) * 0.30, 2)
        mov = MovimientoDB(
            fecha=albaran.fecha,
            concepto=concepto_fianza,
            cantidad=float(fianza),
            tipo="INGRESO",
        )
        db.add(mov)
        db.commit()

    # 4) Enviar email en background
    background_tasks.add_task(_send_albaran_email_task, albaran.id)

    return albaran


@router.get("/albaranes/get", response_model=List[Albaran])
def listar_albaranes(db: Session = Depends(get_db)):
    return db.query(AlbaranDB).all()


@router.get("/albaranes/get/{albaran_id}", response_model=Albaran)
def obtener_albaran(albaran_id: int, db: Session = Depends(get_db)):
    albaran = db.query(AlbaranDB).filter(AlbaranDB.id == albaran_id).first()
    if not albaran:
        raise HTTPException(404, "Albarán no encontrado")
    return albaran


@router.get("/albaranes/by-cliente/{cliente_id}", response_model=List[Albaran])
def albaranes_por_cliente(cliente_id: int, db: Session = Depends(get_db)):
    q = (
        db.query(AlbaranDB)
        .options(selectinload(AlbaranDB.lineas))
        .filter(AlbaranDB.cliente_id == cliente_id)
        .order_by(AlbaranDB.fecha.desc(), AlbaranDB.id.desc())
    )
    return q.all()


@router.patch("/albaranes/{albaran_id}/estado", response_model=Albaran)
def actualizar_estado(
    albaran_id: int, payload: EstadoUpdate, db: Session = Depends(get_db)
):
    """
    Marca un albarán como ENTREGADO (único cambio de estado permitido).
    Si queda importe pendiente tras descontar la fianza, registra automáticamente
    un movimiento de INGRESO con la diferencia.
    """
    if (payload.estado or "").upper() != "ENTREGADO":
        raise HTTPException(
            status_code=400, detail="Sólo se permite cambiar a ENTREGADO."
        )

    alb = db.query(AlbaranDB).filter(AlbaranDB.id == albaran_id).first()
    if not alb:
        raise HTTPException(404, "Albarán no encontrado")

    alb.estado = "ENTREGADO"
    db.commit()
    db.refresh(alb)

    # Calcular fianza (suma de movimientos INGRESO con concepto 'Fianza albarán #id')
    fianza = (
        db.query(func.coalesce(func.sum(MovimientoDB.cantidad), 0.0))
        .filter(
            MovimientoDB.tipo == "INGRESO",
            MovimientoDB.concepto == f"Fianza albarán #{alb.id}",
        )
        .scalar()
        or 0.0
    )
    pendiente = max(0.0, float(alb.total or 0) - float(fianza or 0))

    if pendiente > 0:
        mov = MovimientoDB(
            fecha=date.today(),
            concepto=f"Cobro albarán #{alb.id} (pendiente)",
            cantidad=float(pendiente),
            tipo="INGRESO",
        )
        db.add(mov)
        db.commit()

    return alb


@router.get("/albaranes/{albaran_id}/pdf")
def descargar_pdf_albaran(albaran_id: int, db: Session = Depends(get_db)):
    """Genera y descarga el PDF de un albarán específico."""
    from fastapi.responses import StreamingResponse
    from io import BytesIO

    albaran = db.query(AlbaranDB).filter(AlbaranDB.id == albaran_id).first()
    if not albaran:
        raise HTTPException(404, "Albarán no encontrado")

    cliente = db.query(ClienteDB).filter(ClienteDB.id == albaran.cliente_id).first()

    lineas = (
        db.query(LineaAlbaranDB).filter(LineaAlbaranDB.albaran_id == albaran.id).all()
    )
    prods = {}
    if lineas:
        prod_ids = {ln.producto_id for ln in lineas}
        for p in db.query(ProductoDB).filter(ProductoDB.id.in_(prod_ids)).all():
            prods[p.id] = p

    lineas_ext = []
    total = 0.0
    for ln in lineas:
        subtotal = (ln.cantidad or 0) * (ln.precio_unitario or 0.0)
        total += subtotal
        nombre = (
            prods.get(ln.producto_id).nombre
            if prods.get(ln.producto_id)
            else f"Producto {ln.producto_id}"
        )
        lineas_ext.append(
            {
                "producto_nombre": nombre,
                "cantidad": ln.cantidad,
                "precio_unitario": ln.precio_unitario,
                "p_unit_eur": f"{ln.precio_unitario:.2f} €",
                "subtotal": subtotal,
                "subtotal_eur": f"{subtotal:.2f} €",
            }
        )

    pdf_bytes = generar_pdf_albaran(albaran, cliente, lineas_ext)

    nombre_cliente = ""
    if cliente:
        nombre_cliente = f"_{cliente.nombre}_{cliente.apellidos}".replace(" ", "_")
    filename = f"albaran_{albaran.id}{nombre_cliente}.pdf"

    return StreamingResponse(
        BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/transporte/almacen", response_model=List[Albaran])
def pedidos_en_almacen(db: Session = Depends(get_db)):
    """Devuelve los albaranes en estado ALMACEN, ordenados por fecha de entrada."""
    return (
        db.query(AlbaranDB)
        .filter(AlbaranDB.estado == "ALMACEN")
        .order_by(AlbaranDB.fecha.asc(), AlbaranDB.id.asc())
        .all()
    )


@router.get("/transporte/ruta", response_model=List[Albaran])
def pedidos_en_ruta(db: Session = Depends(get_db)):
    """Devuelve los albaranes en estado RUTA (ya asignados a un camión)."""
    return (
        db.query(AlbaranDB)
        .filter(AlbaranDB.estado == "RUTA")
        .order_by(AlbaranDB.fecha.asc(), AlbaranDB.id.asc())
        .all()
    )
