from sqlalchemy import Column, Integer, String, Float, ForeignKey, Date
from sqlalchemy.orm import relationship
from backend.app.database import Base
from pydantic import BaseModel
from datetime import date
from typing import List, Optional, Literal

# Estados internos (valores en DB)
# FIANZA -> "Fianza"
# ALMACEN -> "Almacén"
# TRANSPORTE -> "Ruta"
# ENTREGADO -> "Entregado"

class AlbaranDB(Base):
    __tablename__ = "albaranes"

    id = Column(Integer, primary_key=True, index=True)
    fecha = Column(Date, nullable=False)
    descripcion = Column(String)
    total = Column(Float, default=0.0)

    # NUEVO: estado
    # valores esperados: FIANZA | ALMACEN | TRANSPORTE | ENTREGADO
    estado = Column(String, default="FIANZA", nullable=False)

    cliente_id = Column(Integer, ForeignKey("clientes.id"))
    cliente = relationship("ClienteDB", back_populates="albaranes")

    # líneas del albarán
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

OneWordEstado = Literal["FIANZA", "ALMACEN", "RUTA", "ENTREGADO"]

class Albaran(BaseModel):
    id: int
    fecha: date
    descripcion: Optional[str] = None
    total: float
    cliente_id: int
    estado: OneWordEstado
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
    estado: OneWordEstado = "FIANZA"
