from sqlalchemy import Column, Integer, String, Float, Date
from backend.app.database import Base
from pydantic import BaseModel
from datetime import date
from typing import Literal

# Etiquetas de 1 palabra para UI:
# INGRESO -> "Ingreso"
# EGRESO  -> "Egreso"
OneWordTipo = Literal["INGRESO", "EGRESO"]

class MovimientoDB(Base):
    __tablename__ = "movimientos"

    id = Column(Integer, primary_key=True, index=True)
    fecha = Column(Date, nullable=False)
    concepto = Column(String)
    cantidad = Column(Float)
    tipo = Column(String, nullable=False, default="INGRESO")

class Movimiento(BaseModel):
    id: int
    fecha: date
    concepto: str
    cantidad: float
    tipo: OneWordTipo

    class Config:
        from_attributes = True

class MovimientoCreate(BaseModel):
    fecha: date
    concepto: str
    cantidad: float
    tipo: OneWordTipo = "INGRESO"
