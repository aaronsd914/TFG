from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from backend.app.entidades.movimiento import Movement, MovementCreate
from backend.app.database import get_db
from backend.app.dependencies import get_current_user
from backend.app.services import movimientos_service

router = APIRouter(dependencies=[Depends(get_current_user)])


@router.post("/movimientos/post", response_model=Movement)
def create_movement(payload: MovementCreate, db: Session = Depends(get_db)):
    return movimientos_service.create_movement(payload, db)


@router.get("/movimientos/get", response_model=List[Movement])
def list_movements(db: Session = Depends(get_db)):
    return movimientos_service.get_all_movements(db)


@router.get("/movimientos/get/{movement_id}", response_model=Movement)
def get_movement(movement_id: int, db: Session = Depends(get_db)):
    return movimientos_service.get_movement_or_404(movement_id, db)


@router.put("/movimientos/put/{movement_id}", response_model=Movement)
def update_movement(
    movement_id: int, payload: MovementCreate, db: Session = Depends(get_db)
):
    return movimientos_service.update_movement(movement_id, payload, db)


@router.delete("/movimientos/delete/{movement_id}")
def delete_movement(movement_id: int, db: Session = Depends(get_db)):
    return movimientos_service.delete_movement(movement_id, db)
