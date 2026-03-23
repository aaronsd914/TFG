from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Annotated, List
from datetime import date

from backend.app.database import get_db
from backend.app.entidades.incidencia import IncidenciaDB, Incidencia, IncidenciaCreate
from backend.app.entidades.albaran import DeliveryNoteDB
from backend.app.dependencies import get_current_user

router = APIRouter(dependencies=[Depends(get_current_user)])


@router.get("/incidencias/get", response_model=List[Incidencia])
def list_incidencias(db: Annotated[Session, Depends(get_db)]):
    """Returns all incidents ordered by creation date descending."""
    return (
        db.query(IncidenciaDB)
        .order_by(IncidenciaDB.fecha_creacion.desc(), IncidenciaDB.id.desc())
        .all()
    )


@router.get(
    "/incidencias/get/{incidencia_id}",
    response_model=Incidencia,
    responses={404: {"description": "Not found"}},
)
def get_incidencia(incidencia_id: int, db: Annotated[Session, Depends(get_db)]):
    inc = db.query(IncidenciaDB).filter(IncidenciaDB.id == incidencia_id).first()
    if not inc:
        raise HTTPException(404, "Incidencia no encontrada")
    return inc


@router.post(
    "/incidencias/post",
    response_model=Incidencia,
    responses={400: {"description": "Bad request"}, 404: {"description": "Not found"}},
)
def create_incidencia(
    payload: IncidenciaCreate,
    db: Annotated[Session, Depends(get_db)],
):
    """
    Creates an incident linked to a delivery note.
    The delivery note must be in ENTREGADO status; its status is changed
    to INCIDENCIA automatically.
    """
    albaran = (
        db.query(DeliveryNoteDB).filter(DeliveryNoteDB.id == payload.albaran_id).first()
    )
    if not albaran:
        raise HTTPException(404, "Albarán no encontrado")
    if albaran.status != "ENTREGADO":
        raise HTTPException(
            400,
            "Solo se puede crear una incidencia sobre albaranes con estado ENTREGADO.",
        )

    albaran.status = "INCIDENCIA"
    inc = IncidenciaDB(
        albaran_id=payload.albaran_id,
        descripcion=payload.descripcion,
        fecha_creacion=date.today(),
    )
    db.add(inc)
    db.commit()
    db.refresh(inc)
    return inc


@router.delete(
    "/incidencias/{incidencia_id}",
    responses={404: {"description": "Not found"}},
)
def delete_incidencia(
    incidencia_id: int,
    db: Annotated[Session, Depends(get_db)],
):
    """
    Deletes an incident and resets the linked delivery note status
    back to ENTREGADO.
    """
    inc = db.query(IncidenciaDB).filter(IncidenciaDB.id == incidencia_id).first()
    if not inc:
        raise HTTPException(404, "Incidencia no encontrada")

    albaran = (
        db.query(DeliveryNoteDB).filter(DeliveryNoteDB.id == inc.albaran_id).first()
    )
    if albaran:
        albaran.status = "ENTREGADO"

    db.delete(inc)
    db.commit()
    return {"ok": True}
