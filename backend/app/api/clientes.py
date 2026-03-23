from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Annotated, List
from backend.app.entidades.cliente import Customer, CustomerCreate, CustomerDB
from backend.app.database import get_db
from backend.app.dependencies import get_current_user
from backend.app.services import clientes_service

router = APIRouter(dependencies=[Depends(get_current_user)])


@router.post("/clientes/post", response_model=Customer)
def create_customer(payload: CustomerCreate, db: Annotated[Session, Depends(get_db)]):
    return clientes_service.upsert_customer(payload, db)


@router.get("/clientes/get", response_model=List[Customer])
def list_customers(db: Annotated[Session, Depends(get_db)]):
    return db.query(CustomerDB).all()


@router.get("/clientes/get/{customer_id}", response_model=Customer)
def get_customer(customer_id: int, db: Annotated[Session, Depends(get_db)]):
    return clientes_service.get_customer_or_404(customer_id, db)


@router.put("/clientes/put/{customer_id}", response_model=Customer)
def update_customer(
    customer_id: int, payload: CustomerCreate, db: Annotated[Session, Depends(get_db)]
):
    return clientes_service.update_customer(customer_id, payload, db)


@router.delete("/clientes/delete/{customer_id}")
def delete_customer(customer_id: int, db: Annotated[Session, Depends(get_db)]):
    return clientes_service.delete_customer(customer_id, db)
