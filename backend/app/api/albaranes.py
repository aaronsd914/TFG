from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from backend.app.entidades.presupuesto import Presupuesto, PresupuestoCreate, PresupuestoDB
from backend.app.database import SessionLocal

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/presupuestos/post", response_model=Presupuesto)
def crear_presupuesto(presupuesto: PresupuestoCreate, db: Session = Depends(get_db)):
    nuevo = PresupuestoDB(**presupuesto.dict())
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo

@router.get("/presupuestos/get", response_model=List[Presupuesto])
def obtener_presupuestos(db: Session = Depends(get_db)):
    return db.query(PresupuestoDB).all()

@router.get("/presupuestos/get/{presupuesto_id}", response_model=Presupuesto)
def obtener_presupuesto(presupuesto_id: int, db: Session = Depends(get_db)):
    presupuesto = db.query(PresupuestoDB).filter(PresupuestoDB.id == presupuesto_id).first()
    if not presupuesto:
        raise HTTPException(status_code=404, detail="Presupuesto no encontrado")
    return presupuesto

@router.put("/presupuestos/put/{presupuesto_id}", response_model=Presupuesto)
def actualizar_presupuesto(presupuesto_id: int, actualizado: PresupuestoCreate, db: Session = Depends(get_db)):
    presupuesto = db.query(PresupuestoDB).filter(PresupuestoDB.id == presupuesto_id).first()
    if not presupuesto:
        raise HTTPException(status_code=404, detail="Presupuesto no encontrado")
    for key, value in actualizado.dict().items():
        setattr(presupuesto, key, value)
    db.commit()
    db.refresh(presupuesto)
    return presupuesto

@router.delete("/presupuestos/delete/{presupuesto_id}")
def eliminar_presupuesto(presupuesto_id: int, db: Session = Depends(get_db)):
    presupuesto = db.query(PresupuestoDB).filter(PresupuestoDB.id == presupuesto_id).first()
    if not presupuesto:
        raise HTTPException(status_code=404, detail="Presupuesto no encontrado")
    db.delete(presupuesto)
    db.commit()
    return {"message": f"Presupuesto {presupuesto_id} eliminado correctamente"}
