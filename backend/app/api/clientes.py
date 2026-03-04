from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from backend.app.entidades.cliente import Cliente, ClienteCreate, ClienteDB
from backend.app.database import get_db

router = APIRouter()

@router.post("/clientes/post", response_model=Cliente)
def crear_cliente(payload: ClienteCreate, db: Session = Depends(get_db)):
    """
    Crea un cliente nuevo. Si ya existe uno con el mismo DNI o email,
    actualiza sus datos en lugar de crear un duplicado (upsert).
    """
    existing = None
    if payload.dni:
        existing = db.query(ClienteDB).filter(ClienteDB.dni == payload.dni).first()
    if not existing and payload.email:
        existing = db.query(ClienteDB).filter(ClienteDB.email == payload.email).first()

    if existing:
        for field, value in payload.model_dump().items():
            if value is not None:
                setattr(existing, field, value)
        db.commit()
        db.refresh(existing)
        return existing

    nuevo = ClienteDB(**payload.model_dump())
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
    """Sobreescribe todos los campos del cliente con los datos recibidos."""
    cliente_db = db.query(ClienteDB).filter(ClienteDB.id == cliente_id).first()
    if cliente_db is None:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    for field, value in payload.model_dump().items():
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
