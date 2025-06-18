from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.app.entidades.producto import Producto, ProductoCreate, ProductoDB
from backend.app.database import SessionLocal
from typing import List

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/productos/post", response_model=Producto)
def crear_producto(producto: ProductoCreate, db: Session = Depends(get_db)):
    db_producto = ProductoDB(**producto.dict())
    db.add(db_producto)
    db.commit()
    db.refresh(db_producto)
    return db_producto

@router.get("/productos/get", response_model=List[Producto])
def obtener_productos(db: Session = Depends(get_db)):
    return db.query(ProductoDB).all()

@router.get("/productos/get/{producto_id}", response_model=Producto)
def obtener_producto(producto_id: int, db: Session = Depends(get_db)):
    producto = db.query(ProductoDB).filter(ProductoDB.id == producto_id).first()
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return producto

@router.put("/productos/put/{producto_id}", response_model=Producto)
def actualizar_producto(producto_id: int, actualizado: ProductoCreate, db: Session = Depends(get_db)):
    producto = db.query(ProductoDB).filter(ProductoDB.id == producto_id).first()
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    for key, value in actualizado.dict().items():
        setattr(producto, key, value)
    db.commit()
    db.refresh(producto)
    return producto

@router.delete("/productos/delete/{producto_id}")
def eliminar_producto(producto_id: int, db: Session = Depends(get_db)):
    producto = db.query(ProductoDB).filter(ProductoDB.id == producto_id).first()
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    db.delete(producto)
    db.commit()
    return {"message": f"Producto {producto_id} eliminado"}
