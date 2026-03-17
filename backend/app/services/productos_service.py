"""Business logic for productos, separated from the HTTP layer."""

import unicodedata
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException

from backend.app.entidades.producto import ProductoCreate, ProductoDB


def _norm(s: str) -> str:
    s = s or ""
    nfkd = unicodedata.normalize("NFD", s)
    return "".join(ch for ch in nfkd if not unicodedata.combining(ch)).lower()


def get_producto_or_404(producto_id: int, db: Session) -> ProductoDB:
    producto = db.query(ProductoDB).filter(ProductoDB.id == producto_id).first()
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return producto


def create_producto(payload: ProductoCreate, db: Session) -> ProductoDB:
    db_producto = ProductoDB(**payload.model_dump())
    db.add(db_producto)
    db.commit()
    db.refresh(db_producto)
    return db_producto


def update_producto(
    producto_id: int, payload: ProductoCreate, db: Session
) -> ProductoDB:
    producto = get_producto_or_404(producto_id, db)
    for key, value in payload.model_dump().items():
        setattr(producto, key, value)
    db.commit()
    db.refresh(producto)
    return producto


def delete_producto(producto_id: int, db: Session) -> dict:
    producto = get_producto_or_404(producto_id, db)
    try:
        db.delete(producto)
        db.commit()
        return {"message": f"Producto {producto_id} eliminado"}
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="No se puede eliminar este producto porque está referenciado en albaranes (líneas de albarán).",
        )


def search_productos(q: str, limit: int, db: Session) -> list[ProductoDB]:
    qn = _norm(q)
    productos = db.query(ProductoDB).all()
    return [p for p in productos if qn in _norm(p.nombre)][:limit]
