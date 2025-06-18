from fastapi import FastAPI
from backend.app.api.clientes import router as clientes_router
from backend.app.api.productos import router as productos_router
from backend.app.api.proveedores import router as proveedores_router
from backend.app.database import Base, engine

app = FastAPI()

app.include_router(clientes_router, prefix="/api", tags=["clientes"])
app.include_router(productos_router, prefix="/api", tags=["productos"])
app.include_router(proveedores_router, prefix="/api", tags=["proveedores"])

# Crear las tablas en la base de datos
Base.metadata.create_all(bind=engine)
