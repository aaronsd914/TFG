from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.api import clientes, productos, proveedores, albaranes, movimientos, analytics, ai, bank
from contextlib import asynccontextmanager
import logging

from backend.app.database import Base, engine, SessionLocal
from backend.app.seed import seed

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1) CREA tablas si no existen (NO borra datos)
    Base.metadata.create_all(bind=engine)

    # 2) SEED idempotente
    with SessionLocal() as db:
        seed(db)

    yield

app = FastAPI(lifespan=lifespan)

# CORS para Vite
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Incluye todas las rutas
app.include_router(clientes.router, prefix="/api")
app.include_router(productos.router, prefix="/api")
app.include_router(proveedores.router, prefix="/api")
app.include_router(albaranes.router, prefix="/api")
app.include_router(movimientos.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(ai.router, prefix="/api")
app.include_router(bank.router)

logging.basicConfig(
    level=logging.INFO,
    format="%(levelname)s %(name)s:%(lineno)d - %(message)s"
)

logging.getLogger("emailer").setLevel(logging.DEBUG)
logging.getLogger("albaran_pdf").setLevel(logging.DEBUG)
