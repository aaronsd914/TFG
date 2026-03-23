from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from backend.app.database import Base
from pydantic import BaseModel, EmailStr
from typing import Optional


# SQLAlchemy model (DB table: clientes)
class CustomerDB(Base):
    __tablename__ = "clientes"

    id = Column(Integer, primary_key=True, index=True)

    # Identity
    name = Column("nombre", String, index=True, nullable=False)
    surnames = Column("apellidos", String, index=True, nullable=False)
    dni = Column(String, index=True, unique=True, nullable=True)

    # Contact
    email = Column(String, index=True, nullable=True)
    phone1 = Column("telefono1", String, nullable=True)
    phone2 = Column("telefono2", String, nullable=True)

    # Address
    street = Column("calle", String, nullable=True)
    house_number = Column("numero_vivienda", String, nullable=True)
    floor_entrance = Column("piso_portal", String, nullable=True)
    city = Column("ciudad", String, index=True, nullable=True)
    postal_code = Column("codigo_postal", String, index=True, nullable=True)

    delivery_notes = relationship(
        "DeliveryNoteDB", back_populates="customer", cascade="all, delete"
    )


# ----------------- Pydantic -----------------
class Customer(BaseModel):
    id: int
    name: str
    surnames: str
    dni: Optional[str] = None
    email: Optional[str] = None
    phone1: Optional[str] = None
    phone2: Optional[str] = None
    street: Optional[str] = None
    house_number: Optional[str] = None
    floor_entrance: Optional[str] = None
    city: Optional[str] = None
    postal_code: Optional[str] = None

    class Config:
        from_attributes = True


class CustomerCreate(BaseModel):
    name: str
    surnames: str
    dni: Optional[str] = None
    email: Optional[EmailStr] = None
    phone1: Optional[str] = None
    phone2: Optional[str] = None
    street: Optional[str] = None
    house_number: Optional[str] = None
    floor_entrance: Optional[str] = None
    city: Optional[str] = None
    postal_code: Optional[str] = None
