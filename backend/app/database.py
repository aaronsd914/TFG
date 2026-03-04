from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session

DATABASE_URL = "postgresql://postgres:root@localhost:5432/TFG"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """
    Generador de sesión de base de datos para inyección de dependencias en FastAPI.
    Garantiza que la sesión se cierra siempre, incluso si ocurre una excepción.
    Importar en los routers como: from backend.app.database import get_db
    """
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()
