from datetime import date, timedelta
import random
from sqlalchemy import func
from sqlalchemy.orm import Session
from backend.app.entidades.cliente import ClienteDB
from backend.app.entidades.proveedor import ProveedorDB
from backend.app.entidades.producto import ProductoDB
from backend.app.entidades.albaran import AlbaranDB
from backend.app.entidades.linea_albaran import LineaAlbaranDB

TARGET_PRODUCTS = 90
TARGET_CLIENTS = 100
YEARS_BACK_FOR_ORDERS = 2
clientes_con_multiples_albaranes = []  # <<=== lista de clientes con > 1 albarán

ESTADOS = ["FIANZA", "ALMACEN", "RUTA", "ENTREGADO"]

def _email_slug(nombre: str, apellidos: str) -> str:
    return f"{nombre}.{apellidos}".lower().replace(" ", "")

def _gen_email(base: str, dominio="example.com", dedup=0) -> str:
    return f"{base}{dedup if dedup else ''}@{dominio}"

def _gen_dni(existing: set[str]) -> str:
    letras = "TRWAGMYFPDXBNJZSQVHLCKE"
    while True:
        numero = random.randint(10_000_000, 99_999_999)
        dni = f"{numero}{letras[numero % 23]}"
        if dni not in existing:
            existing.add(dni)
            return dni

def _ensure_providers(db: Session):
    if db.query(func.count(ProveedorDB.id)).scalar() == 0:
        proveedores = [
            ProveedorDB(nombre="Muebles Rivera S.L.",  contacto="rivera@proveedores.com"),
            ProveedorDB(nombre="Nordic Home Supplies", contacto="ventas@nordichome.eu"),
            ProveedorDB(nombre="OfiComfort España",    contacto="comercial@oficomfort.es"),
        ]
        db.add_all(proveedores)
        db.commit()

def _ensure_products(db: Session):
    base = [
        ("Sofá de cuero Milano", "Sofá 3 plazas en cuero marrón", 1200.0),
        ("Mesa de comedor Oslo", "Mesa extensible de madera maciza", 850.0),
        ("Silla ergonómica Berlin", "Silla de oficina con soporte lumbar", 320.0),
        ("Armario ropero Roma", "Armario de 3 puertas con espejo", 990.0),
        ("Cama King Size Madrid", "Cama de matrimonio con cabecero", 1450.0),
        ("Lámpara de pie Zurich", "Lámpara LED regulable", 129.0),
        ("Alfombra Estambul", "Alfombra de lana 200x300", 260.0),
        ("Estantería Bilbao", "Estantería metálica 5 baldas", 140.0),
        ("Escritorio Lisboa", "Escritorio con cajonera", 270.0),
        ("Silla comedor Porto", "Silla de madera tapizada", 90.0),
        ("Mesa centro Praga", "Mesa de centro con cristal", 210.0),
        ("Aparador Viena", "Aparador 180cm 3 puertas", 680.0),
        ("Butaca Florencia", "Butaca relax reclinable", 340.0),
        ("Cabecero Sevilla", "Cabecero tapizado 150cm", 190.0),
        ("Mesita noche León", "Mesita 2 cajones", 95.0),
        ("Cómoda Toledo", "Cómoda 4 cajones", 230.0),
        ("Zapatero Córdoba", "Zapatero 3 puertas abatibles", 160.0),
        ("Vitrina Salamanca", "Vitrina con iluminación LED", 520.0),
        ("Mueble TV Granada", "Mueble TV 180cm", 310.0),
        ("Silla oficina Lyon", "Silla giratoria con ruedas", 180.0),
        ("Taburete Ibiza", "Taburete alto cocina", 75.0),
        ("Perchero Berlín", "Perchero metálico", 49.0),
        ("Espejo Málaga", "Espejo pared 80x180", 120.0),
        ("Banco recibidor Cádiz", "Banco con cajón", 150.0),
        ("Colchón Valencia", "Colchón viscoelástico 150x190", 390.0),
        ("Somier Zaragoza", "Somier láminas 150x190", 170.0),
    ]

    provs = db.query(ProveedorDB).order_by(ProveedorDB.id).all()
    if not provs:
        return
    prov_ids = [p.id for p in provs]

    existing_names = set(p.nombre for p in db.query(ProductoDB).all())
    to_add = []

    for (n, d, pr) in base:
        if n not in existing_names:
            to_add.append(ProductoDB(
                nombre=n,
                descripcion=d,
                precio=float(pr),
                proveedor_id=random.choice(prov_ids),
            ))

    count_now = (db.query(func.count(ProductoDB.id)).scalar() or 0) + len(to_add)
    idx = 1
    while count_now < TARGET_PRODUCTS:
        name = f"Producto {idx:03d}"
        if name not in existing_names:
            to_add.append(ProductoDB(
                nombre=name,
                descripcion=f"Descripción de {name}",
                precio=round(random.uniform(20, 2000), 2),
                proveedor_id=random.choice(prov_ids),
            ))
            existing_names.add(name)
            count_now += 1
        idx += 1

    if to_add:
        db.add_all(to_add)
        db.commit()

def _ensure_clients(db: Session):
    first_names = [
        "María","Juan","Ana","Carlos","Lucía","Miguel","Sofía","Alejandro","Paula","Javier","Marta","Diego",
        "Irene","Pablo","Elena","Sergio","Noelia","Hugo","Nerea","David","Laura","Raúl","Clara","Rubén",
        "Alicia","Guillermo","Nicolás","Beatriz","Tomás","Patricia","Adrián","Silvia","Jaime","Teresa",
        "Víctor","Rocío","Gonzalo","Eva","Andrés","Álvaro","Carmen","Luciano","Valeria","Marcos","Julia",
        "Elisa","Daniel","Ángela","Cristina","Óscar","Santiago","Héctor","Noa","Aitor","Olga","Bruno",
        "Ariadna","Eduardo","Sonia","Aina","Leo","Carla","Claudia","Mario","Nora","Gabriel"
    ]
    last_names = [
        "González","Pérez","López","Sánchez","Martínez","Fernández","García","Rodríguez","Hernández","Ruiz",
        "Díaz","Moreno","Alonso","Romero","Navarro","Torres","Vargas","Castro","Santos","Iglesias","Cano",
        "Méndez","Serrano","Delgado","Ortega","Campos","Vega","Cruz","Guerrero","Soler","Blanco","Marín",
        "Lorenzo","Flores","Sáez","Rey","Suárez","Aguilar","Núñez","Ramos","Cortés","Peña","León","Silva",
        "Ibáñez","Vicente","Calvo","Cuevas","Parra","Moya","Vidal","Redondo","Estevez","Garrido"
    ]
    cities = ["Madrid","Barcelona","Valencia","Sevilla","Zaragoza","Málaga","Murcia","Valladolid","Bilbao","Alicante"]
    streets = ["Mayor","Gran Vía","Alcalá","Colón","Serrano","Velázquez","Castellana","Diagonal","Princesa","Atocha"]

    existing_emails = {c.email for c in db.query(ClienteDB).all() if c.email}
    existing_dnis = {c.dni for c in db.query(ClienteDB).all() if c.dni}

    clients_to_add = []
    current = db.query(func.count(ClienteDB.id)).scalar() or 0
    dedup = 1
    while current + len(clients_to_add) < TARGET_CLIENTS:
        nombre = random.choice(first_names)
        apellidos = random.choice(last_names)
        base = _email_slug(nombre, apellidos)
        email = _gen_email(base)
        if email in existing_emails:
            dedup += 1
            email = _gen_email(base, dedup=dedup)
        existing_emails.add(email)

        dni = _gen_dni(existing_dnis)

        c = ClienteDB(
            nombre=nombre,
            apellidos=apellidos,
            dni=dni,
            email=email,
            telefono1=f"6{random.randint(10,99)}{random.randint(100000,999999)}",
            telefono2=None if random.random() < 0.5 else f"7{random.randint(10,99)}{random.randint(100000,999999)}",
            calle=f"C/{random.choice(streets)}",
            numero_vivienda=str(random.randint(1, 120)),
            piso_portal=None if random.random() < 0.6 else f"{random.randint(1, 6)}{random.choice(['A','B','C'])}",
            ciudad=random.choice(cities),
            codigo_postal=str(random.randint(28001, 48999)),
        )
        clients_to_add.append(c)

    if clients_to_add:
        db.add_all(clients_to_add)
        db.commit()

def _ensure_orders(db: Session):
    clients = db.query(ClienteDB).order_by(ClienteDB.id).all()
    products = db.query(ProductoDB).order_by(ProductoDB.id).all()
    if not clients or not products:
        return

    two_count_goal = max(1, int(len(clients) * 0.30))
    three_count_goal = max(1, int(len(clients) * 0.10))

    # no duplicar si ya hay suficientes albaranes
    def already_saturated(cli: ClienteDB, desired: int) -> bool:
        existing_n = db.query(func.count(AlbaranDB.id)).filter(AlbaranDB.cliente_id == cli.id).scalar() or 0
        return existing_n >= desired

    shuffled = clients[:]
    random.shuffle(shuffled)
    three_set = set(c.id for c in shuffled[:three_count_goal])
    rest = [c for c in shuffled if c.id not in three_set]
    two_set = set(c.id for c in rest[:two_count_goal])

    def create_order_for_client(cli: ClienteDB):
        days = random.randint(0, 365 * YEARS_BACK_FOR_ORDERS)
        f = date.today() - timedelta(days=days)

        # bias para tener suficientes en ALMACEN
        # 40% ALMACEN, 25% FIANZA, 20% TRANSPORTE, 15% ENTREGADO
        r = random.random()
        if r < 0.40:
            est = "ALMACEN"
        elif r < 0.65:
            est = "FIANZA"
        elif r < 0.85:
            est = "TRANSPORTE"
        else:
            est = "ENTREGADO"

        alb = AlbaranDB(
            fecha=f,
            descripcion=random.choice([
                "Compra mobiliario salón", "Renovación despacho", "Pedido dormitorio",
                "Artículos varios", "Pedido online", "Reposición", "Promoción estacional"
            ]),
            cliente_id=cli.id,
            total=0.0,
            estado=est,
        )
        db.add(alb); db.flush()

        n_lineas = random.randint(1, 5)
        usados = set()
        total = 0.0
        for _ in range(n_lineas):
            prod = random.choice(products)
            if prod.id in usados and len(usados) < len(products):
                continue
            usados.add(prod.id)
            cant = random.randint(1, 4)
            linea = LineaAlbaranDB(
                albaran_id=alb.id,
                producto_id=prod.id,
                cantidad=cant,
                precio_unitario=float(prod.precio)
            )
            db.add(linea)
            total += cant * float(prod.precio)

        alb.total = round(total, 2)

    for cli in clients:
        existing_n = db.query(func.count(AlbaranDB.id)).filter(AlbaranDB.cliente_id == cli.id).scalar() or 0

        desired = 1
        if cli.id in two_set:
            desired = 2
        if cli.id in three_set:
            desired = 3

        to_create = max(0, desired - existing_n)
        for _ in range(to_create):
            create_order_for_client(cli)
            if (to_create > 1):
                clientes_con_multiples_albaranes.append(f" ({cli.id})")

    db.commit()

def seed(db: Session):
    _ensure_providers(db)
    _ensure_products(db)
    _ensure_clients(db)
    _ensure_orders(db)
    print("✅ Seed ejecutado (idempotente): objetivos 3 proveedores, 90 productos, 100 clientes, 1–3 albaranes/cliente")
    print(clientes_con_multiples_albaranes)
