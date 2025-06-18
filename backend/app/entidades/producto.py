from sqlalchemy import Column, Integer, String, Float, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.database import Base
from pydantic import BaseModel

class ProductoDB(Base):
    __tablename__ = "productos"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, index=True)
    descripcion = Column(String)
    precio = Column(Float)

    proveedor_id = Column(Integer, ForeignKey("proveedores.id"))
    proveedor = relationship("ProveedorDB", back_populates="productos")

class Producto(BaseModel):
    id: int
    nombre: str
    descripcion: str
    precio: float
    proveedor_id: int

    class Config:
        from_attributes = True

class ProductoCreate(BaseModel):
    nombre: str
    descripcion: str
    precio: float
    proveedor_id: int
