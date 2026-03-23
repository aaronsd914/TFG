from sqlalchemy import Boolean, Column, Integer, String
from backend.app.database import Base
from pydantic import BaseModel


# ── SQLAlchemy ────────────────────────────────────────────────────────────────
class UserDB(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(
        String, nullable=False, default="vendedor"
    )  # admin | vendedor | repartidor
    is_active = Column(Boolean, default=True)


# ── Pydantic ──────────────────────────────────────────────────────────────────
class User(BaseModel):
    id: int
    username: str
    role: str
    is_active: bool

    model_config = {"from_attributes": True}


class UserCreate(BaseModel):
    username: str
    password: str
    role: str = "vendedor"


class UpdateMe(BaseModel):
    current_password: str
    new_username: str | None = None
    new_password: str | None = None
