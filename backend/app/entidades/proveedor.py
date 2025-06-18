from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from backend.app.database import Base
from pydantic import BaseModel
from typing import List

class ProveedorDB(Base):
    __tablename__ = "proveedores"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, index=True)
    contacto = Column(String)

    productos = relationship("ProductoDB", back_populates="proveedor", cascade="all, delete")

class Proveedor(BaseModel):
    id: int
    nombre: str
    contacto: str

    class Config:
        from_attributes = True

class ProveedorCreate(BaseModel):
    nombre: str
    contacto: str
