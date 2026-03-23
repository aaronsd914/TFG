"""Business logic for products, separated from the HTTP layer."""

import unicodedata
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException

from backend.app.entidades.producto import ProductCreate, ProductDB


def _norm(s: str) -> str:
    s = s or ""
    nfkd = unicodedata.normalize("NFD", s)
    return "".join(ch for ch in nfkd if not unicodedata.combining(ch)).lower()


def get_product_or_404(product_id: int, db: Session) -> ProductDB:
    product = db.query(ProductDB).filter(ProductDB.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return product


def create_product(payload: ProductCreate, db: Session) -> ProductDB:
    db_product = ProductDB(**payload.model_dump())
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product


def update_product(product_id: int, payload: ProductCreate, db: Session) -> ProductDB:
    product = get_product_or_404(product_id, db)
    for key, value in payload.model_dump().items():
        setattr(product, key, value)
    db.commit()
    db.refresh(product)
    return product


def delete_product(product_id: int, db: Session) -> dict:
    product = get_product_or_404(product_id, db)
    try:
        db.delete(product)
        db.commit()
        return {"message": f"Producto {product_id} eliminado"}
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="No se puede eliminar este producto porque está referenciado en albaranes (líneas de albarán).",
        )


def search_products(q: str, limit: int, db: Session) -> list[ProductDB]:
    qn = _norm(q)
    products = db.query(ProductDB).all()
    return [p for p in products if qn in _norm(p.name)][:limit]
