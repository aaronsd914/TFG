from sqlalchemy import Column, Integer, Float, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.database import Base

class LineaAlbaranDB(Base):
    __tablename__ = "lineas_albaran"

    id = Column(Integer, primary_key=True, index=True)
    albaran_id = Column(Integer, ForeignKey("albaranes.id"), index=True, nullable=False)
    producto_id = Column(Integer, ForeignKey("productos.id"), index=True, nullable=False)
    cantidad = Column(Integer, nullable=False, default=1)
    precio_unitario = Column(Float, nullable=False)

    albaran = relationship("AlbaranDB", back_populates="lineas")
