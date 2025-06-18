from fastapi import FastAPI
from backend.app.api import clientes, productos, proveedores, albaranes, presupuestos, movimientos

app = FastAPI()

# Incluye todas las rutas
app.include_router(clientes.router, prefix="/api")
app.include_router(productos.router, prefix="/api")
app.include_router(proveedores.router, prefix="/api")
app.include_router(albaranes.router, prefix="/api")
app.include_router(presupuestos.router, prefix="/api")
app.include_router(movimientos.router, prefix="/api")