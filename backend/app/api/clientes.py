from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from backend.app.entidades.cliente import Cliente, ClienteCreate, ClienteDB
from backend.app.database import SessionLocal

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/clientes/post", response_model=Cliente)
def crear_cliente(payload: ClienteCreate, db: Session = Depends(get_db)):
    # si viene DNI o email, intenta evitar duplicados
    existing = None
    if payload.dni:
        existing = db.query(ClienteDB).filter(ClienteDB.dni == payload.dni).first()
    if not existing and payload.email:
        existing = db.query(ClienteDB).filter(ClienteDB.email == payload.email).first()

    if existing:
        # actualiza datos que vengan (upsert ligero)
        for field, value in payload.dict().items():
            if value is not None:
                setattr(existing, field, value)
        db.commit()
        db.refresh(existing)
        return existing

    nuevo = ClienteDB(**payload.dict())
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo

@router.get("/clientes/get", response_model=List[Cliente])
def obtener_clientes(db: Session = Depends(get_db)):
    return db.query(ClienteDB).all()

@router.get("/clientes/get/{cliente_id}", response_model=Cliente)
def obtener_cliente(cliente_id: int, db: Session = Depends(get_db)):
    cliente = db.query(ClienteDB).filter(ClienteDB.id == cliente_id).first()
    if cliente is None:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return cliente

@router.put("/clientes/put/{cliente_id}", response_model=Cliente)
def actualizar_cliente(cliente_id: int, payload: ClienteCreate, db: Session = Depends(get_db)):
    cliente_db = db.query(ClienteDB).filter(ClienteDB.id == cliente_id).first()
    if cliente_db is None:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    for field, value in payload.dict().items():
        setattr(cliente_db, field, value)
    db.commit()
    db.refresh(cliente_db)
    return cliente_db

@router.delete("/clientes/delete/{cliente_id}")
def eliminar_cliente(cliente_id: int, db: Session = Depends(get_db)):
    cliente_db = db.query(ClienteDB).filter(ClienteDB.id == cliente_id).first()
    if cliente_db is None:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    db.delete(cliente_db)
    db.commit()
    return {"message": f"Cliente con ID {cliente_id} eliminado correctamente"}
