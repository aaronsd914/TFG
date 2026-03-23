from sqlalchemy import Column, Integer, String, Text
from backend.app.database import Base
from pydantic import BaseModel
from typing import Optional


class ConfigDB(Base):
    __tablename__ = "configuracion"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, nullable=False, index=True)
    value = Column(Text, nullable=True)


class ConfigItem(BaseModel):
    key: str
    value: Optional[str] = None

    model_config = {"from_attributes": True}
