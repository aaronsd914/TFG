from sqlalchemy import Column, Integer, String, Float, Date
from backend.app.database import Base
from pydantic import BaseModel
from datetime import date
from typing import Literal

MovementType = Literal["INGRESO", "EGRESO"]


class MovementDB(Base):
    __tablename__ = "movimientos"

    id = Column(Integer, primary_key=True, index=True)
    date = Column('fecha', Date, nullable=False)
    description = Column('concepto', String)
    amount = Column('cantidad', Float)
    type = Column('tipo', String, nullable=False, default="INGRESO")


class Movement(BaseModel):
    id: int
    date: date
    description: str
    amount: float
    type: MovementType

    class Config:
        from_attributes = True


class MovementCreate(BaseModel):
    date: date
    description: str
    amount: float
    type: MovementType = "INGRESO"
