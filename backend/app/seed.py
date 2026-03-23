"""
seed.py — Pobla la base de datos con datos de demostración realistas.
La función seed() borra todos los datos existentes antes de insertar los nuevos,
garantizando un estado limpio y reproducible en cada arranque.
"""

import logging
from datetime import date, timedelta
import random
from sqlalchemy.orm import Session
from backend.app.entidades.cliente import CustomerDB
from backend.app.entidades.proveedor import SupplierDB
from backend.app.entidades.producto import ProductDB
from backend.app.entidades.albaran import DeliveryNoteDB
from backend.app.entidades.linea_albaran import DeliveryNoteLineDB
from backend.app.entidades.movimiento import MovementDB
from backend.app.entidades.usuario import UserDB
from passlib.context import CryptContext

_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

log = logging.getLogger("seed")

random.seed(42)  # Reproducible entre reinicios

# ---------------------------------------------------------------------------
# Proveedores
# ---------------------------------------------------------------------------
PROVEEDORES = [
    ("Muebles Rivera S.L.", "pedro.rivera@mueblesrivera.es"),
    ("Nordic Home Supplies", "ventas@nordichome.eu"),
    ("OfiComfort España", "comercial@oficomfort.es"),
    ("Madera Noble Ibérica S.A.", "pedidos@maderannoble.es"),
    ("Textil Decoración Hogar", "info@textilhogar.es"),
    ("Iluminación Moderna S.L.", "catalogo@iluminacionmoderna.es"),
    ("Colchones Descanso Plus", "mayorista@descansopluscom"),
    ("Dormitorios Premium S.L.", "ventas@dormitoriospremium.es"),
    ("Aceralia Metálicos S.A.", "contratos@aceralia-metalicos.es"),
    ("Vintage Wood Factory", "hola@vintagewoodfactory.com"),
    ("Cocinas & Complementos", "tienda@cocinasycomplementos.es"),
    ("Terrazo y Exterior S.L.", "exteriores@terrazzoyexterior.es"),
    ("Infancia Creativa", "pedidos@infanciacreativa.es"),
    ("DesignPro Contract", "contratos@designprocontract.com"),
    ("Arte y Cerámica España", "galeria@arteyceramica.es"),
    ("Europa Mueble Import", "import@europamueble.eu"),
    ("Tapicerías Andrés Hermanos", "taller@tapiceriasandres.es"),
    ("Estilo Nórdico Valencia", "showroom@estilonodrdicovalencia.es"),
]

# ---------------------------------------------------------------------------
# Productos  (nombre, descripción, precio, índice de proveedor en la lista)
# ---------------------------------------------------------------------------
PRODUCTOS = [
    # Muebles Rivera S.L.
    (
        "Sofá Chester 3 plazas",
        "Sofá clásico capitoné en terciopelo azul marino, patas doradas",
        1350.0,
        0,
    ),
    (
        "Sofá rinconera Modena",
        "Rinconera modular en tejido gris marengo con chaise longue reversible",
        1890.0,
        0,
    ),
    (
        "Butaca Relax Volterra",
        "Butaca reclinable eléctrica en cuero envejecido marrón",
        520.0,
        0,
    ),
    (
        "Sofá cama Génova 140",
        "Sofá cama apertura italiana, colchón 12 cm incluido",
        780.0,
        0,
    ),
    (
        "Chaiselongue Capri",
        "Chaiselongue tapizada en lino beige, pies de madera natural",
        640.0,
        0,
    ),
    (
        "Sofá 2 plazas Nápoles",
        "Sofá compacto para espacios pequeños, tela antimanchas gris",
        590.0,
        0,
    ),
    # Nordic Home Supplies
    (
        "Mesa comedor extensible Fjord",
        "Mesa de roble macizo extensible 140–220 cm, 8 comensales",
        920.0,
        1,
    ),
    ("Mesa auxiliar Björk", "Mesita nórdica de abedul con bandeja extraíble", 135.0, 1),
    (
        "Escritorio Oslo Compact",
        "Escritorio 120 cm con cajonera integrada en fresno blanco",
        340.0,
        1,
    ),
    (
        "Mesa centro Lund",
        "Mesa de centro elevable en roble, tapa de cristal antirrayaduras",
        295.0,
        1,
    ),
    (
        "Estantería librería Stavanger",
        "Librería modular 5 baldas en pino lacado blanco, 80×195 cm",
        210.0,
        1,
    ),
    (
        "Mesa escritorio esquinero Bergen",
        "Escritorio en L, superficie laminada blanca, soporte CPU incluido",
        385.0,
        1,
    ),
    # OfiComfort España
    (
        "Silla ejecutiva TechPro 600",
        "Silla de dirección con reposacabezas y soporte lumbar ajustable",
        420.0,
        2,
    ),
    (
        "Silla operativa ErgoNet",
        "Silla de malla transpirable, brazos 4D regulables",
        280.0,
        2,
    ),
    (
        "Silla de visitas Confort Plus",
        "Silla apilable para salas de reuniones, asiento acolchado",
        95.0,
        2,
    ),
    (
        "Silla gaming Racing XL",
        "Silla gaming con soporte lumbar y reposapiés extensible",
        310.0,
        2,
    ),
    (
        "Taburete elevable OfiBar",
        "Taburete de cocina u oficina en pie cromado, asiento regulable",
        115.0,
        2,
    ),
    (
        "Silla plegable Slim",
        "Silla plegable para espacios polivalentes, carga máx. 120 kg",
        55.0,
        2,
    ),
    # Madera Noble Ibérica
    (
        "Armario ropero Formentera 3P",
        "Armario 3 puertas correderas con espejo, interior equipado",
        1150.0,
        3,
    ),
    (
        "Cómoda Guadalquivir 6 cajones",
        "Cómoda 120 cm en madera de pino macizo, acabado natural",
        320.0,
        3,
    ),
    (
        "Zapatero Marbella 18 pares",
        "Zapatero 3 puertas abatibles en blanco mate",
        185.0,
        3,
    ),
    (
        "Aparador Ebro 3 puertas",
        "Aparador rústico en roble envejecido con herrajes de forja",
        710.0,
        3,
    ),
    (
        "Vitrina Alhambra cristal",
        "Vitrina 2 puertas con iluminación LED interior, 90×195 cm",
        590.0,
        3,
    ),
    (
        "Librería Segura 7 módulos",
        "Sistema modular de estanterías combinables en roble oscuro",
        460.0,
        3,
    ),
    # Textil Decoración Hogar
    (
        "Alfombra bereber Tarifa",
        "Alfombra tejida a mano 200×300 cm, lana natural cruda",
        380.0,
        4,
    ),
    (
        "Alfombra vinílica Mosaico",
        "Alfombra vinílica lavable 160×230 cm, patrón geométrico",
        125.0,
        4,
    ),
    (
        "Cojín terciopelo Nerja 50×50",
        "Pack de 2 cojines decorativos en terciopelo verde botella",
        45.0,
        4,
    ),
    (
        "Cortina oscureciente Dublin",
        "Par de cortinas blackout 140×260 cm, gris antracita",
        110.0,
        4,
    ),
    (
        "Edredón nórdico 400g Polar",
        "Edredón de plumón sintético 400 g/m², cama 150",
        135.0,
        4,
    ),
    (
        "Funda nórdica percal Mallorca",
        "Funda nórdica 100% algodón percal 200 hilos, cama 150",
        89.0,
        4,
    ),
    # Iluminación Moderna
    (
        "Lámpara pie Arco Dorado",
        "Lámpara de pie en metal dorado con pantalla de lino, altura 180 cm",
        195.0,
        5,
    ),
    (
        "Lámpara sobremesa Milano",
        "Lámpara táctil 3 intensidades, base mármol blanco",
        120.0,
        5,
    ),
    (
        "Plafón LED Techo Plano 60W",
        "Plafón redondo 60 cm empotrable, luz cálida 3000 K",
        145.0,
        5,
    ),
    (
        "Tira LED RGB 5m Controller",
        "Tira LED multicolor con mando a distancia y app",
        48.0,
        5,
    ),
    (
        "Foco carril orientable TRIO",
        "Conjunto 3 focos carril GU10 8W orientables, acabado negro mate",
        130.0,
        5,
    ),
    (
        "Lámpara Arco Arc Ámbar",
        "Lámpara de arco con brazo articulado y pantalla ambarina",
        165.0,
        5,
    ),
    # Colchones Descanso Plus
    (
        "Colchón viscoelástico Noche 150",
        "Colchón 150×190 cm, núcleo viscoelástico 5 cm, firmeza media",
        490.0,
        6,
    ),
    (
        "Colchón muelles ensacados Sueño",
        "Colchón 150×190 cm, 1000 muelles independientes más viscoelástico",
        680.0,
        6,
    ),
    (
        "Colchón látex Natural 135",
        "Colchón látex 100% natural 135×190 cm, certificado Oeko-Tex",
        590.0,
        6,
    ),
    (
        "Topper viscoelástico 5cm",
        "Topper adaptable 150×190 cm para renovar tu colchón actual",
        149.0,
        6,
    ),
    (
        "Almohada cervical Memory",
        "Almohada ergonómica viscoelástica, certificada ortopédica",
        65.0,
        6,
    ),
    (
        "Somier articulado eléctrico 150",
        "Somier elevable con motor silencioso, mando Bluetooth",
        720.0,
        6,
    ),
    # Dormitorios Premium
    (
        "Cama tapizada Élite 150",
        "Cama 150×190 con cabecero acolchado en terciopelo gris grafito",
        1100.0,
        7,
    ),
    (
        "Cama con cajones Dalia 90",
        "Cama 90×190 con 4 cajones y somier de láminas incluido",
        540.0,
        7,
    ),
    (
        "Cabecero tapizado Ágora 160",
        "Cabecero 160 cm en herradura, tela bouclé color arena",
        245.0,
        7,
    ),
    (
        "Mesita noche flotante Box",
        "Mesita suspendida con un cajón y estante abierto, roble claro",
        165.0,
        7,
    ),
    (
        "Mesita noche Triana 2 cajones",
        "Mesita de madera maciza, 2 cajones con cierre suave",
        130.0,
        7,
    ),
    (
        "Armario infantil 2 puertas Pino",
        "Armario pequeño 90 cm en pino macizo pintado blanco",
        395.0,
        7,
    ),
    # Aceralia Metálicos
    (
        "Estantería industrial loft 5B",
        "Estantería de tubo negro y tablero de madera, 180×200 cm",
        210.0,
        8,
    ),
    (
        "Perchero de pie Manhattan",
        "Perchero industrial 180 cm, tubo de acero negro, 8 ganchos",
        79.0,
        8,
    ),
    (
        "Banco recibidor hierro Rouen",
        "Banco con estructura de hierro forjado y asiento de madera",
        155.0,
        8,
    ),
    (
        "Mueble TV industrial Loft 180",
        "Mueble TV en acero laminado y tablero de MDF oscuro",
        340.0,
        8,
    ),
    (
        "Papelera metálica rejilla",
        "Papelera de oficina en chapa de acero perforada, 20 L",
        28.0,
        8,
    ),
    (
        "Archivador metálico 4 cajones",
        "Archivador de acero con cierre de seguridad, certificado A4",
        260.0,
        8,
    ),
    # Vintage Wood Factory
    (
        "Mesa de granja Provençal",
        "Mesa rectangular 180 cm en pino macizo encerado estilo provenzal",
        760.0,
        9,
    ),
    (
        "Aparador vintage Colmar",
        "Aparador 3 puertas pintado en blanco roto con detalles de madera cruda",
        680.0,
        9,
    ),
    (
        "Silla Windsor madera natural",
        "Silla Windsor respaldo de varillas, madera de olmo vaporizada",
        145.0,
        9,
    ),
    (
        "Baúl de madera Alsacia",
        "Baúl almacenaje en madera de pino envejecida, apertura frontal",
        230.0,
        9,
    ),
    (
        "Cama canapé rústica Rouen",
        "Cama canapé 135×190 en madera de roble macizo, altura 42 cm",
        890.0,
        9,
    ),
    (
        "Espejo marco madera bruta",
        "Espejo ovalado 120×180 con marco de madera recuperada",
        295.0,
        9,
    ),
    # Cocinas & Complementos
    (
        "Módulo base cocina 60 Blanco",
        "Módulo inferior 60 cm con cajón y puerta, acabado lacado blanco",
        195.0,
        10,
    ),
    (
        "Campana extractora Isla 90cm",
        "Campana de isla 90 cm, 3 velocidades, iluminación LED",
        490.0,
        10,
    ),
    (
        "Taburete cocina alto Bamberg",
        "Taburete alto apilable en haya lacada, asiento tapizado gris",
        95.0,
        10,
    ),
    (
        "Fregadero granito negro 1 seno",
        "Fregadero de granito negro 1 seno con escurridor integrado",
        345.0,
        10,
    ),
    (
        "Encimera laminada roble natural",
        "Tablero de cocina 300×60×3,8 cm en laminado roble natural",
        185.0,
        10,
    ),
    # Terrazo y Exterior
    (
        "Conjunto jardín ratán 4 sillas",
        "Mesa y 4 sillones en ratán sintético blanco, cojines incluidos",
        1250.0,
        11,
    ),
    (
        "Tumbona playa plegable Premium",
        "Tumbona reclinable 7 posiciones, aluminio anodizado y textilene",
        195.0,
        11,
    ),
    (
        "Mesa bistró exterior Mónaco",
        "Mesa redonda 70 cm en hierro fundido color Negro Oxford",
        125.0,
        11,
    ),
    (
        "Hamaca colgante con soporte",
        "Hamaca de algodón trenzado con soporte de acero galvanizado",
        180.0,
        11,
    ),
    (
        "Parasol excentrico Ø350 cm",
        "Parasol con mástil lateral, tela impermeable UV50+",
        320.0,
        11,
    ),
    # Infancia Creativa
    (
        "Cama evolutiva Nube 70×140",
        "Cama infantil 70×140 cm convertible en cama de 140×190",
        420.0,
        12,
    ),
    (
        "Escritorio infantil Estudio Plus",
        "Escritorio 120 cm regulable en altura y ángulo, con cajones",
        265.0,
        12,
    ),
    (
        "Armario infantil Bosque 3P",
        "Armario 3 puertas pintadas con motivos de bosque, 120 cm",
        490.0,
        12,
    ),
    (
        "Estantería árbol escalera Kids",
        "Estantería escalera en MDF, 5 baldas, acabado turquesa",
        135.0,
        12,
    ),
    (
        "Silla regulable estudio Joven",
        "Silla juvenil con altura y reposabrazos ajustables",
        98.0,
        12,
    ),
    # DesignPro Contract
    (
        "Mesa reuniones ovalada 10P",
        "Mesa de reuniones 300×120 cm en laminado wengué, patas metálicas",
        1850.0,
        13,
    ),
    (
        "Silla confidente eco cuero",
        "Silla de visitas 4 patas, asiento eco-cuero negro, apilable hasta x4",
        145.0,
        13,
    ),
    (
        "Recepción mostrador curvo",
        "Mostrador de recepción curvo 2m en MDF blanco con zócalo iluminado",
        2100.0,
        13,
    ),
    (
        "Sofá modular oficina 3+2",
        "Conjunto de sofás modulares para sala de espera, tela ignífuga",
        980.0,
        13,
    ),
    (
        "Biombo divisor acústico 4 hojas",
        "Biombo de tela ignífuga con absorción acústica, 4 hojas 60×180 cm",
        340.0,
        13,
    ),
    # Arte y Cerámica España
    (
        "Espejo redondo Arco 80cm",
        "Espejo de pared redondo con marco de madera natural ø80 cm",
        185.0,
        14,
    ),
    (
        "Jarrón cerámica artesanal Almería",
        "Jarrón alto de cerámica vidriada en turquesa, fabricación artesanal",
        95.0,
        14,
    ),
    (
        "Cuadro abstracto díptico 100×70",
        "Díptico de lienzo pintado a mano, técnica mixta sobre bastidor",
        210.0,
        14,
    ),
    (
        "Portacandelas hierro forjado x3",
        "Conjunto de 3 portavelas de distintas alturas en hierro negro",
        65.0,
        14,
    ),
    (
        "Reloj de pared industrial 60cm",
        "Reloj ø60 cm en metal negro con esfera estilo industrial vintage",
        88.0,
        14,
    ),
    # Europa Mueble Import
    (
        "Sofá cama italiano Brindisi",
        "Sofá cama 3 plazas con mecanismo italiano de fácil apertura",
        920.0,
        15,
    ),
    (
        "Mesa de comedor mármol 6P",
        "Mesa 180 cm con tapa de mármol Carrara y pies de acero inox.",
        1680.0,
        15,
    ),
    (
        "Silla comedor acero Milán",
        "Silla de comedor estructura acero cromado y asiento de cuero pu",
        135.0,
        15,
    ),
    (
        "Aparador diseño italiano Lumina",
        "Aparador lacado en blanco brillante con patas de latón dorado",
        990.0,
        15,
    ),
    (
        "Cama de diseño Venezia King",
        "Cama 180×200 cm con cabecero de madera lacada y somier listo",
        1750.0,
        15,
    ),
    # Tapicerías Andrés Hermanos
    (
        "Cabecero tapizado Kensington 150",
        "Cabecero 150 cm en capitoné con botones en terciopelo antelope",
        310.0,
        16,
    ),
    (
        "Sofá orejero Chesterfield",
        "Butaca orejera estilo Chesterfield en cuero genuino cognac",
        780.0,
        16,
    ),
    (
        "Silla comedor tapizada Kali",
        "Silla de comedor con respaldo capitoné, patas negro mate",
        185.0,
        16,
    ),
    (
        "Banco pie cama tapizado 140",
        "Banco acolchado para pie de cama 140 cm, tejido bouclé gris",
        220.0,
        16,
    ),
    # Estilo Nórdico Valencia
    (
        "Estantería escalera roble 5P",
        "Estantería escalera asimétrica en roble natural, 5 baldas abiertas",
        199.0,
        17,
    ),
    (
        "Mesa consola nórdica 120 cm",
        "Consola delgada en madera de roble con un cajón central",
        265.0,
        17,
    ),
    (
        "Silla comedor Eames replica",
        "Réplica silla Eames en polipropileno blanco, patas madera de haya",
        115.0,
        17,
    ),
    (
        "Colgador de pared 6 ganchos",
        "Perchero de pared en madera de roble con 6 ganchos metálicos",
        58.0,
        17,
    ),
    (
        "Mesa noche flotante Oak",
        "Mesita flotante 45×35 cm en chapa de roble con cajón",
        140.0,
        17,
    ),
]

# ---------------------------------------------------------------------------
# Clientes
# ---------------------------------------------------------------------------
_NOMBRES = [
    "María",
    "Juan",
    "Ana",
    "Carlos",
    "Lucía",
    "Miguel",
    "Sofía",
    "Alejandro",
    "Paula",
    "Javier",
    "Marta",
    "Diego",
    "Irene",
    "Pablo",
    "Elena",
    "Sergio",
    "Noelia",
    "Hugo",
    "Nerea",
    "David",
    "Laura",
    "Raúl",
    "Clara",
    "Rubén",
    "Alicia",
    "Guillermo",
    "Nicolás",
    "Beatriz",
    "Tomás",
    "Patricia",
    "Adrián",
    "Silvia",
    "Jaime",
    "Teresa",
    "Víctor",
    "Rocío",
    "Gonzalo",
    "Eva",
    "Andrés",
    "Álvaro",
    "Carmen",
    "Valeria",
    "Marcos",
    "Julia",
    "Elisa",
    "Daniel",
    "Ángela",
    "Cristina",
    "Óscar",
    "Santiago",
    "Héctor",
    "Noa",
    "Aitor",
    "Olga",
    "Bruno",
    "Ariadna",
    "Eduardo",
    "Sonia",
    "Aina",
    "Leo",
    "Carla",
    "Claudia",
    "Mario",
    "Nora",
    "Gabriel",
    "Rebeca",
    "Iván",
    "Pilar",
]
_APELLIDOS = [
    "González",
    "Pérez",
    "López",
    "Sánchez",
    "Martínez",
    "Fernández",
    "García",
    "Rodríguez",
    "Hernández",
    "Ruiz",
    "Díaz",
    "Moreno",
    "Alonso",
    "Romero",
    "Navarro",
    "Torres",
    "Vargas",
    "Castro",
    "Santos",
    "Iglesias",
    "Cano",
    "Méndez",
    "Serrano",
    "Delgado",
    "Ortega",
    "Campos",
    "Vega",
    "Cruz",
    "Guerrero",
    "Soler",
    "Blanco",
    "Marín",
    "Lorenzo",
    "Flores",
    "Sáez",
    "Rey",
    "Suárez",
    "Aguilar",
    "Núñez",
    "Ramos",
    "Cortés",
    "Peña",
    "León",
    "Silva",
    "Ibáñez",
    "Vicente",
    "Calvo",
    "Cuevas",
    "Parra",
    "Moya",
    "Vidal",
    "Redondo",
    "Estévez",
    "Garrido",
    "Molina",
]
_CIUDADES_CP = [
    ("Madrid", "28001"),
    ("Madrid", "28010"),
    ("Madrid", "28045"),
    ("Barcelona", "08001"),
    ("Barcelona", "08015"),
    ("Barcelona", "08030"),
    ("Valencia", "46001"),
    ("Valencia", "46018"),
    ("Sevilla", "41001"),
    ("Sevilla", "41013"),
    ("Zaragoza", "50001"),
    ("Zaragoza", "50010"),
    ("Málaga", "29001"),
    ("Málaga", "29013"),
    ("Murcia", "30001"),
    ("Bilbao", "48001"),
    ("Alicante", "03001"),
    ("Valladolid", "47001"),
    ("Granada", "18001"),
    ("Córdoba", "14001"),
    ("Palma", "07001"),
    ("Las Palmas", "35001"),
    ("Santander", "39001"),
    ("San Sebastián", "20001"),
]
_CALLES = [
    "Gran Vía",
    "Paseo de la Castellana",
    "Calle Alcalá",
    "Calle Mayor",
    "Avenida de la Constitución",
    "Rambla de Catalunya",
    "Passeig de Gràcia",
    "Calle Colón",
    "Calle Serrano",
    "Avenida de América",
    "Calle del Prado",
    "Calle Velázquez",
    "Gran Vía de les Corts",
    "Calle de la Paz",
    "Avenida Diagonal",
    "Calle Princesa",
    "Calle Fuencarral",
    "Avenida del Mediterráneo",
    "Calle Toledo",
    "Calle San Fernando",
]
_DESCRIPCIONES_ALBARAN = [
    "Renovación completa del salón",
    "Equipo dormitorio matrimonio",
    "Mobiliario despacho en casa",
    "Reforma habitación juvenil",
    "Decoración piso nuevo",
    "Complementos recibidor y pasillo",
    "Cambio de dormitorio principal",
    "Muebles terraza verano",
    "Reposición mobiliario tras mudanza",
    "Regalo boda - equipo cocina/comedor",
    "Segunda vivienda vacacional",
    "Actualización muebles de cocina",
    "Mobiliario zona de trabajo",
    "Sofá y butaca para el salón",
    "Juego de dormitorio infantil",
    "Reforma integral dormitorio principal",
    "Compra puntual artículo único",
]


def _gen_dni(existing: set) -> str:
    letras = "TRWAGMYFPDXBNJZSQVHLCKE"
    while True:
        numero = random.randint(10_000_000, 99_999_999)
        dni = f"{numero}{letras[numero % 23]}"
        if dni not in existing:
            existing.add(dni)
            return dni


# ---------------------------------------------------------------------------
# Limpiar
# ---------------------------------------------------------------------------
def _wipe(db: Session):
    """Elimina todos los datos en el orden correcto (FK) para dejar la BD limpia."""
    db.query(DeliveryNoteLineDB).delete()
    db.query(DeliveryNoteDB).delete()
    db.query(MovementDB).delete()
    db.query(ProductDB).delete()
    db.query(CustomerDB).delete()
    db.query(SupplierDB).delete()
    db.commit()


# ---------------------------------------------------------------------------
# Insertar proveedores y productos
# ---------------------------------------------------------------------------
def _insert_providers_and_products(db: Session):
    prov_objs = []
    for nombre, contacto in PROVEEDORES:
        p = SupplierDB(name=nombre, contact=contacto)
        db.add(p)
        prov_objs.append(p)
    db.flush()  # obtener IDs

    for nombre, desc, precio, prov_idx in PRODUCTOS:
        db.add(
            ProductDB(
                name=nombre,
                description=desc,
                price=float(precio),
                supplier_id=prov_objs[prov_idx].id,
            )
        )
    db.commit()


# ---------------------------------------------------------------------------
# Insertar clientes
# ---------------------------------------------------------------------------
def _insert_clients(db: Session, n: int = 100) -> list:
    used_emails: set = set()
    used_dnis: set = set()
    clients = []

    for i in range(n):
        nombre = _NOMBRES[i % len(_NOMBRES)]
        apellido = _APELLIDOS[i % len(_APELLIDOS)]
        # apellido compuesto para el 40% de los clientes
        if random.random() < 0.4:
            apellido2 = _APELLIDOS[(i + 7) % len(_APELLIDOS)]
            apellidos = f"{apellido} {apellido2}"
        else:
            apellidos = apellido

        # email único
        slug = f"{nombre.lower().replace(' ', '')}.{apellidos.split()[0].lower()}"
        email = f"{slug}@gmail.com"
        counter = 1
        while email in used_emails:
            email = f"{slug}{counter}@gmail.com"
            counter += 1
        used_emails.add(email)

        ciudad, cp = random.choice(_CIUDADES_CP)
        c = CustomerDB(
            name=nombre,
            surnames=apellidos,
            dni=_gen_dni(used_dnis),
            email=email,
            phone1=f"6{random.randint(10, 99)}{random.randint(100000, 999999)}",
            phone2=f"9{random.randint(10, 99)}{random.randint(100000, 999999)}"
            if random.random() < 0.35
            else None,
            street=random.choice(_CALLES),
            house_number=str(random.randint(1, 150)),
            floor_entrance=random.choice(
                ["1ºA", "1ºB", "2ºA", "2ºB", "3ºA", "3ºC", "Bajo", "Ático"]
            )
            if random.random() < 0.55
            else None,
            city=ciudad,
            postal_code=cp,
        )
        db.add(c)
        clients.append(c)

    db.flush()
    return clients


# ---------------------------------------------------------------------------
# Insertar albaranes y movimientos asociados
# ---------------------------------------------------------------------------
def _insert_orders(db: Session, clients: list):
    products = db.query(ProductDB).all()

    # Distribución de albaranes por cliente (1, 2 o 3)
    shuffled = clients[:]
    random.shuffle(shuffled)
    three_set = {c.id for c in shuffled[:10]}  # 10 clientes con 3 albaranes
    two_set = {c.id for c in shuffled[10:40]}  # 30 clientes con 2 albaranes
    # resto: 1 albarán

    today = date.today()

    for cli in clients:
        n_alb = 3 if cli.id in three_set else (2 if cli.id in two_set else 1)
        for _ in range(n_alb):
            dias = random.randint(0, 700)
            fecha = today - timedelta(days=dias)

            # Distribución realista de estados: predomina ENTREGADO para histórico
            r = random.random()
            if dias > 365:
                estado = "ENTREGADO" if r < 0.85 else "ALMACEN"
            elif dias > 90:
                r2 = random.random()
                if r2 < 0.40:
                    estado = "ENTREGADO"
                elif r2 < 0.65:
                    estado = "ALMACEN"
                elif r2 < 0.82:
                    estado = "RUTA"
                else:
                    estado = "FIANZA"
            else:
                r3 = random.random()
                if r3 < 0.30:
                    estado = "FIANZA"
                elif r3 < 0.55:
                    estado = "ALMACEN"
                elif r3 < 0.75:
                    estado = "RUTA"
                else:
                    estado = "ENTREGADO"

            alb = DeliveryNoteDB(
                date=fecha,
                description=random.choice(_DESCRIPCIONES_ALBARAN),
                customer_id=cli.id,
                total=0.0,
                status=estado,
            )
            db.add(alb)
            db.flush()

            n_lineas = random.randint(1, 5)
            prods_elegidos = random.sample(products, min(n_lineas, len(products)))
            total = 0.0
            for prod in prods_elegidos:
                cant = random.randint(1, 3)
                db.add(
                    DeliveryNoteLineDB(
                        delivery_note_id=alb.id,
                        product_id=prod.id,
                        quantity=cant,
                        unit_price=float(prod.price),
                    )
                )
                total += cant * float(prod.price)

            alb.total = round(total, 2)

            # Movimiento de fianza (30%) siempre al crear
            fianza = round(alb.total * 0.30, 2)
            db.add(
                MovementDB(
                    date=fecha,
                    description=f"Fianza albarán #{alb.id}",
                    amount=fianza,
                    type="INGRESO",
                )
            )

            # Si entregado → movimiento del resto pendiente
            if estado == "ENTREGADO":
                pendiente = round(alb.total - fianza, 2)
                if pendiente > 0:
                    fecha_entrega = fecha + timedelta(days=random.randint(3, 45))
                    if fecha_entrega > today:
                        fecha_entrega = today
                    db.add(
                        MovementDB(
                            date=fecha_entrega,
                            description=f"Cobro albarán #{alb.id} (pendiente)",
                            amount=pendiente,
                            type="INGRESO",
                        )
                    )

    # Gastos operativos verosímiles (proveedores, suministros, transporte)
    gastos = [
        ("Factura Muebles Rivera S.L. — reposición stock", 4200.0),
        ("Factura Nordic Home Supplies — pedido trimestral", 3150.0),
        ("Factura Dormitorios Premium S.L. — colecciones nuevas", 2890.0),
        ("Factura Madera Noble Ibérica — madera estructura", 1740.0),
        ("Factura Textil Decoración Hogar — tejidos temporada", 1100.0),
        ("Factura Colchones Descanso Plus — reposición almacén", 2300.0),
        ("Alquiler almacén — enero 2026", 850.0),
        ("Alquiler almacén — febrero 2026", 850.0),
        ("Gestión flota transporte — enero 2026", 1200.0),
        ("Gestión flota transporte — febrero 2026", 1200.0),
        ("Publicidad online — Google Ads Q1", 600.0),
        ("Suministro eléctrico almacén — enero", 310.0),
        ("Suministro eléctrico almacén — febrero", 295.0),
        ("Seguro responsabilidad civil anual", 780.0),
        ("Servicio mantenimiento web y ERP", 480.0),
        ("Materiales embalaje — compra trimestral", 220.0),
        ("Factura Europa Mueble Import — importación colección", 5400.0),
        ("Factura DesignPro Contract — pedido corporativo", 3200.0),
        ("Gestoría y asesoría fiscal — enero 2026", 350.0),
        ("Gestoría y asesoría fiscal — febrero 2026", 350.0),
    ]
    for i, (concepto, cantidad) in enumerate(gastos):
        dias_egreso = random.randint(5, 400)
        db.add(
            MovementDB(
                date=today - timedelta(days=dias_egreso),
                description=concepto,
                amount=float(cantidad),
                type="EGRESO",
            )
        )

    db.commit()


# ---------------------------------------------------------------------------
# Punto de entrada
# ---------------------------------------------------------------------------
def seed(db: Session):
    """Inserta los datos de demostración solo si la base de datos está vacía."""
    # Ensure default admin user always exists
    if not db.query(UserDB).filter_by(username="admin").first():
        db.add(
            UserDB(
                username="admin",
                hashed_password=_pwd_context.hash("admin123"),
                role="admin",
                is_active=True,
            )
        )
        db.commit()
        log.info("Usuario admin creado (admin/admin123).")

    if db.query(SupplierDB).count() > 0:
        log.info("Seed omitido: la base de datos ya contiene datos.")
        return

    _insert_providers_and_products(db)
    clients = _insert_clients(db, n=100)
    db.flush()
    _insert_orders(db, clients)
    log.info(
        "Seed completado: %d proveedores, %d productos, "
        "100 clientes, albaranes y movimientos generados.",
        len(PROVEEDORES),
        len(PRODUCTOS),
    )
