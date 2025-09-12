from datetime import date
from sqlalchemy import func
from backend.app.entidades.cliente import ClienteDB
from backend.app.entidades.proveedor import ProveedorDB
from backend.app.entidades.producto import ProductoDB
from backend.app.entidades.albaran import AlbaranDB
from backend.app.entidades.linea_albaran import LineaAlbaranDB

def seed(db):
    # --- PROVEEDORES ---
    if db.query(func.count(ProveedorDB.id)).scalar() == 0:
        proveedores = [
            ProveedorDB(nombre="Muebles Rivera S.L.",    contacto="rivera@proveedores.com"),
            ProveedorDB(nombre="Nordic Home Supplies",   contacto="ventas@nordichome.eu"),
            ProveedorDB(nombre="OfiComfort España",      contacto="comercial@oficomfort.es"),
        ]
        db.add_all(proveedores)
        db.commit()

    # mapa {nombre: id} por comodidad
    prov_map = {p.nombre: p.id for p in db.query(ProveedorDB).all()}

    # --- PRODUCTOS ---
    if db.query(func.count(ProductoDB.id)).scalar() == 0:
        productos = [
            ProductoDB(
                nombre="Sofá de cuero Milano",
                descripcion="Sofá 3 plazas en cuero marrón",
                precio=1200.0,
                proveedor_id=prov_map["Muebles Rivera S.L."]
            ),
            ProductoDB(
                nombre="Mesa de comedor Oslo",
                descripcion="Mesa extensible de madera maciza",
                precio=850.0,
                proveedor_id=prov_map["Nordic Home Supplies"]
            ),
            ProductoDB(
                nombre="Silla ergonómica Berlin",
                descripcion="Silla de oficina con soporte lumbar",
                precio=320.0,
                proveedor_id=prov_map["OfiComfort España"]
            ),
            ProductoDB(
                nombre="Armario ropero Roma",
                descripcion="Armario de 3 puertas con espejo",
                precio=990.0,
                proveedor_id=prov_map["Muebles Rivera S.L."]
            ),
            ProductoDB(
                nombre="Cama King Size Madrid",
                descripcion="Cama de matrimonio con cabecero",
                precio=1450.0,
                proveedor_id=prov_map["Nordic Home Supplies"]
            ),
        ]
        db.add_all(productos)
        db.commit()

    # --- CLIENTES ---
    if db.query(func.count(ClienteDB.id)).scalar() == 0:
        db.add_all([
            ClienteDB(nombre="María González", email="maria.gonzalez@example.com"),
            ClienteDB(nombre="Juan Pérez",     email="juan.perez@example.com"),
            ClienteDB(nombre="Ana López",      email="ana.lopez@example.com"),
            ClienteDB(nombre="Carlos Sánchez", email="carlos.sanchez@example.com"),
        ])
        db.commit()

    # --- ALBARÁN DE EJEMPLO ---
    if db.query(func.count(AlbaranDB.id)).scalar() == 0:
        cliente = db.query(ClienteDB).first()
        prods = db.query(ProductoDB).order_by(ProductoDB.id).limit(2).all()

        alb = AlbaranDB(
            fecha=date.today(),
            descripcion="Compra inicial de mobiliario",
            cliente_id=cliente.id,
            total=0.0
        )
        db.add(alb); db.flush()

        total = 0.0
        if prods:
            l1 = LineaAlbaranDB(
                albaran_id=alb.id,
                producto_id=prods[0].id,
                cantidad=1,
                precio_unitario=prods[0].precio
            )
            db.add(l1); total += l1.cantidad * l1.precio_unitario

        if len(prods) > 1:
            l2 = LineaAlbaranDB(
                albaran_id=alb.id,
                producto_id=prods[1].id,
                cantidad=2,
                precio_unitario=prods[1].precio
            )
            db.add(l2); total += l2.cantidad * l2.precio_unitario

        alb.total = total
        db.commit()

    print("✅ Seed ejecutado (idempotente)")
