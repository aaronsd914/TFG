from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from backend.app.entidades.cliente import Cliente, ClienteCreate, ClienteDB
from backend.app.database import get_db
from backend.app.services import clientes_service

router = APIRouter()


@router.post("/clientes/post", response_model=Cliente)
def crear_cliente(payload: ClienteCreate, db: Session = Depends(get_db)):
    return clientes_service.upsert_cliente(payload, db)


@router.get("/clientes/get", response_model=List[Cliente])
def obtener_clientes(db: Session = Depends(get_db)):
    return db.query(ClienteDB).all()


@router.get("/clientes/get/{cliente_id}", response_model=Cliente)
def obtener_cliente(cliente_id: int, db: Session = Depends(get_db)):
    return clientes_service.get_cliente_or_404(cliente_id, db)


@router.put("/clientes/put/{cliente_id}", response_model=Cliente)
def actualizar_cliente(
    cliente_id: int, payload: ClienteCreate, db: Session = Depends(get_db)
):
    return clientes_service.update_cliente(cliente_id, payload, db)


@router.delete("/clientes/delete/{cliente_id}")
def eliminar_cliente(cliente_id: int, db: Session = Depends(get_db)):
    return clientes_service.delete_cliente(cliente_id, db)
