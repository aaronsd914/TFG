from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.app.entidades.proveedor import Proveedor, ProveedorCreate, ProveedorDB
from backend.app.database import SessionLocal
from typing import List

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/proveedores/post", response_model=Proveedor)
def crear_proveedor(proveedor: ProveedorCreate, db: Session = Depends(get_db)):
    db_proveedor = ProveedorDB(**proveedor.dict())
    db.add(db_proveedor)
    db.commit()
    db.refresh(db_proveedor)
    return db_proveedor

@router.get("/proveedores/get", response_model=List[Proveedor])
def obtener_proveedores(db: Session = Depends(get_db)):
    return db.query(ProveedorDB).all()

@router.get("/proveedores/get/{proveedor_id}", response_model=Proveedor)
def obtener_proveedor(proveedor_id: int, db: Session = Depends(get_db)):
    proveedor = db.query(ProveedorDB).filter(ProveedorDB.id == proveedor_id).first()
    if not proveedor:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
    return proveedor

@router.put("/proveedores/put/{proveedor_id}", response_model=Proveedor)
def actualizar_proveedor(proveedor_id: int, actualizado: ProveedorCreate, db: Session = Depends(get_db)):
    proveedor = db.query(ProveedorDB).filter(ProveedorDB.id == proveedor_id).first()
    if not proveedor:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
    for key, value in actualizado.dict().items():
        setattr(proveedor, key, value)
    db.commit()
    db.refresh(proveedor)
    return proveedor

@router.delete("/proveedores/delete/{proveedor_id}")
def eliminar_proveedor(proveedor_id: int, db: Session = Depends(get_db)):
    proveedor = db.query(ProveedorDB).filter(ProveedorDB.id == proveedor_id).first()
    if not proveedor:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
    db.delete(proveedor)
    db.commit()
    return {"message": f"Proveedor {proveedor_id} eliminado"}
