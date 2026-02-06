from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.api import clientes, productos, proveedores, albaranes, movimientos, analytics, ai, bank, transportes
from contextlib import asynccontextmanager
import logging

from backend.app.database import Base, engine, SessionLocal
from backend.app.seed import seed

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)

    with SessionLocal() as db:
        seed(db)

    yield

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(clientes.router, prefix="/api")
app.include_router(productos.router, prefix="/api")
app.include_router(proveedores.router, prefix="/api")
app.include_router(albaranes.router, prefix="/api")
app.include_router(movimientos.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(ai.router, prefix="/api")
app.include_router(transportes.router, prefix="/api")   # ✅ IMPORTANTE
app.include_router(bank.router)

logging.basicConfig(
    level=logging.INFO,
    format="%(levelname)s %(name)s:%(lineno)d - %(message)s"
)

logging.getLogger("emailer").setLevel(logging.DEBUG)
logging.getLogger("albaran_pdf").setLevel(logging.DEBUG)
