from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from backend.app.entidades.producto import Product, ProductCreate, ProductDB
from backend.app.database import get_db
from backend.app.dependencies import get_current_user
from backend.app.services import productos_service
from typing import Annotated, List

router = APIRouter(dependencies=[Depends(get_current_user)])


@router.post("/productos/post", response_model=Product)
def create_product(payload: ProductCreate, db: Annotated[Session, Depends(get_db)]):
    return productos_service.create_product(payload, db)


@router.get("/productos/get", response_model=List[Product])
def list_products(db: Annotated[Session, Depends(get_db)]):
    return db.query(ProductDB).all()


@router.get("/productos/get/{product_id}", response_model=Product)
def get_product(product_id: int, db: Annotated[Session, Depends(get_db)]):
    return productos_service.get_product_or_404(product_id, db)


@router.put("/productos/put/{product_id}", response_model=Product)
def update_product(
    product_id: int, payload: ProductCreate, db: Annotated[Session, Depends(get_db)]
):
    return productos_service.update_product(product_id, payload, db)


@router.delete("/productos/delete/{product_id}")
def delete_product(product_id: int, db: Annotated[Session, Depends(get_db)]):
    return productos_service.delete_product(product_id, db)


@router.get("/productos/search", response_model=List[Product])
def search_products(
    db: Annotated[Session, Depends(get_db)],
    q: str = Query(..., min_length=1),
    limit: int = 20,
):
    return productos_service.search_products(q, limit, db)
