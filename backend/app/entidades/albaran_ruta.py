from sqlalchemy import Column, Integer, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from backend.app.database import Base


class DeliveryNoteRouteDB(Base):
    """
    Auxiliary table for assigning delivery notes (status RUTA) to a truck.
    Avoids adding truck_id to the delivery notes table.
    """

    __tablename__ = "albaran_rutas"

    id = Column(Integer, primary_key=True, index=True)

    delivery_note_id = Column(
        "albaran_id",
        Integer,
        ForeignKey("albaranes.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )

    truck_id = Column("camion_id", Integer, nullable=False)

    delivery_note = relationship("DeliveryNoteDB")

    __table_args__ = (
        UniqueConstraint("albaran_id", name="uq_albaran_rutas_albaran_id"),
    )
