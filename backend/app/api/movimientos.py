from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from backend.app.entidades.movimiento import Movimiento, MovimientoCreate
from backend.app.database import get_db
from backend.app.services import movimientos_service

router = APIRouter()


@router.post("/movimientos/post", response_model=Movimiento)
def crear_movimiento(movimiento: MovimientoCreate, db: Session = Depends(get_db)):
    return movimientos_service.create_movimiento(movimiento, db)


@router.get("/movimientos/get", response_model=List[Movimiento])
def obtener_movimientos(db: Session = Depends(get_db)):
    return movimientos_service.get_all_movimientos(db)


@router.get("/movimientos/get/{movimiento_id}", response_model=Movimiento)
def obtener_movimiento(movimiento_id: int, db: Session = Depends(get_db)):
    return movimientos_service.get_movimiento_or_404(movimiento_id, db)


@router.put("/movimientos/put/{movimiento_id}", response_model=Movimiento)
def actualizar_movimiento(
    movimiento_id: int, actualizado: MovimientoCreate, db: Session = Depends(get_db)
):
    return movimientos_service.update_movimiento(movimiento_id, actualizado, db)


@router.delete("/movimientos/delete/{movimiento_id}")
def eliminar_movimiento(movimiento_id: int, db: Session = Depends(get_db)):
    return movimientos_service.delete_movimiento(movimiento_id, db)
