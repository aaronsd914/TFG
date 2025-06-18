from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from backend.app.entidades.movimiento import Movimiento, MovimientoCreate, MovimientoDB
from backend.app.database import SessionLocal

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/movimientos/post", response_model=Movimiento)
def crear_movimiento(movimiento: MovimientoCreate, db: Session = Depends(get_db)):
    nuevo = MovimientoDB(**movimiento.dict())
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo

@router.get("/movimientos/get", response_model=List[Movimiento])
def obtener_movimientos(db: Session = Depends(get_db)):
    return db.query(MovimientoDB).all()

@router.get("/movimientos/get/{movimiento_id}", response_model=Movimiento)
def obtener_movimiento(movimiento_id: int, db: Session = Depends(get_db)):
    movimiento = db.query(MovimientoDB).filter(MovimientoDB.id == movimiento_id).first()
    if not movimiento:
        raise HTTPException(status_code=404, detail="Movimiento no encontrado")
    return movimiento

@router.put("/movimientos/put/{movimiento_id}", response_model=Movimiento)
def actualizar_movimiento(movimiento_id: int, actualizado: MovimientoCreate, db: Session = Depends(get_db)):
    movimiento = db.query(MovimientoDB).filter(MovimientoDB.id == movimiento_id).first()
    if not movimiento:
        raise HTTPException(status_code=404, detail="Movimiento no encontrado")
    for key, value in actualizado.dict().items():
        setattr(movimiento, key, value)
    db.commit()
    db.refresh(movimiento)
    return movimiento

@router.delete("/movimientos/delete/{movimiento_id}")
def eliminar_movimiento(movimiento_id: int, db: Session = Depends(get_db)):
    movimiento = db.query(MovimientoDB).filter(MovimientoDB.id == movimiento_id).first()
    if not movimiento:
        raise HTTPException(status_code=404, detail="Movimiento no encontrado")
    db.delete(movimiento)
    db.commit()
    return {"message": f"Movimiento {movimiento_id} eliminado correctamente"}
