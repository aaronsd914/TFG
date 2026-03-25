import os
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

from backend.app.api import (
    clientes,
    productos,
    proveedores,
    albaranes,
    movimientos,
    analytics,
    ai,
    auth,
    transportes,
    stripe_payments,
    incidencias,
)
from backend.app.api import configuracion
from backend.app.utils.resumen_semanal import job_resumen_semanal
from backend.app.database import Base, engine, SessionLocal
from backend.app.seed import seed


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)

    if os.getenv("ENVIRONMENT", "development") != "production":
        with SessionLocal() as db:
            seed(db)

    scheduler = BackgroundScheduler(timezone="Europe/Madrid")
    scheduler.add_job(job_resumen_semanal, CronTrigger(minute="*"))
    scheduler.start()

    yield

    scheduler.shutdown(wait=False)


app = FastAPI(lifespan=lifespan)

# CORS para Vite
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        o.strip()
        for o in os.getenv(
            "CORS_ORIGINS",
            "http://localhost:5173,http://127.0.0.1:5173,http://localhost,http://localhost:80,http://127.0.0.1",
        ).split(",")
        if o.strip()
    ]
    + [
        "https://tfg-five-drab.vercel.app",
        "https://tfg-i35kymnah-aaronsd914s-projects.vercel.app",
        "https://furnigest.com",
        "https://www.furnigest.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(clientes.router, prefix="/api")
app.include_router(productos.router, prefix="/api")
app.include_router(proveedores.router, prefix="/api")
app.include_router(albaranes.router, prefix="/api")
app.include_router(movimientos.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(ai.router, prefix="/api")
app.include_router(transportes.router, prefix="/api")
app.include_router(stripe_payments.router)
app.include_router(configuracion.router, prefix="/api")
app.include_router(incidencias.router, prefix="/api")


@app.get("/health")
def health_check():
    return {"status": "ok"}


logging.basicConfig(
    level=logging.INFO, format="%(levelname)s %(name)s:%(lineno)d - %(message)s"
)

logging.getLogger("emailer").setLevel(logging.DEBUG)
logging.getLogger("albaran_pdf").setLevel(logging.DEBUG)
