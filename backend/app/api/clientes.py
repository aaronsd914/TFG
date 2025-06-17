from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.app.entidades.cliente import Cliente, ClienteCreate, ClienteDB
from backend.app.database import SessionLocal
from typing import List

router = APIRouter()

# Dependencia para obtener la sesión de la BBDD
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/clientes", response_model=Cliente)
def crear_cliente(cliente: ClienteCreate, db: Session = Depends(get_db)):
    db_cliente = ClienteDB(nombre=cliente.nombre, email=cliente.email)
    db.add(db_cliente)
    db.commit()
    db.refresh(db_cliente)
    return db_cliente

@router.get("/clientes", response_model=List[Cliente])
def obtener_clientes(db: Session = Depends(get_db)):
    return db.query(ClienteDB).all()

@router.get("/clientes/{cliente_id}", response_model=Cliente)
def obtener_cliente(cliente_id: int, db: Session = Depends(get_db)):
    cliente = db.query(ClienteDB).filter(ClienteDB.id == cliente_id).first()
    if cliente is None:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return cliente

@router.put("/clientes/{cliente_id}", response_model=Cliente)
def actualizar_cliente(cliente_id: int, cliente_actualizado: ClienteCreate, db: Session = Depends(get_db)):
    cliente_db = db.query(ClienteDB).filter(ClienteDB.id == cliente_id).first()
    if cliente_db is None:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    cliente_db.nombre = cliente_actualizado.nombre
    cliente_db.email = cliente_actualizado.email
    db.commit()
    db.refresh(cliente_db)
    return cliente_db

@router.delete("/clientes/{cliente_id}")
def eliminar_cliente(cliente_id: int, db: Session = Depends(get_db)):
    cliente_db = db.query(ClienteDB).filter(ClienteDB.id == cliente_id).first()
    if cliente_db is None:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    db.delete(cliente_db)
    db.commit()
    return {"message": f"Cliente con ID {cliente_id} eliminado correctamente"}
