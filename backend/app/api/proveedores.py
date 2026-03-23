from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.app.entidades.proveedor import Supplier, SupplierCreate, SupplierDB
from backend.app.database import get_db
from backend.app.dependencies import get_current_user
from typing import Annotated, List

router = APIRouter(dependencies=[Depends(get_current_user)])


@router.post("/proveedores/post", response_model=Supplier)
def create_supplier(payload: SupplierCreate, db: Annotated[Session, Depends(get_db)]):
    db_supplier = SupplierDB(**payload.model_dump())
    db.add(db_supplier)
    db.commit()
    db.refresh(db_supplier)
    return db_supplier


@router.get("/proveedores/get", response_model=List[Supplier])
def list_suppliers(db: Annotated[Session, Depends(get_db)]):
    return db.query(SupplierDB).all()


@router.get(
    "/proveedores/get/{supplier_id}",
    response_model=Supplier,
    responses={404: {"description": "Not found"}},
)
def get_supplier(supplier_id: int, db: Annotated[Session, Depends(get_db)]):
    supplier = db.query(SupplierDB).filter(SupplierDB.id == supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
    return supplier


@router.put(
    "/proveedores/put/{supplier_id}",
    response_model=Supplier,
    responses={404: {"description": "Not found"}},
)
def update_supplier(
    supplier_id: int, payload: SupplierCreate, db: Annotated[Session, Depends(get_db)]
):
    supplier = db.query(SupplierDB).filter(SupplierDB.id == supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
    for key, value in payload.model_dump().items():
        setattr(supplier, key, value)
    db.commit()
    db.refresh(supplier)
    return supplier


@router.delete(
    "/proveedores/delete/{supplier_id}",
    responses={404: {"description": "Not found"}},
)
def delete_supplier(supplier_id: int, db: Annotated[Session, Depends(get_db)]):
    supplier = db.query(SupplierDB).filter(SupplierDB.id == supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
    db.delete(supplier)
    db.commit()
    return {"message": f"Proveedor {supplier_id} eliminado"}
