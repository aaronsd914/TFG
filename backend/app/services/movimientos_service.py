"""Business logic for movements, separated from the HTTP layer."""

from sqlalchemy.orm import Session
from fastapi import HTTPException

from backend.app.entidades.movimiento import MovementCreate, MovementDB


def get_movement_or_404(movement_id: int, db: Session) -> MovementDB:
    movement = db.query(MovementDB).filter(MovementDB.id == movement_id).first()
    if not movement:
        raise HTTPException(status_code=404, detail="Movimiento no encontrado")
    return movement


def create_movement(payload: MovementCreate, db: Session) -> MovementDB:
    new_record = MovementDB(**payload.model_dump())
    db.add(new_record)
    db.commit()
    db.refresh(new_record)
    return new_record


def get_all_movements(db: Session) -> list[MovementDB]:
    return (
        db.query(MovementDB)
        .order_by(MovementDB.date.desc(), MovementDB.id.desc())
        .all()
    )


def update_movement(
    movement_id: int, payload: MovementCreate, db: Session
) -> MovementDB:
    movement = get_movement_or_404(movement_id, db)
    for key, value in payload.model_dump().items():
        setattr(movement, key, value)
    db.commit()
    db.refresh(movement)
    return movement


def delete_movement(movement_id: int, db: Session) -> dict:
    movement = get_movement_or_404(movement_id, db)
    db.delete(movement)
    db.commit()
    return {"message": f"Movimiento {movement_id} eliminado correctamente"}
