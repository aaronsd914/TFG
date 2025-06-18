from sqlalchemy import Column, Integer, String, Float, ForeignKey, Date
from sqlalchemy.orm import relationship
from backend.app.database import Base
from pydantic import BaseModel
from datetime import date

# SQLAlchemy model
class AlbaranDB(Base):
    __tablename__ = "albaranes"

    id = Column(Integer, primary_key=True, index=True)
    fecha = Column(Date, nullable=False)
    descripcion = Column(String)
    total = Column(Float)

    cliente_id = Column(Integer, ForeignKey("clientes.id"))
    cliente = relationship("ClienteDB", back_populates="albaranes")

# Pydantic
class Albaran(BaseModel):
    id: int
    fecha: date
    descripcion: str
    total: float
    cliente_id: int

    class Config:
        from_attributes = True

class AlbaranCreate(BaseModel):
    fecha: date
    descripcion: str
    total: float
    cliente_id: int
