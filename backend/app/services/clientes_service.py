"""Business logic for customers, separated from the HTTP layer."""

from sqlalchemy.orm import Session
from fastapi import HTTPException

from backend.app.entidades.cliente import CustomerCreate, CustomerDB


def upsert_customer(payload: CustomerCreate, db: Session) -> CustomerDB:
    """Create a new customer or update an existing one by DNI/email (upsert)."""
    existing = None
    if payload.dni:
        existing = db.query(CustomerDB).filter(CustomerDB.dni == payload.dni).first()
    if not existing and payload.email:
        existing = db.query(CustomerDB).filter(CustomerDB.email == payload.email).first()

    if existing:
        for field, value in payload.model_dump().items():
            if value is not None:
                setattr(existing, field, value)
        db.commit()
        db.refresh(existing)
        return existing

    new_record = CustomerDB(**payload.model_dump())
    db.add(new_record)
    db.commit()
    db.refresh(new_record)
    return new_record


def get_customer_or_404(customer_id: int, db: Session) -> CustomerDB:
    customer = db.query(CustomerDB).filter(CustomerDB.id == customer_id).first()
    if customer is None:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return customer


def update_customer(customer_id: int, payload: CustomerCreate, db: Session) -> CustomerDB:
    db_customer = get_customer_or_404(customer_id, db)
    for field, value in payload.model_dump().items():
        setattr(db_customer, field, value)
    db.commit()
    db.refresh(db_customer)
    return db_customer


def delete_customer(customer_id: int, db: Session) -> dict:
    db_customer = get_customer_or_404(customer_id, db)
    db.delete(db_customer)
    db.commit()
    return {"message": f"Cliente con ID {customer_id} eliminado correctamente"}
