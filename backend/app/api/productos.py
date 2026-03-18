from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from backend.app.entidades.producto import Producto, ProductoCreate, ProductoDB
from backend.app.database import get_db
from backend.app.dependencies import get_current_user
from backend.app.services import productos_service
from typing import List

router = APIRouter(dependencies=[Depends(get_current_user)])


@router.post("/productos/post", response_model=Producto)
def crear_producto(producto: ProductoCreate, db: Session = Depends(get_db)):
    return productos_service.create_producto(producto, db)


@router.get("/productos/get", response_model=List[Producto])
def obtener_productos(db: Session = Depends(get_db)):
    return db.query(ProductoDB).all()


@router.get("/productos/get/{producto_id}", response_model=Producto)
def obtener_producto(producto_id: int, db: Session = Depends(get_db)):
    return productos_service.get_producto_or_404(producto_id, db)


@router.put("/productos/put/{producto_id}", response_model=Producto)
def actualizar_producto(
    producto_id: int, actualizado: ProductoCreate, db: Session = Depends(get_db)
):
    return productos_service.update_producto(producto_id, actualizado, db)


@router.delete("/productos/delete/{producto_id}")
def eliminar_producto(producto_id: int, db: Session = Depends(get_db)):
    return productos_service.delete_producto(producto_id, db)


@router.get("/productos/search", response_model=List[Producto])
def buscar_productos(
    q: str = Query(..., min_length=1),
    limit: int = 20,
    db: Session = Depends(get_db),
):
    return productos_service.search_productos(q, limit, db)
