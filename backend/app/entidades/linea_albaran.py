from sqlalchemy import Column, Integer, Float, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.database import Base


class DeliveryNoteLineDB(Base):
    __tablename__ = "lineas_albaran"

    id = Column(Integer, primary_key=True, index=True)
    delivery_note_id = Column('albaran_id', Integer, ForeignKey("albaranes.id"), index=True, nullable=False)
    product_id = Column('producto_id', Integer, ForeignKey("productos.id"), index=True, nullable=False)
    quantity = Column('cantidad', Integer, nullable=False, default=1)
    unit_price = Column('precio_unitario', Float, nullable=False)

    delivery_note = relationship("DeliveryNoteDB", back_populates="items")
