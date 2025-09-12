from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from backend.app.database import Base
from pydantic import BaseModel

# Modelo SQLAlchemy (tabla en la BBDD)
class ClienteDB(Base):
    __tablename__ = "clientes"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, index=True)
    email = Column(String, index=True)

    albaranes = relationship("AlbaranDB", back_populates="cliente", cascade="all, delete")

# Esquemas Pydantic
class Cliente(BaseModel):
    id: int
    nombre: str
    email: str

    class Config:
        from_attributes = True

class ClienteCreate(BaseModel):
    nombre: str
    email: str
