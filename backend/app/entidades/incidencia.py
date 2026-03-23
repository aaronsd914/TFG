from sqlalchemy import Column, Integer, String, Date, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.database import Base
from pydantic import BaseModel
from datetime import date


class IncidenciaDB(Base):
    __tablename__ = "incidencias"

    id = Column(Integer, primary_key=True, index=True)
    albaran_id = Column(Integer, ForeignKey("albaranes.id"), nullable=False)
    descripcion = Column(String, nullable=False)
    fecha_creacion = Column(Date, nullable=False)

    albaran = relationship("DeliveryNoteDB", back_populates="incidencias")


# ---- Pydantic ----


class Incidencia(BaseModel):
    id: int
    albaran_id: int
    descripcion: str
    fecha_creacion: date

    class Config:
        from_attributes = True


class IncidenciaCreate(BaseModel):
    albaran_id: int
    descripcion: str
