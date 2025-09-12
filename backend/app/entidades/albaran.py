from sqlalchemy import Column, Integer, String, Float, ForeignKey, Date
from sqlalchemy.orm import relationship
from backend.app.database import Base
from pydantic import BaseModel
from datetime import date
from typing import List, Optional

# SQLAlchemy model
class AlbaranDB(Base):
    __tablename__ = "albaranes"

    id = Column(Integer, primary_key=True, index=True)
    fecha = Column(Date, nullable=False)
    descripcion = Column(String)
    total = Column(Float, default=0.0)

    cliente_id = Column(Integer, ForeignKey("clientes.id"))
    cliente = relationship("ClienteDB", back_populates="albaranes")

    # NUEVO: líneas del albarán
    lineas = relationship(
        "LineaAlbaranDB",
        back_populates="albaran",
        cascade="all, delete-orphan",
    )

# ---- Pydantic (respuestas) ----
class AlbaranLinea(BaseModel):
    id: int
    producto_id: int
    cantidad: int
    precio_unitario: float
    class Config:
        from_attributes = True

class Albaran(BaseModel):
    id: int
    fecha: date
    descripcion: Optional[str] = None
    total: float
    cliente_id: int
    lineas: List[AlbaranLinea] = []
    class Config:
        from_attributes = True

# ---- Pydantic (creación) ----
class AlbaranLineaCreate(BaseModel):
    producto_id: int
    cantidad: int
    precio_unitario: float | None = None  # si no llega, usamos el precio del producto

class AlbaranCreate(BaseModel):
    fecha: date
    descripcion: Optional[str] = None
    cliente_id: int  # si prefieres crear cliente “en línea”, abajo hay otra variante
