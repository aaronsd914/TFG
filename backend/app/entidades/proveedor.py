from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from backend.app.database import Base
from pydantic import BaseModel


class SupplierDB(Base):
    __tablename__ = "proveedores"

    id = Column(Integer, primary_key=True, index=True)
    name = Column("nombre", String, index=True)
    contact = Column("contacto", String)

    products = relationship(
        "ProductDB", back_populates="supplier", cascade="all, delete"
    )


class Supplier(BaseModel):
    id: int
    name: str
    contact: str

    class Config:
        from_attributes = True


class SupplierCreate(BaseModel):
    name: str
    contact: str
