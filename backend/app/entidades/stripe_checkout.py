from datetime import datetime

from sqlalchemy import Column, DateTime, Float, Integer, String

from backend.app.database import Base


class StripeCheckoutDB(Base):
    """Tabla mínima para no procesar 2 veces el mismo Checkout Session.

    Esto te evita duplicar movimientos cuando:
    - recargas la página de éxito
    - repites el confirm por error
    """

    __tablename__ = "stripe_checkouts"

    id = Column(Integer, primary_key=True, index=True)

    # ID de Stripe Checkout Session (cs_test_...)
    session_id = Column(String, unique=True, index=True, nullable=False)

    # Datos útiles para auditoría/demo
    payment_intent_id = Column(String, nullable=True)
    amount = Column(Float, nullable=False, default=0.0)
    currency = Column(String, nullable=False, default="eur")
    description = Column(String, nullable=True)
    status = Column(String, nullable=False, default="paid")

    created_at = Column(DateTime, nullable=False, default=lambda: datetime.now(datetime.UTC))
