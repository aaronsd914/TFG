"""Business logic for movimientos, separated from the HTTP layer."""

from sqlalchemy.orm import Session
from fastapi import HTTPException

from backend.app.entidades.movimiento import MovimientoCreate, MovimientoDB


def get_movimiento_or_404(movimiento_id: int, db: Session) -> MovimientoDB:
    movimiento = db.query(MovimientoDB).filter(MovimientoDB.id == movimiento_id).first()
    if not movimiento:
        raise HTTPException(status_code=404, detail="Movimiento no encontrado")
    return movimiento


def create_movimiento(payload: MovimientoCreate, db: Session) -> MovimientoDB:
    nuevo = MovimientoDB(**payload.model_dump())
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo


def get_all_movimientos(db: Session) -> list[MovimientoDB]:
    return (
        db.query(MovimientoDB)
        .order_by(MovimientoDB.fecha.desc(), MovimientoDB.id.desc())
        .all()
    )


def update_movimiento(
    movimiento_id: int, payload: MovimientoCreate, db: Session
) -> MovimientoDB:
    movimiento = get_movimiento_or_404(movimiento_id, db)
    for key, value in payload.model_dump().items():
        setattr(movimiento, key, value)
    db.commit()
    db.refresh(movimiento)
    return movimiento


def delete_movimiento(movimiento_id: int, db: Session) -> dict:
    movimiento = get_movimiento_or_404(movimiento_id, db)
    db.delete(movimiento)
    db.commit()
    return {"message": f"Movimiento {movimiento_id} eliminado correctamente"}
