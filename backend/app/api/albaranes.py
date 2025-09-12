from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from backend.app.database import SessionLocal
from backend.app.entidades.albaran import (
    Albaran, AlbaranCreate, AlbaranDB, AlbaranLineaCreate
)
from backend.app.entidades.linea_albaran import LineaAlbaranDB
from backend.app.entidades.cliente import ClienteDB, ClienteCreate
from backend.app.entidades.producto import ProductoDB

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

# POST: crear albarán completo
@router.post("/albaranes/post", response_model=Albaran)
def crear_albaran(payload: AlbaranCreateFull, db: Session = Depends(get_db)):
    # 1) Cliente
    if payload.cliente_id:
        cliente = db.query(ClienteDB).filter(ClienteDB.id == payload.cliente_id).first()
        if not cliente:
            raise HTTPException(404, "Cliente no encontrado")
        cliente_id = cliente.id
    elif payload.cliente:
        nuevo = ClienteDB(nombre=payload.cliente.nombre, email=payload.cliente.email)
        db.add(nuevo)
        db.flush()  # obtenemos id sin hacer commit todavía
        cliente_id = nuevo.id
    else:
        raise HTTPException(400, "Debes indicar cliente_id o datos de cliente")

    # 2) Crear albarán
    albaran = AlbaranDB(
        fecha=payload.fecha,
        descripcion=payload.descripcion or "",
        cliente_id=cliente_id,
        total=0.0
    )
    db.add(albaran)
    db.flush()

    # 3) Añadir líneas y calcular total
    total = 0.0
    for it in payload.items:
        # Precio por defecto: precio del producto
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
