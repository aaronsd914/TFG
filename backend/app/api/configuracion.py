from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Annotated, Any

from backend.app.database import get_db
from backend.app.entidades.configuracion import ConfigDB, ConfigItem
from backend.app.dependencies import get_current_user

router = APIRouter(
    prefix="/config",
    tags=["config"],
    dependencies=[Depends(get_current_user)],
)

DEFAULTS: dict[str, str] = {
    "tienda_nombre": "FurniGest",
    "logo_empresa": "",
    "firma_email": "",
    "resumen_email_destino": "",
    "resumen_intervalo_dias": "7",
    "resumen_fecha_inicio": "",
    "resumen_hora_envio": "09:00",
    "resumen_ultima_vez": "",
}


def get_value(db: Session, key: str) -> str:
    row = db.query(ConfigDB).filter(ConfigDB.key == key).first()
    return row.value if row and row.value else DEFAULTS.get(key, "")


def set_value(db: Session, key: str, value: str) -> None:
    row = db.query(ConfigDB).filter(ConfigDB.key == key).first()
    if row:
        row.value = value
    else:
        db.add(ConfigDB(key=key, value=value))
    db.commit()


@router.get("")
def read_config(db: Annotated[Session, Depends(get_db)]) -> dict[str, Any]:
    rows = db.query(ConfigDB).all()
    result = dict(DEFAULTS)
    for r in rows:
        result[r.key] = r.value or ""
    return result


@router.put(
    "/{key}",
    response_model=ConfigItem,
    responses={400: {"description": "Clave desconocida"}},
)
def write_config(key: str, item: ConfigItem, db: Annotated[Session, Depends(get_db)]):
    if key not in DEFAULTS:
        raise HTTPException(status_code=400, detail=f"Clave desconocida: {key}")
    set_value(db, key, item.value or "")
    return ConfigItem(key=key, value=item.value or "")
