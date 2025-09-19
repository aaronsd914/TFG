from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session, selectinload
from typing import List, Optional
from backend.app.database import SessionLocal
from backend.app.entidades.albaran import (
    Albaran, AlbaranCreate, AlbaranDB, AlbaranLineaCreate, OneWordEstado
)
from backend.app.entidades.linea_albaran import LineaAlbaranDB
from backend.app.entidades.cliente import ClienteDB, ClienteCreate
from backend.app.entidades.producto import ProductoDB
from backend.app.entidades.movimiento import MovimientoDB  # ← NUEVO: para registrar la fianza como movimiento

from backend.app.utils.emailer import send_email_with_pdf
from backend.app.utils.albaran_pdf import generar_pdf_albaran
from backend.app.utils.templates import render

from pydantic import BaseModel
from datetime import date, datetime
from pathlib import Path
import logging

router = APIRouter()
log = logging.getLogger("albaranes")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ---- Payload único (elimina la duplicación) ----
class AlbaranCreateFull(BaseModel):
    fecha: date
    descripcion: Optional[str] = None
    cliente_id: Optional[int] = None
    cliente: Optional[ClienteCreate] = None
    items: List[AlbaranLineaCreate]
    estado: OneWordEstado = "FIANZA"
    # ---- NUEVO: fianza -> movimiento automático ----
    registrar_fianza: bool = False
    # Si es None y registrar_fianza=True, el backend calculará el 30% del total automáticamente
    fianza_cantidad: Optional[float] = None

class EstadoUpdate(BaseModel):
    estado: OneWordEstado

class TransporteFacturaIn(BaseModel):
    albaran_ids: List[int]

class TransporteFacturaOut(BaseModel):
    ok: bool
    n_pedidos: int
    base_total: float
    porcentaje: float
    importe: float
    path: str

# ---- Tarea que construye y envía el email ----
def _send_albaran_email_task(albaran_id: int):
    db = SessionLocal()
    try:
        log.info("[email] Preparando envío para albarán #%s", albaran_id)
        albaran = db.query(AlbaranDB).filter(AlbaranDB.id == albaran_id).first()
        if not albaran:
            log.warning("[email] Albarán %s no existe", albaran_id); return

        cliente = db.query(ClienteDB).filter(ClienteDB.id == albaran.cliente_id).first()
        if not cliente or not cliente.email:
            log.warning("[email] Cliente inexistente o sin email para albarán %s", albaran_id); return

        lineas = db.query(LineaAlbaranDB).filter(LineaAlbaranDB.albaran_id == albaran.id).all()
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
            nombre = prods.get(ln.producto_id).nombre if prods.get(ln.producto_id) else f"Producto {ln.producto_id}"
            lineas_ext.append({
                "producto_nombre": nombre,
                "cantidad": ln.cantidad,
                "precio_unitario": ln.precio_unitario,
                "p_unit_eur": f"{ln.precio_unitario:.2f} €",
                "subtotal": subtotal,
                "subtotal_eur": f"{subtotal:.2f} €",
            })

        html = render(
            "albaran_email.html",
            albaran=albaran,
            cliente=cliente,
            lineas=lineas_ext,
            fecha_humana=albaran.fecha.strftime("%d/%m/%Y"),
            total_eur=f"{(albaran.total or total):.2f} €"
        )

        pdf_bytes = generar_pdf_albaran(albaran, cliente, lineas_ext)
        subject = f"Albarán #{albaran.id} - {albaran.fecha.strftime('%d/%m/%Y')}"
        filename = f"albaran_{albaran.id}.pdf"

        send_email_with_pdf(
            to_email=cliente.email,
            subject=subject,
            html_body=html,
            pdf_bytes=pdf_bytes,
            pdf_filename=filename
        )
        log.info("[email] Envío OK al cliente %s para albarán #%s", cliente.email, albaran.id)
    except Exception as e:
        log.exception("[email] Error enviando albarán #%s: %s", albaran_id, e)
    finally:
        db.close()

# ---- Endpoint crear: añade BackgroundTasks y dispara la tarea ----
@router.post("/albaranes/post", response_model=Albaran)
def crear_albaran(
    payload: AlbaranCreateFull,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    # 1) Cliente
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
            c = db.query(ClienteDB).filter(ClienteDB.email == payload.cliente.email).first()
        if c:
            for k, v in payload.cliente.dict().items():
                if v is not None:
                    setattr(c, k, v)
            cliente_id = c.id
        else:
            c = ClienteDB(**payload.cliente.dict())
            db.add(c); db.flush()
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
    db.add(albaran); db.flush()

    # 3) Líneas + total
    total = 0.0
    for it in payload.items:
        prod = db.query(ProductoDB).filter(ProductoDB.id == it.producto_id).first()
        if not prod:
            raise HTTPException(404, f"Producto {it.producto_id} no existe")
        precio_unitario = it.precio_unitario if it.precio_unitario is not None else prod.precio
        linea = LineaAlbaranDB(
            albaran_id=albaran.id,
            producto_id=it.producto_id,
            cantidad=it.cantidad,
            precio_unitario=precio_unitario
        )
        total += precio_unitario * it.cantidad
        db.add(linea)

    albaran.total = total
    db.commit()
    db.refresh(albaran)

    # 3.1) NUEVO: registrar movimiento de fianza si procede (INGRESO)
    if payload.registrar_fianza:
        fianza = payload.fianza_cantidad
        if fianza is None:
            fianza = round((albaran.total or 0) * 0.30, 2)  # 30% automático
        mov = MovimientoDB(
            fecha=albaran.fecha,
            concepto=f"Fianza albarán #{albaran.id}",
            cantidad=float(fianza),
            tipo="INGRESO",
        )
        db.add(mov)
        db.commit()

    # 4) ← agenda email
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

# ---- NUEVO: actualizar estado ----
@router.patch("/albaranes/{albaran_id}/estado", response_model=Albaran)
def actualizar_estado(albaran_id: int, payload: EstadoUpdate, db: Session = Depends(get_db)):
    alb = db.query(AlbaranDB).filter(AlbaranDB.id == albaran_id).first()
    if not alb:
        raise HTTPException(404, "Albarán no encontrado")
    alb.estado = payload.estado
    db.commit()
    db.refresh(alb)
    return alb

# ---- NUEVO: pedidos en almacén (para Transporte) ----
@router.get("/transporte/almacen", response_model=List[Albaran])
def pedidos_en_almacen(db: Session = Depends(get_db)):
    return (
        db.query(AlbaranDB)
        .filter(AlbaranDB.estado == "ALMACEN")
        .order_by(AlbaranDB.fecha.asc(), AlbaranDB.id.asc())
        .all()
    )

# ---- NUEVO: generar factura de transporte (7%) ----
@router.post("/transporte/factura", response_model=TransporteFacturaOut)
def generar_factura_transporte(payload: TransporteFacturaIn, db: Session = Depends(get_db)):
    if not payload.albaran_ids:
        raise HTTPException(status_code=400, detail="Debes indicar al menos un albarán.")
    albs = (
        db.query(AlbaranDB)
        .filter(AlbaranDB.id.in_(payload.albaran_ids))
        .all()
    )
    if not albs:
        raise HTTPException(status_code=404, detail="No se encontraron albaranes con esos IDs.")

    base_total = round(sum(a.total or 0 for a in albs), 2)
    porcentaje = 0.07
    importe = round(base_total * porcentaje, 2)

    # generar PDF
    hoy = datetime.now().strftime("%d-%m-%Y")
    carpeta = Path("transportes")
    carpeta.mkdir(parents=True, exist_ok=True)
    filename = carpeta / f"Transporte {hoy}.pdf"

    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.pdfgen import canvas
        from reportlab.lib.units import mm

        c = canvas.Canvas(str(filename), pagesize=A4)
        width, height = A4

        y = height - 30 * mm
        c.setFont("Helvetica-Bold", 16)
        c.drawString(20 * mm, y, f"Factura de Transporte - {hoy}")

        y -= 12 * mm
        c.setFont("Helvetica", 10)
        c.drawString(20 * mm, y, "Pedidos incluidos:")
        y -= 6 * mm

        for a in albs:
            if y < 20 * mm:
                c.showPage()
                y = height - 20 * mm
                c.setFont("Helvetica", 10)
            c.drawString(25 * mm, y, f"- Albarán #{a.id} · Fecha {a.fecha.strftime('%d/%m/%Y')} · Total {a.total:.2f} €")
            y -= 5 * mm

        y -= 8 * mm
        c.setFont("Helvetica-Bold", 11)
        c.drawString(20 * mm, y, f"Base total: {base_total:.2f} €")
        y -= 6 * mm
        c.drawString(20 * mm, y, f"Porcentaje transportista: 7%")
        y -= 6 * mm
        c.drawString(20 * mm, y, f"Importe a pagar: {importe:.2f} €")

        c.showPage()
        c.save()
    except Exception as e:
        # si falta reportlab u otro error
        raise HTTPException(status_code=500, detail=f"No fue posible generar el PDF: {e}")

    return TransporteFacturaOut(
        ok=True,
        n_pedidos=len(albs),
        base_total=base_total,
        porcentaje=7.0,
        importe=importe,
        path=str(filename.resolve()),
    )
