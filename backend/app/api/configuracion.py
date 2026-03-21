from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Any

from backend.app.database import get_db
from backend.app.entidades.configuracion import ConfiguracionDB, ConfiguracionItem
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
    "resumen_ultima_vez": "",
}


def get_value(db: Session, key: str) -> str:
    row = db.query(ConfiguracionDB).filter(ConfiguracionDB.key == key).first()
    return row.value if row and row.value else DEFAULTS.get(key, "")


def set_value(db: Session, key: str, value: str) -> None:
    row = db.query(ConfiguracionDB).filter(ConfiguracionDB.key == key).first()
    if row:
        row.value = value
    else:
        db.add(ConfiguracionDB(key=key, value=value))
    db.commit()


@router.get("")
def read_config(db: Session = Depends(get_db)) -> dict[str, Any]:
    rows = db.query(ConfiguracionDB).all()
    result = dict(DEFAULTS)
    for r in rows:
        result[r.key] = r.value or ""
    return result


@router.put("/{key}", response_model=ConfiguracionItem)
def write_config(key: str, item: ConfiguracionItem, db: Session = Depends(get_db)):
    if key not in DEFAULTS:
        raise HTTPException(status_code=400, detail=f"Clave desconocida: {key}")
    set_value(db, key, item.value or "")
    return ConfiguracionItem(key=key, value=item.value or "")
