from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from sqlalchemy.orm import Session, selectinload
from backend.app.database import SessionLocal
from backend.app.entidades.albaran import Albaran, AlbaranCreate, AlbaranDB, AlbaranLineaCreate

from backend.app.entidades.linea_albaran import LineaAlbaranDB
from backend.app.entidades.cliente import ClienteDB, ClienteCreate
from backend.app.entidades.producto import ProductoDB

from backend.app.utils.emailer import send_email_with_pdf
from backend.app.utils.albaran_pdf import generar_pdf_albaran
from backend.app.utils.templates import render

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Variante de payload que permite cliente_id o cliente nuevo
from pydantic import BaseModel
from datetime import date

class AlbaranCreateFull(BaseModel):
    fecha: date
    descripcion: Optional[str] = None
    cliente_id: Optional[int] = None
    cliente: Optional[ClienteCreate] = None
    items: List[AlbaranLineaCreate]

class AlbaranCreateFull(BaseModel):
    fecha: date
    descripcion: Optional[str] = None
    cliente_id: Optional[int] = None
    cliente: Optional[ClienteCreate] = None  # <— ahora usa el extendido
    items: List[AlbaranLineaCreate]

def _send_albaran_email_task(albaran_id: int):
    # NUEVA SESIÓN (no reutilizar la del request)
    db = SessionLocal()
    try:
        albaran = db.query(AlbaranDB).filter(AlbaranDB.id == albaran_id).first()
        if not albaran:
            return
        cliente = db.query(ClienteDB).filter(ClienteDB.id == albaran.cliente_id).first()
        if not cliente or not cliente.email:
            return

        # lineas + nombres de producto
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
            lineas_ext.append({
                "producto_nombre": prods.get(ln.producto_id).nombre if prods.get(ln.producto_id) else f"Producto {ln.producto_id}",
                "cantidad": ln.cantidad,
                "precio_unitario": ln.precio_unitario,
                "p_unit_eur": f"{ln.precio_unitario:.2f} €",
                "subtotal": subtotal,
                "subtotal_eur": f"{subtotal:.2f} €",
            })

        # HTML del correo
        html = render(
            "albaran_email.html",
            albaran=albaran,
            cliente=cliente,
            lineas=lineas_ext,
            fecha_humana=albaran.fecha.strftime("%d/%m/%Y"),
            total_eur=f"{(albaran.total or total):.2f} €"
        )

        # PDF
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
    finally:
        db.close()

@router.post("/albaranes/post", response_model=Albaran)
def crear_albaran(payload: AlbaranCreateFull, db: Session = Depends(get_db)):
    # 1) Cliente
    if payload.cliente_id:
        cliente = db.query(ClienteDB).filter(ClienteDB.id == payload.cliente_id).first()
        if not cliente:
            raise HTTPException(404, "Cliente no encontrado")
        cliente_id = cliente.id
    elif payload.cliente:
        # Reutilizar si existe por DNI (preferente) o email
        c = None
        if payload.cliente.dni:
            c = db.query(ClienteDB).filter(ClienteDB.dni == payload.cliente.dni).first()
        if not c and payload.cliente.email:
            c = db.query(ClienteDB).filter(ClienteDB.email == payload.cliente.email).first()

        if c:
            # upsert suave: completa campos vacíos y actualiza los que nos mandan
            for k, v in payload.cliente.dict().items():
                if v is not None:
                    setattr(c, k, v)
            cliente_id = c.id
        else:
            c = ClienteDB(**payload.cliente.dict())
            db.add(c)
            db.flush()
            cliente_id = c.id
    else:
        raise HTTPException(400, "Debes indicar cliente_id o datos de cliente")

    # 2) Crear albarán (igual que ya tenías)
    albaran = AlbaranDB(
        fecha=payload.fecha,
        descripcion=payload.descripcion or "",
        cliente_id=cliente_id,
        total=0.0
    )
    db.add(albaran)
    db.flush()

    # 3) Añadir líneas y calcular total (igual)
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
        .options(selectinload(AlbaranDB.lineas))  # carga las líneas
        .filter(AlbaranDB.cliente_id == cliente_id)
        .order_by(AlbaranDB.fecha.desc(), AlbaranDB.id.desc())
    )
    return q.all()

