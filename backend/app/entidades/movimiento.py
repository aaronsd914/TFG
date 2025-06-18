from sqlalchemy import Column, Integer, String, Float, Date
from backend.app.database import Base
from pydantic import BaseModel
from datetime import date

class MovimientoDB(Base):
    __tablename__ = "movimientos"

    id = Column(Integer, primary_key=True, index=True)
    fecha = Column(Date, nullable=False)
    concepto = Column(String)
    cantidad = Column(Float)

class Movimiento(BaseModel):
    id: int
    fecha: date
    concepto: str
    cantidad: float

    class Config:
        from_attributes = True

class MovimientoCreate(BaseModel):
    fecha: date
    concepto: str
    cantidad: float
