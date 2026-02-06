from sqlalchemy import Column, Integer, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from backend.app.database import Base


class AlbaranRutaDB(Base):
    """
    Tabla auxiliar para asignar albaranes (en estado RUTA) a un camión.
    Evita tener que añadir camion_id a la tabla albaranes.
    """
    __tablename__ = "albaran_rutas"

    id = Column(Integer, primary_key=True, index=True)

    # Un albarán solo puede estar asignado a 1 camión a la vez
    albaran_id = Column(Integer, ForeignKey("albaranes.id", ondelete="CASCADE"), nullable=False, unique=True)

    camion_id = Column(Integer, nullable=False)

    # Relación opcional (útil si luego quieres navegar desde SQLAlchemy)
    albaran = relationship("AlbaranDB")

    __table_args__ = (
        UniqueConstraint("albaran_id", name="uq_albaran_rutas_albaran_id"),
    )
