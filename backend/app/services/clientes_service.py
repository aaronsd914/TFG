"""Business logic for clientes, separated from the HTTP layer."""

from sqlalchemy.orm import Session
from fastapi import HTTPException

from backend.app.entidades.cliente import ClienteCreate, ClienteDB


def upsert_cliente(payload: ClienteCreate, db: Session) -> ClienteDB:
    """Create a new cliente or update an existing one by DNI/email (upsert)."""
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


def get_cliente_or_404(cliente_id: int, db: Session) -> ClienteDB:
    cliente = db.query(ClienteDB).filter(ClienteDB.id == cliente_id).first()
    if cliente is None:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return cliente


def update_cliente(cliente_id: int, payload: ClienteCreate, db: Session) -> ClienteDB:
    cliente_db = get_cliente_or_404(cliente_id, db)
    for field, value in payload.model_dump().items():
        setattr(cliente_db, field, value)
    db.commit()
    db.refresh(cliente_db)
    return cliente_db


def delete_cliente(cliente_id: int, db: Session) -> dict:
    cliente_db = get_cliente_or_404(cliente_id, db)
    db.delete(cliente_db)
    db.commit()
    return {"message": f"Cliente con ID {cliente_id} eliminado correctamente"}
