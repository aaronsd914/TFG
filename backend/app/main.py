from fastapi import FastAPI
from backend.app.api.clientes import router as clientes_router
from backend.app.database import Base, engine

app = FastAPI()

app.include_router(clientes_router, prefix="/api", tags=["clientes"])

# Crear tablas al iniciar (solo para desarrollo)
Base.metadata.create_all(bind=engine)

