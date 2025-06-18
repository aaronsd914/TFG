from sqlalchemy import Column, Integer, String, Float, ForeignKey, Date
from sqlalchemy.orm import relationship
from backend.app.database import Base
from pydantic import BaseModel
from datetime import date

class PresupuestoDB(Base):
    __tablename__ = "presupuestos"

    id = Column(Integer, primary_key=True, index=True)
    fecha = Column(Date, nullable=False)
    descripcion = Column(String)
    total = Column(Float)

    cliente_id = Column(Integer, ForeignKey("clientes.id"))
    cliente = relationship("ClienteDB", back_populates="presupuestos")

class Presupuesto(BaseModel):
    id: int
    fecha: date
    descripcion: str
    total: float
    cliente_id: int

    class Config:
        from_attributes = True

class PresupuestoCreate(BaseModel):
    fecha: date
    descripcion: str
    total: float
    cliente_id: int
