from sqlalchemy import Column, Integer, String, UniqueConstraint
from sqlalchemy.orm import relationship
from backend.app.database import Base
from pydantic import BaseModel, EmailStr
from typing import Optional

# Modelo SQLAlchemy (tabla en la BBDD)
class ClienteDB(Base):
    __tablename__ = "clientes"

    id = Column(Integer, primary_key=True, index=True)

    # Identificación
    nombre = Column(String, index=True, nullable=False)
    apellidos = Column(String, index=True, nullable=False)
    dni = Column(String, index=True, unique=True, nullable=True)  # puede ser null, pero si viene debe ser único

    # Contacto
    email = Column(String, index=True, nullable=True)
    telefono1 = Column(String, nullable=True)
    telefono2 = Column(String, nullable=True)

    # Dirección
    calle = Column(String, nullable=True)
    numero_vivienda = Column(String, nullable=True)  # string para soportar 12B, s/n, etc.
    piso_portal = Column(String, nullable=True)      # opcional (ej. "2A")
    ciudad = Column(String, index=True, nullable=True)
    codigo_postal = Column(String, index=True, nullable=True)

    albaranes = relationship("AlbaranDB", back_populates="cliente", cascade="all, delete")

# ----------------- Pydantic -----------------
class Cliente(BaseModel):
    id: int
    nombre: str
    apellidos: str
    dni: Optional[str] = None
    email: Optional[str] = None
    telefono1: Optional[str] = None
    telefono2: Optional[str] = None
    calle: Optional[str] = None
    numero_vivienda: Optional[str] = None
    piso_portal: Optional[str] = None
    ciudad: Optional[str] = None
    codigo_postal: Optional[str] = None

    class Config:
        from_attributes = True

class ClienteCreate(BaseModel):
    # Para crear/actualizar (desde formularios)
    nombre: str
    apellidos: str
    dni: Optional[str] = None
    email: Optional[EmailStr] = None
    telefono1: Optional[str] = None
    telefono2: Optional[str] = None
    calle: Optional[str] = None
    numero_vivienda: Optional[str] = None
    piso_portal: Optional[str] = None
    ciudad: Optional[str] = None
    codigo_postal: Optional[str] = None
