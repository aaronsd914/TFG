from sqlalchemy import Column, Integer, String, Float, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.database import Base
from pydantic import BaseModel


class ProductDB(Base):
    __tablename__ = "productos"

    id = Column(Integer, primary_key=True, index=True)
    name = Column("nombre", String, index=True)
    description = Column("descripcion", String)
    price = Column("precio", Float)

    supplier_id = Column(
        "proveedor_id", Integer, ForeignKey("proveedores.id"), nullable=False
    )
    supplier = relationship("SupplierDB", back_populates="products")


class Product(BaseModel):
    id: int
    name: str
    description: str
    price: float
    supplier_id: int

    class Config:
        from_attributes = True


class ProductCreate(BaseModel):
    name: str
    description: str
    price: float
    supplier_id: int
