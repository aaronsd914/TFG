from sqlalchemy import Column, Integer, String, Float, ForeignKey, Date
from sqlalchemy.orm import relationship
from backend.app.database import Base
from pydantic import BaseModel
from datetime import date
from typing import List, Optional, Literal

# Internal status values (stored in DB)
# FIANZA   -> deposit/bond
# ALMACEN  -> warehouse
# TRANSPORTE -> in route
# ENTREGADO -> delivered
DeliveryNoteStatus = Literal["FIANZA", "ALMACEN", "RUTA", "ENTREGADO", "INCIDENCIA"]


class DeliveryNoteDB(Base):
    __tablename__ = "albaranes"

    id = Column(Integer, primary_key=True, index=True)
    date = Column("fecha", Date, nullable=False)
    description = Column("descripcion", String)
    total = Column(Float, default=0.0)
    status = Column("estado", String, default="FIANZA", nullable=False)

    customer_id = Column("cliente_id", Integer, ForeignKey("clientes.id"))
    customer = relationship("CustomerDB", back_populates="delivery_notes")

    items = relationship(
        "DeliveryNoteLineDB",
        back_populates="delivery_note",
        cascade="all, delete-orphan",
    )
    incidencias = relationship(
        "IncidenciaDB",
        back_populates="albaran",
        cascade="all, delete-orphan",
    )


# ---- Pydantic (responses) ----
class DeliveryNoteItem(BaseModel):
    id: int
    product_id: int
    quantity: int
    unit_price: float

    class Config:
        from_attributes = True


class DeliveryNote(BaseModel):
    id: int
    date: date
    description: Optional[str] = None
    total: float
    customer_id: int
    status: DeliveryNoteStatus
    items: List[DeliveryNoteItem] = []

    class Config:
        from_attributes = True


# ---- Pydantic (creation) ----
class DeliveryNoteItemCreate(BaseModel):
    product_id: int
    quantity: int
    unit_price: float | None = None  # if not provided, uses product price


class DeliveryNoteCreate(BaseModel):
    date: date
    description: Optional[str] = None
    customer_id: int
    status: DeliveryNoteStatus = "FIANZA"
