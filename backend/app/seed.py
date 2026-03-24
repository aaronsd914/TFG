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
from backend.app.entidades.stripe_checkout import StripeCheckoutDB
from passlib.context import CryptContext

_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

log = logging.getLogger("seed")

random.seed(42)  # Reproducible entre reinicios

# ---------------------------------------------------------------------------
# Proveedores (5)
# ---------------------------------------------------------------------------
PROVEEDORES = [
    ("Muebles Rivera S.L.", "pedro.rivera@mueblesrivera.es"),
    ("Nordic Home Supplies", "ventas@nordichome.eu"),
    ("OfiComfort España", "comercial@oficomfort.es"),
    ("Madera Noble Ibérica S.A.", "pedidos@maderannoble.es"),
    ("Dormitorios Premium S.L.", "ventas@dormitoriospremium.es"),
]

# ---------------------------------------------------------------------------
# Productos – 200 (nombre, descripción, precio, índice proveedor 0-4)
# ---------------------------------------------------------------------------
PRODUCTOS = [
    # ── Muebles Rivera S.L. (0) ── 40 productos ─────────────────────────────
    (
        "Sofá Chester 3 plazas",
        "Sofá clásico capitoné terciopelo azul marino, patas doradas",
        1350.0,
        0,
    ),
    (
        "Sofá rinconera Modena",
        "Rinconera modular tejido gris marengo con chaise longue reversible",
        1890.0,
        0,
    ),
    (
        "Butaca relax Volterra",
        "Butaca reclinable eléctrica cuero envejecido marrón",
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
        "Chaiselongue tapizada lino beige, pies madera natural",
        640.0,
        0,
    ),
    ("Sofá 2 plazas Nápoles", "Sofá compacto tela antimanchas gris", 590.0, 0),
    (
        "Sofá orejero Chesterfield cognac",
        "Butaca orejera Chesterfield cuero genuino cognac",
        780.0,
        0,
    ),
    (
        "Sofá modular Milano 4 módulos",
        "Composición modular 4 piezas, tela borreguillo gris",
        2200.0,
        0,
    ),
    (
        "Butaca giratoria Barcelona",
        "Butaca de diseño giratoria, tapizado bouclé crema",
        670.0,
        0,
    ),
    (
        "Sofá cama Santiago 160",
        "Sofá cama matrimonio con arcón de almacenaje",
        1050.0,
        0,
    ),
    (
        "Chaiselongue eléctrica Amalfi",
        "Chaiselongue reclinable eléctrica, USB integrado",
        890.0,
        0,
    ),
    (
        "Sofá 3 plazas Valencia velvet",
        "Sofá terciopelo verde esmeralda, patas acero negro",
        1120.0,
        0,
    ),
    (
        "Sillón relax manual León",
        "Sillón reclinable manual palanca lateral, cuero negro",
        430.0,
        0,
    ),
    (
        "Sofá rinconera Florencia XL",
        "Rinconera XXL 5 plazas tejido gris oscuro, reposacabezas ajustables",
        2480.0,
        0,
    ),
    ("Sofá 2 plazas Toscana", "Sofá compacto elegante terciopelo mostaza", 720.0, 0),
    (
        "Puf otomano cuadrado Verona",
        "Puf 70×70 cm cuero PU negro, con bandeja incluida",
        195.0,
        0,
    ),
    (
        "Sillón Chester wing azul",
        "Sillón orejero capitoné en tela azul petróleo",
        560.0,
        0,
    ),
    (
        "Sofá esquinero Brindisi reversible",
        "Esquinero reversible tejido antimanchas antracita",
        1340.0,
        0,
    ),
    (
        "Butaca Marsella giratoria",
        "Butaca giratoria 360° con reposapiés desmontable",
        490.0,
        0,
    ),
    (
        "Sofá cama compacto Liguria",
        "Sofá 3 plazas con cama 120 cm, mecanismo clic-clac",
        830.0,
        0,
    ),
    (
        "Chaiselongue Palermo izq.",
        "Chaiselongue lado izquierdo tejido arena, cojines incluidos",
        710.0,
        0,
    ),
    ("Sofá 4 plazas Rimini", "Sofá XL 290 cm tela microfibra gris", 1580.0, 0),
    (
        "Sillón masajeador Relax Pro",
        "Sillón masajeador 9 programas, calor lumbar, cuero negro",
        620.0,
        0,
    ),
    (
        "Sofá nórdico Venecia compacto",
        "Sofá 2 plazas nórdico patas madera, tejido gris perla",
        660.0,
        0,
    ),
    (
        "Puf baúl almacenaje 100cm",
        "Puf baúl apertura frontal, 100×40 cm, tejido gris",
        245.0,
        0,
    ),
    (
        "Sofá esquinero Sicilia R",
        "Rinconera derecha 5 plazas, cuero PU marrón",
        1760.0,
        0,
    ),
    ("Butaca Mónaco vintage", "Butaca estilo vintage tapizado lino natural", 385.0, 0),
    (
        "Sofá 3+2 Nápoles set",
        "Conjunto sofá 3 plazas y 2 plazas coordinados, tela gris",
        1290.0,
        0,
    ),
    (
        "Silla longue Ravena",
        "Tumbona interior madera de haya, tapizado lino beige",
        380.0,
        0,
    ),
    (
        "Sofá modular Bolonia Plus",
        "Sistema modular 6 piezas configurables, tejido azul navy",
        2850.0,
        0,
    ),
    (
        "Sofá tatami bajo Roma",
        "Sofá estilo japandi bajo al suelo, cojines intercambiables",
        770.0,
        0,
    ),
    (
        "Butaca Córdoba con reposapiés",
        "Butaca con ottomán coordinado en cuero cognac",
        510.0,
        0,
    ),
    (
        "Sofá biplaza Ferrara slim",
        "Sofá estrecho 145 cm ideal pasillos, tejido beige",
        495.0,
        0,
    ),
    (
        "Puf pelota gigante XL",
        "Puf esfera Ø100 cm relleno EPS, funda lavable gris",
        135.0,
        0,
    ),
    (
        "Sofá cama Génova 160 Plus",
        "Sofá cama matrimonial 160 cm con somier lamelar",
        1100.0,
        0,
    ),
    (
        "Esquinero Palena modular",
        "Esquinero en tejido borreguillo blanco roto, 4 módulos",
        1950.0,
        0,
    ),
    (
        "Sillón orejero Parma cuero",
        "Sillón orejero cuero genuino negro, patas nogal",
        640.0,
        0,
    ),
    (
        "Sofá 3 plazas Lecce gris",
        "Sofá tejido gris marengo, cojines lumbares incluidos",
        875.0,
        0,
    ),
    (
        "Butaca relax Trieste 360",
        "Butaca giratoria 360° reclinable manual, cuero PU",
        480.0,
        0,
    ),
    (
        "Sofá modular Bérgamo 3P",
        "Módulos independientes 3 piezas, tejido azul celeste",
        1420.0,
        0,
    ),
    # ── Nordic Home Supplies (1) ── 40 productos ─────────────────────────────
    (
        "Mesa comedor extensible Fjord",
        "Mesa roble macizo extensible 140-220 cm, 8 comensales",
        920.0,
        1,
    ),
    ("Mesa auxiliar Björk", "Mesita nórdica abedul con bandeja extraíble", 135.0, 1),
    (
        "Escritorio Oslo Compact",
        "Escritorio 120 cm cajonera integrada fresno blanco",
        340.0,
        1,
    ),
    (
        "Mesa centro Lund elevable",
        "Mesa de centro elevable roble, tapa cristal antirrayaduras",
        295.0,
        1,
    ),
    (
        "Estantería Stavanger 5 baldas",
        "Librería modular pino lacado blanco, 80×195 cm",
        210.0,
        1,
    ),
    (
        "Mesa reuniones ovalada 10P",
        "Mesa 300×120 cm laminado wengué, patas metálicas",
        1850.0,
        1,
    ),
    (
        "Mesa TV flotante Uppsala",
        "Mueble TV suspendido 150 cm con puertas correderas, roble",
        390.0,
        1,
    ),
    (
        "Mesa escritorio esquinero Bergen",
        "Escritorio en L laminado blanco, soporte CPU incluido",
        385.0,
        1,
    ),
    (
        "Mesa bar alta Tampere 2 plazas",
        "Mesa alta 80×80 cm pino y estructura acero",
        220.0,
        1,
    ),
    (
        "Mesa plegable Turku 120",
        "Mesa comedor plegable 120 cm abedul, ideal espacios pequeños",
        175.0,
        1,
    ),
    (
        "Estantería flotante Kalmar x3",
        "Set 3 baldas flotantes roble 60 cm, soportes ocultos",
        95.0,
        1,
    ),
    (
        "Mesa consola nórdica 120 cm",
        "Consola delgada roble con un cajón central",
        265.0,
        1,
    ),
    (
        "Mesa auxiliar esquinero Eskilstuna",
        "Mesa rincón triangular pino blanco, 75 cm",
        115.0,
        1,
    ),
    (
        "Mesa escritorio Linköping 140",
        "Escritorio amplio 140×70 cm, tablero roble, patas horquilla",
        420.0,
        1,
    ),
    (
        "Mesa comedor redonda Örebro 120",
        "Mesa redonda 120 cm roble macizo, base cruzada",
        750.0,
        1,
    ),
    (
        "Mesa auxiliar apilable Luleå x2",
        "Set 2 mesas apilables pino natural, alturas 45/55 cm",
        145.0,
        1,
    ),
    (
        "Mesa comedor mármol Göteborg",
        "Mesa 180 cm tapa mármol Carrara, patas acero inox",
        1680.0,
        1,
    ),
    (
        "Mesa escritorio salud Umeå",
        "Mesa elevable eléctrica 120×60 cm, roble, 3 alturas memoria",
        680.0,
        1,
    ),
    (
        "Mesa de cocina Borås",
        "Mesa 140 cm madera de pino con cajón integrado",
        310.0,
        1,
    ),
    (
        "Estantería escalera Rosskär 5P",
        "Estantería escalera asimétrica roble natural, 5 baldas",
        199.0,
        1,
    ),
    (
        "Mesa nido Härnösand x3",
        "Set 3 mesas nido roble, almacenamiento compacto",
        220.0,
        1,
    ),
    (
        "Mesa centro redonda Sundsvall",
        "Mesa 90 cm base cruzada pino blanco con bandeja inferior",
        185.0,
        1,
    ),
    (
        "Mesa escritorio Skövde pliegue",
        "Escritorio plegable de pared 90 cm, carpetón con ganchos",
        210.0,
        1,
    ),
    (
        "Mesa comedor industrial Gävle",
        "Mesa 200 cm tablero pino encerado, patas horquilla acero negro",
        840.0,
        1,
    ),
    (
        "Mesa oval jardín Helsingborg",
        "Mesa 180 cm resina tejida color blanco, 8 plazas",
        560.0,
        1,
    ),
    (
        "Mesa alta cocina Ystad",
        "Mesa alta 60×60 cm pino macizo, 4 taburetes incluidos",
        380.0,
        1,
    ),
    (
        "Mesa reuniones circular Västerås",
        "Mesa 120 cm redonda pied tulip, tablero laminado blanco",
        490.0,
        1,
    ),
    (
        "Mesa plegable pared Falun",
        "Mesa abatible pared 60×90 cm, madera de roble barnizado",
        165.0,
        1,
    ),
    (
        "Mesa comedor Kristianstad vintage",
        "Mesa 160 cm pino macizo envejecido, patas torneadas",
        670.0,
        1,
    ),
    (
        "Estantería cube Skellefteå 9 módulos",
        "Sistema 9 cubos combinables lacados blanco, 110×110 cm",
        290.0,
        1,
    ),
    (
        "Mesa de centro Norrköping hexagonal",
        "Mesa hexagonal 80 cm, roble macizo, patas palillo negro",
        265.0,
        1,
    ),
    (
        "Mesa TV suelo Trollhättan 180",
        "Mueble TV bajo 180 cm, 2 cajones y 2 puertas, roble",
        470.0,
        1,
    ),
    (
        "Mesa escritorio Vänersborg Kids",
        "Escritorio infantil 100 cm regulable en altura, pino blanco",
        220.0,
        1,
    ),
    (
        "Mesa comedor Borlänge extens.",
        "Mesa extensible 120-180 cm contrachapado roble con detalle negro",
        610.0,
        1,
    ),
    (
        "Mesa auxiliar cubo Piteå",
        "Mesita cubo 40×40 cm fresno natural, 2 alturas disponibles",
        85.0,
        1,
    ),
    (
        "Estantería bibliofilia Karlskrona",
        "Librería alta 5×2 módulos abiertos lacados gris",
        380.0,
        1,
    ),
    (
        "Mesa comedor piedra Nacka",
        "Mesa 160 cm tapa piedra sinterizada, patas acero carbono",
        1240.0,
        1,
    ),
    (
        "Mesa escritorio esquinero Motala",
        "Escritorio esquinero 160×120 cm, tablero blanco, ruedas",
        450.0,
        1,
    ),
    (
        "Mesa plegable multiusos Östersund",
        "Mesa plegable 180×90 cm, superficie laminada blanca",
        155.0,
        1,
    ),
    (
        "Mesa alta bistró Arvika",
        "Mesa bistro alta 70 cm Ø con asiento giratorio plegable",
        210.0,
        1,
    ),
    # ── OfiComfort España (2) ── 40 productos ────────────────────────────────
    (
        "Silla ejecutiva TechPro 600",
        "Dirección con reposacabezas y soporte lumbar ajustable",
        420.0,
        2,
    ),
    ("Silla operativa ErgoNet", "Malla transpirable, brazos 4D regulables", 280.0, 2),
    (
        "Silla de visitas Confort Plus",
        "Apilable salas reuniones, asiento acolchado",
        95.0,
        2,
    ),
    (
        "Silla gaming Racing XL",
        "Gaming con soporte lumbar y reposapiés extensible",
        310.0,
        2,
    ),
    (
        "Taburete elevable OfiBar",
        "Taburete pie cromado, asiento regulable cocina u oficina",
        115.0,
        2,
    ),
    (
        "Silla plegable Slim",
        "Plegable espacios polivalentes, carga máx. 120 kg",
        55.0,
        2,
    ),
    (
        "Silla ergonómica Hara Plus",
        "Ergonómica premium con soporte pélvico activo, malla",
        580.0,
        2,
    ),
    (
        "Silla de dirección Presidente XL",
        "Dirección XL con reposapiés retráctil, cuero genuino negro",
        750.0,
        2,
    ),
    (
        "Silla confidente eco cuero",
        "Visitas 4 patas, asiento eco-cuero negro, apilable x4",
        145.0,
        2,
    ),
    (
        "Silla reuniones giratorias Zoom",
        "Giratoria sin brazos, ruedas blanda, malla gris",
        195.0,
        2,
    ),
    (
        "Taburete de bar Nordic",
        "Taburete madera haya y asiento tapizado gris 75 cm",
        95.0,
        2,
    ),
    (
        "Silla apilable polipropileno Color",
        "Apilable PP en 4 colores, uso interior/exterior",
        38.0,
        2,
    ),
    (
        "Silla gaming Titan Pro Negro",
        "Gaming ajustable 360°, apoyabrazos 4D, base 5 ruedas",
        420.0,
        2,
    ),
    (
        "Silla escritorio júnior Estudio",
        "Silla juvenil regulable, reposabrazos ajustables",
        98.0,
        2,
    ),
    (
        "Silla ejecutiva Málaga",
        "Cuero PU negro, cabecero estándar, base aluminio pulido",
        360.0,
        2,
    ),
    (
        "Taburete giratorio sin respaldo Rondo",
        "Taburete ajustable 45-65 cm, asiento acolchado negro",
        88.0,
        2,
    ),
    (
        "Silla activa Bambach",
        "Silla de montura para corrección postural en oficina",
        490.0,
        2,
    ),
    (
        "Silla operativa LightMesh",
        "Malla transpirable ultraligera, brazos abatibles",
        210.0,
        2,
    ),
    (
        "Silla de visitas apilable Aran 4P",
        "Pack 4 sillas metálicas negro con asiento vinilo negro",
        280.0,
        2,
    ),
    (
        "Silla Eames réplica blanco",
        "Réplica Eames polipropileno blanco, patas madera haya",
        115.0,
        2,
    ),
    (
        "Taburete ajustable Atelier alto",
        "Taburete de trabajo 55-85 cm, reposapiés integrado",
        135.0,
        2,
    ),
    (
        "Silla de espera 3 plazas Fix",
        "Banco espera 3 asientos acero cromado, asiento tapizado azul",
        195.0,
        2,
    ),
    (
        "Silla recepción Aura giratoria",
        "Recepcionista giratoria sin brazos, eco-cuero blanco",
        230.0,
        2,
    ),
    (
        "Silla de ducha plegable Care",
        "Silla ducha aluminio anodizado, antideslizante, 120 kg",
        68.0,
        2,
    ),
    (
        "Silla alta regulable Stool Pro",
        "Taburete ergonómico 60-80 cm con respaldo lumbar",
        175.0,
        2,
    ),
    (
        "Silla ejecutiva Bilbao cuero blanco",
        "Ejecutiva cuero premium blanco, base cromada",
        520.0,
        2,
    ),
    (
        "Silla operativa Krak mesh",
        "Operativa malla azul, ruedas ruido-silencioso",
        245.0,
        2,
    ),
    (
        "Silla secretaria Compact S",
        "Compacta sin apoyabrazos, altura 38-50 cm, polipropileno",
        72.0,
        2,
    ),
    (
        "Silla Knoll réplica blanca",
        "Réplica silla Knoll plástico blanco patas acero inox",
        140.0,
        2,
    ),
    (
        "Silla balancín Kneeling ergonómica",
        "Balancín de rodillas ergonómico, funda lavable negro",
        190.0,
        2,
    ),
    (
        "Taburete madera maciza vintage",
        "Taburete 45 cm madera de olmo macizo natural",
        78.0,
        2,
    ),
    (
        "Silla operativa NeoFlex Plus",
        "HD lumbar continuo, brazos 3D, ruedas blandas parquet",
        315.0,
        2,
    ),
    (
        "Silla comedor acero Milán",
        "Estructura acero cromado, asiento cuero PU negro",
        135.0,
        2,
    ),
    (
        "Silla gaming RGB VR Pro",
        "Gaming RGB integrado, ajuste ángulo respaldo 90-170°",
        370.0,
        2,
    ),
    (
        "Silla visitante cuero Madrid",
        "Cuero marrón cognac 4 patas, metalico, sin ruedas",
        178.0,
        2,
    ),
    (
        "Taburete cuero alto Premium",
        "Taburete cuero genuino negro, base giratoria cromada 75 cm",
        245.0,
        2,
    ),
    (
        "Silla diseño Tulip réplica",
        "Diseño Tulip, ABS blanco, pie aluminio pulido",
        185.0,
        2,
    ),
    (
        "Silla asistencial Rehab Plus",
        "Silla con apoyabrazos elevables certificada EN 12520",
        320.0,
        2,
    ),
    (
        "Silla lectura bucket Lima",
        "Silla bucket bucket bajo estudio, terciopelo verde",
        165.0,
        2,
    ),
    (
        "Silla de director cine outdoor",
        "Silla director plegable mariposa, lona beige marcos roble",
        95.0,
        2,
    ),
    # ── Madera Noble Ibérica S.A. (3) ── 40 productos ────────────────────────
    (
        "Armario ropero Formentera 3P",
        "3 puertas correderas con espejo, interior equipado",
        1150.0,
        3,
    ),
    ("Cómoda Guadalquivir 6 cajones", "120 cm pino macizo, acabado natural", 320.0, 3),
    ("Zapatero Marbella 18 pares", "3 puertas abatibles blanco mate", 185.0, 3),
    (
        "Aparador Ebro 3 puertas",
        "Rústico roble envejecido con herrajes de forja",
        710.0,
        3,
    ),
    (
        "Vitrina Alhambra cristal LED",
        "2 puertas iluminación LED interior, 90×195 cm",
        590.0,
        3,
    ),
    ("Librería Segura 7 módulos", "Sistema modular combinable roble oscuro", 460.0, 3),
    (
        "Estantería industrial loft 5B",
        "Tubo negro y tablero madera, 180×200 cm",
        210.0,
        3,
    ),
    (
        "Armario vestidor rincón Guadalupe",
        "Armario esquinero abierto 80×80×180 cm, pino blanco",
        540.0,
        3,
    ),
    (
        "Cómoda vintage Castellón 4 cajones",
        "Cómoda pintada a mano, motivos florales",
        380.0,
        3,
    ),
    (
        "Armario escobero Huelva",
        "Armario escobero alto 2 puertas 55×35×180 cm, DM blanco",
        195.0,
        3,
    ),
    (
        "Zapatero banco entrada Almería",
        "Banco zapatero 3 compartimentos abiertos, pino natural",
        145.0,
        3,
    ),
    (
        "Aparador bajo salón Tajo 2P",
        "Aparador bajo 2 puertas correderas, tablero roble claro",
        350.0,
        3,
    ),
    (
        "Armario ropero 2 puertas Cádiz",
        "2 puertas abisagradas espejo, interior barra + balda",
        780.0,
        3,
    ),
    (
        "Cómoda Asturias 3 cajones",
        "Cómoda estrecha 80 cm, 3 cajones ancho, pino encerado",
        270.0,
        3,
    ),
    (
        "Librería mural Segovia 8 cubos",
        "8 cubos abiertos combinables, lacado gris claro",
        320.0,
        3,
    ),
    (
        "Armario colonial Extremadura 4P",
        "4 puertas madera maciza con incrustaciones de caoba recuperada",
        1350.0,
        3,
    ),
    (
        "Aparador bodega Rioja",
        "Mueble vinoteca 12 botellas + 2 cajones, roble oscuro",
        480.0,
        3,
    ),
    (
        "Estantería garaje acero 5 alturas",
        "Estantería metálica 180×90×40 cm, carga 150 kg/balda",
        145.0,
        3,
    ),
    (
        "Cómoda baño 3 cajones Nerja",
        "Cómoda auxiliar baño 80 cm, lacado blanco brillo, soft-close",
        290.0,
        3,
    ),
    (
        "Armario zapatero giró Tarifa 16P",
        "Zapatero giratorio 16 pares, pino y espejo frontal",
        215.0,
        3,
    ),
    (
        "Estantería rústica Badajoz 6B",
        "6 baldas hierro y madera pino encerado",
        285.0,
        3,
    ),
    (
        "Aparador vitrina Évora",
        "Aparador 2 puertas ciegas + 2 con cristal, cerezo",
        830.0,
        3,
    ),
    (
        "Cómoda tocador Sigüenza",
        "Tocador 100 cm con espejo ovalado incluido, pino blanco",
        410.0,
        3,
    ),
    (
        "Armario infantil Bosque 3P",
        "3 puertas pintadas motivos bosque, 120 cm",
        490.0,
        3,
    ),
    (
        "Librería mural Salamanca escalera",
        "Librería escalera reversible 5 estantes, blanco/roble",
        215.0,
        3,
    ),
    (
        "Armario baño suspendido Portimão",
        "Mueble bajo lavabo 80 cm 2 cajones, lacado blanco",
        310.0,
        3,
    ),
    (
        "Aparador rústico medieval Ávila",
        "Aparador 3 puertas talladas a mano, encina maciza",
        960.0,
        3,
    ),
    (
        "Cómoda industrial Sagunto 5C",
        "5 cajones marco metálico negro, interior roble",
        445.0,
        3,
    ),
    (
        "Estantería flotante rústica Zamora x4",
        "Set 4 baldas flotantes madera de pino macizo encerado 80 cm",
        155.0,
        3,
    ),
    (
        "Armario ropero Pamplona 6P",
        "6 puertas correderas espejo completo 270 cm, interior modular",
        1690.0,
        3,
    ),
    (
        "Cómoda Córdoba 8 cajones",
        "150 cm madera maciza nogal, tiradores dorados",
        680.0,
        3,
    ),
    (
        "Aparador rincón Zaragoza",
        "Aparador esquinero 3 puertas, DM blanco liso, patas cónicas",
        380.0,
        3,
    ),
    (
        "Armario Kit Cuenca ensamble",
        "Armario 180 cm para montar, pino lacado blanco",
        295.0,
        3,
    ),
    (
        "Librería Valladolid 4×2 módulos",
        "8 módulos open roble claro con 4 puertas abatibles",
        420.0,
        3,
    ),
    (
        "Estantería herramienta Teruel 7B",
        "Estantería taller 7 baldas ajustables, acero galvanizado",
        175.0,
        3,
    ),
    (
        "Aparador rústico Segovia 2 cajones",
        "Aparador macizo 140 cm pino encerado, 2 cajones + 2 puertas",
        550.0,
        3,
    ),
    (
        "Cómoda blanca provenzal Ronda",
        "Cómoda 100 cm pintada blanco envejecido, 4 cajones",
        360.0,
        3,
    ),
    (
        "Armario señora Gijón 5P",
        "5 puertas batientes, interior con 3 módulos, roble natural",
        1280.0,
        3,
    ),
    (
        "Librería gigante Alcalá 3m",
        "Composición 3 módulos Torre 200 cm cada uno, lacado blanco",
        870.0,
        3,
    ),
    (
        "Estantería escalera duo Burgos",
        "Estantería escalera 2 uni. simétricas roble+negro",
        340.0,
        3,
    ),
    # ── Dormitorios Premium S.L. (4) ── 40 productos ─────────────────────────
    (
        "Cama tapizada Élite 150",
        "150×190 cabecero acolchado terciopelo gris grafito",
        1100.0,
        4,
    ),
    (
        "Cama con cajones Dalia 90",
        "90×190 con 4 cajones y somier láminas incluido",
        540.0,
        4,
    ),
    (
        "Cabecero tapizado Ágora 160",
        "160 cm herradura, tela bouclé color arena",
        245.0,
        4,
    ),
    (
        "Mesita noche flotante Box",
        "Mesita suspendida con cajón y estante, roble claro",
        165.0,
        4,
    ),
    (
        "Mesita noche Triana 2 cajones",
        "Madera maciza, 2 cajones con cierre suave",
        130.0,
        4,
    ),
    (
        "Colchón viscoelástico Noche 150",
        "150×190 cm núcleo viscoelástico 5 cm, firmeza media",
        490.0,
        4,
    ),
    (
        "Colchón muelles ensacados Sueño 150",
        "150×190 cm 1000 muelles independientes más viscoelástico",
        680.0,
        4,
    ),
    (
        "Colchón látex Natural 135",
        "135×190 cm látex 100% natural, certificado Oeko-Tex",
        590.0,
        4,
    ),
    (
        "Topper viscoelástico 5 cm 150",
        "Topper adaptable 150×190 cm para renovar colchón",
        149.0,
        4,
    ),
    (
        "Almohada cervical Memory",
        "Almohada ergonómica viscoelástica, certificada ortopédica",
        65.0,
        4,
    ),
    (
        "Somier articulado eléctrico 150",
        "Elevable motor silencioso mando Bluetooth",
        720.0,
        4,
    ),
    (
        "Cama de diseño Venezia King 180",
        "180×200 cabecero madera lacada, somier listo",
        1750.0,
        4,
    ),
    (
        "Cama canapé rústica Rouen 135",
        "Canapé 135×190 roble macizo, altura 42 cm",
        890.0,
        4,
    ),
    (
        "Cabecero tapizado Kensington 150",
        "150 cm capitoné botones terciopelo antelope",
        310.0,
        4,
    ),
    (
        "Cama evolutiva Nube 70×140",
        "Infantil 70×140 cm convertible cama 140×190",
        420.0,
        4,
    ),
    (
        "Colchón viscoelástico 90 cm",
        "90×190 cm firmeza media, funda desenfundable",
        320.0,
        4,
    ),
    (
        "Somier madera láminas 150",
        "Somier 150×190 pino macizo 28 láminas flexibles",
        185.0,
        4,
    ),
    (
        "Cama infantil Estrella 90",
        "Cama 90 cm con protectores incluidos, pino blanco",
        350.0,
        4,
    ),
    (
        "Cama nido juvenil 90+90",
        "Cama nido 2×90 extraíble con 4 cajones en total",
        680.0,
        4,
    ),
    (
        "Colchón HR Super 135",
        "Espuma HR 30 kg/m³ bicara, 24 cm total, funda 3D",
        370.0,
        4,
    ),
    (
        "Mesita tocador Hollywood 100",
        "Tocador 100 cm espejo guirnalda, 3 cajones, blanco",
        390.0,
        4,
    ),
    (
        "Cama tapizada Bruma 135 gris",
        "135×190 cabecero bajo tapizado gris perla, patas acero",
        780.0,
        4,
    ),
    (
        "Cama de madera maciza Pirineos 150",
        "150×190 madera de pino macizo natural, estilo rústico",
        650.0,
        4,
    ),
    (
        "Cabecero panel nórdico Helston 180",
        "180 cm tablero tapizado 4 módulos, terciopelo azul",
        420.0,
        4,
    ),
    (
        "Edredón nórdico 400g Polar 150",
        "Plumón sintético 400 g/m², cama 150, reversible",
        135.0,
        4,
    ),
    (
        "Colchón infantil Cool Kids 90",
        "90×190 bienestar infantil, núcleo HR + viscoelástico top",
        240.0,
        4,
    ),
    (
        "Cama abatible horizontal Zeus 90",
        "Cama abatible pared 90 cm con escritorio integrado",
        1100.0,
        4,
    ),
    (
        "Mesita noche industrial Quito",
        "Mesita tubo negro + tablero roble natural, 1 cajón",
        148.0,
        4,
    ),
    (
        "Somier tapizado Ronda 150",
        "Somier tapizado clic 150×190, tejido gris grafito",
        295.0,
        4,
    ),
    (
        "Cama con baúl Denver 150",
        "150×190 con superficie acolchada y baúl 200 L",
        920.0,
        4,
    ),
    (
        "Colchón Spring Luxury 150",
        "150×190 muelles ensacados + látex + viscoelástico, 28 cm",
        850.0,
        4,
    ),
    (
        "Cabecero madera flotante Goa 160",
        "160 cm macizo roble oscuro montaje oculto",
        295.0,
        4,
    ),
    (
        "Cama tapizada Oasis 90 junior",
        "90 cm cabecero redondeado, tela antimanchas azul",
        395.0,
        4,
    ),
    (
        "Almohada plumón natural 90 cm",
        "Plumón natural 3 cámaras 90 cm, certificado Responsible Down",
        88.0,
        4,
    ),
    (
        "Colchón HR Transpirable Brisa 150",
        "150×190 fundas 3D muy transpirables, 18 cm, HR",
        420.0,
        4,
    ),
    (
        "Cama madera Almería 135 cajones",
        "135×190 roble con 6 cajones frontales, tablero MDF",
        760.0,
        4,
    ),
    (
        "Somier nórdico Oslo 135 láminas",
        "Somier 135×190 haya maciza 25 láminas Flex",
        165.0,
        4,
    ),
    (
        "Cama de forja clásica Sevilla 150",
        "Cama 150×190 forja pintada negro, diseño clásico",
        590.0,
        4,
    ),
    (
        "Colchón cervical Ortopédica 150",
        "Colchón premium ortopédico 150 cm, 5 zonas, firmeza alta",
        760.0,
        4,
    ),
    (
        "Cama nórdica box spring Copenhague",
        "Box spring 150×200 con sommier integrado, tapizado gris",
        1380.0,
        4,
    ),
]

# ---------------------------------------------------------------------------
# Clientes – 150
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
    "Enrique",
    "Mónica",
    "Ricardo",
    "Lorena",
    "Borja",
    "Natalia",
    "Emilio",
    "Verónica",
    "Ignacio",
    "Rosa",
    "Fernando",
    "Amparo",
    "Roberto",
    "Mercedes",
    "Alberto",
    "Lola",
    "Pere",
    "Mireia",
    "Jordi",
    "Sandra",
    "Xavi",
    "Núria",
    "Martí",
    "Montserrat",
    "Toni",
    "Assumpta",
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
    "Herrera",
    "Jiménez",
    "Muñoz",
    "Giménez",
    "Llorente",
    "Casado",
    "Gil",
    "Fuentes",
    "Cabrera",
    "Pascual",
]
_CIUDADES_CP = [
    ("Madrid", "28001"),
    ("Madrid", "28010"),
    ("Madrid", "28045"),
    ("Madrid", "28020"),
    ("Madrid", "28034"),
    ("Barcelona", "08001"),
    ("Barcelona", "08015"),
    ("Barcelona", "08030"),
    ("Valencia", "46001"),
    ("Valencia", "46018"),
    ("Sevilla", "41001"),
    ("Sevilla", "41013"),
    ("Zaragoza", "50001"),
    ("Málaga", "29001"),
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
    ("Toledo", "45001"),
    ("Salamanca", "37001"),
    ("Burgos", "09001"),
    ("Cáceres", "10001"),
    ("Albacete", "02001"),
    ("Logroño", "26001"),
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
    "Calle Larios",
    "Avenida Alfonso XIII",
    "Calle Real",
    "Paseo del Parque",
    "Avenida de Andalucía",
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
    "Regalo boda — equipo cocina/comedor",
    "Segunda vivienda vacacional",
    "Actualización muebles de cocina",
    "Mobiliario zona de trabajo",
    "Sofá y butaca para el salón",
    "Juego de dormitorio infantil",
    "Reforma integral dormitorio principal",
    "Compra puntual artículo único",
    "Equipamiento sala de estar completo",
    "Muebles dormitorio invitados",
    "Renovación comedor y zona office",
    "Terraza y jardín primavera",
    "Dormitorio juvenil completo",
    "Muebler oficina en casa",
    "Complementos dormitorio principal",
    "Salón y comedor integrado",
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
    db.query(StripeCheckoutDB).delete()
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
    db.flush()

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
def _insert_clients(db: Session, n: int = 150) -> list:
    used_emails: set = set()
    used_dnis: set = set()
    clients = []

    for i in range(n):
        nombre = _NOMBRES[i % len(_NOMBRES)]
        apellido1 = _APELLIDOS[i % len(_APELLIDOS)]
        apellido2 = _APELLIDOS[(i * 3 + 7) % len(_APELLIDOS)]
        # apellido compuesto siempre para mayor realismo
        apellidos = f"{apellido1} {apellido2}"

        slug = (
            nombre.lower()
            .replace("á", "a")
            .replace("é", "e")
            .replace("í", "i")
            .replace("ó", "o")
            .replace("ú", "u")
            .replace("ñ", "n")
            .replace(" ", "")
        )
        slug2 = (
            apellido1.lower()
            .replace("á", "a")
            .replace("é", "e")
            .replace("í", "i")
            .replace("ó", "o")
            .replace("ú", "u")
            .replace("ñ", "n")
        )
        email = f"{slug}.{slug2}@gmail.com"
        counter = 1
        while email in used_emails:
            email = f"{slug}.{slug2}{counter}@gmail.com"
            counter += 1
        used_emails.add(email)

        ciudad, cp = _CIUDADES_CP[i % len(_CIUDADES_CP)]
        c = CustomerDB(
            name=nombre,
            surnames=apellidos,
            dni=_gen_dni(used_dnis),
            email=email,
            phone1=f"6{random.randint(10, 99)}{random.randint(100000, 999999)}",
            phone2=(
                f"9{random.randint(10, 99)}{random.randint(100000, 999999)}"
                if random.random() < 0.35
                else None
            ),
            street=_CALLES[i % len(_CALLES)],
            house_number=str(random.randint(1, 180)),
            floor_entrance=random.choice(
                ["1ºA", "1ºB", "2ºA", "2ºB", "3ºA", "3ºC", "Bajo", "Ático", "4ºD"]
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
# Helpers para _insert_orders
# ---------------------------------------------------------------------------
def _pick_estado(dias_transcurridos: int) -> str:
    """Devuelve un estado de albarán coherente con su antigüedad."""
    r = random.random()
    if dias_transcurridos > 180:
        if r < 0.75:
            return "ENTREGADO"
        if r < 0.90:
            return "ALMACEN"
        return "RUTA"
    if dias_transcurridos > 60:
        if r < 0.50:
            return "ENTREGADO"
        if r < 0.70:
            return "RUTA"
        if r < 0.85:
            return "ALMACEN"
        return "FIANZA"
    # Reciente → más en proceso
    if r < 0.35:
        return "FIANZA"
    if r < 0.60:
        return "ALMACEN"
    if r < 0.80:
        return "RUTA"
    return "ENTREGADO"


def _add_albaran_lines(db: Session, alb: DeliveryNoteDB, products: list) -> float:
    """Añade líneas al albarán y devuelve el total redondeado."""
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
    return round(total, 2)


def _albaran_movements(
    alb: DeliveryNoteDB, cli, fecha: date, estado: str, today: date
) -> list:
    """Genera los movimientos (fianza, transporte, pendiente) para un albarán."""
    fianza = round(alb.total * 0.30, 2)
    pendiente = round(alb.total - fianza, 2)
    movs = [
        MovementDB(
            date=fecha,
            description=f"Fianza albarán #{alb.id} — {cli.name} {cli.surnames}",
            amount=fianza,
            type="INGRESO",
        )
    ]
    if estado in ("RUTA", "ENTREGADO"):
        fecha_ruta = min(fecha + timedelta(days=random.randint(3, 20)), today)
        movs.append(
            MovementDB(
                date=fecha_ruta,
                description=f"Cobro transporte albarán #{alb.id}",
                amount=round(random.uniform(35.0, 120.0), 2),
                type="INGRESO",
            )
        )
    if estado == "ENTREGADO" and pendiente > 0:
        fecha_entrega = min(fecha + timedelta(days=random.randint(5, 45)), today)
        movs.append(
            MovementDB(
                date=fecha_entrega,
                description=f"Cobro pendiente albarán #{alb.id} — {cli.name} {cli.surnames}",
                amount=pendiente,
                type="INGRESO",
            )
        )
    return movs


def _gastos_fijos_movements() -> list:
    """Devuelve los movimientos de gastos operativos fijos del periodo."""
    entries = [
        # Proveedores (reposición stock)
        (
            "Factura Muebles Rivera S.L. — reposición stock jun 2025",
            4200.0,
            date(2025, 6, 5),
        ),
        (
            "Factura Nordic Home Supplies — pedido trimestral Q3 2025",
            3150.0,
            date(2025, 7, 2),
        ),
        (
            "Factura Dormitorios Premium S.L. — colección otoño",
            2890.0,
            date(2025, 9, 10),
        ),
        (
            "Factura Madera Noble Ibérica — estructura armarios",
            1740.0,
            date(2025, 8, 15),
        ),
        ("Factura OfiComfort España — reposición sillas", 2100.0, date(2025, 10, 3)),
        (
            "Factura Muebles Rivera S.L. — reposición stock oct 2025",
            5100.0,
            date(2025, 10, 20),
        ),
        (
            "Factura Nordic Home Supplies — pedido trimestral Q4 2025",
            2800.0,
            date(2025, 11, 5),
        ),
        (
            "Factura Dormitorios Premium S.L. — colección invierno",
            3400.0,
            date(2025, 12, 1),
        ),
        (
            "Factura Madera Noble Ibérica — madera maciza enero",
            1950.0,
            date(2026, 1, 10),
        ),
        (
            "Factura OfiComfort España — sillas ergonómicas enero",
            1800.0,
            date(2026, 1, 22),
        ),
        (
            "Factura Muebles Rivera S.L. — reposición stock feb 2026",
            4600.0,
            date(2026, 2, 8),
        ),
        ("Factura Nordic Home Supplies — pedido Q1 2026", 3200.0, date(2026, 3, 3)),
        # Alquiler
        ("Alquiler almacén — jun 2025", 850.0, date(2025, 6, 1)),
        ("Alquiler almacén — jul 2025", 850.0, date(2025, 7, 1)),
        ("Alquiler almacén — ago 2025", 850.0, date(2025, 8, 1)),
        ("Alquiler almacén — sep 2025", 850.0, date(2025, 9, 1)),
        ("Alquiler almacén — oct 2025", 850.0, date(2025, 10, 1)),
        ("Alquiler almacén — nov 2025", 850.0, date(2025, 11, 1)),
        ("Alquiler almacén — dic 2025", 850.0, date(2025, 12, 1)),
        ("Alquiler almacén — ene 2026", 880.0, date(2026, 1, 1)),
        ("Alquiler almacén — feb 2026", 880.0, date(2026, 2, 1)),
        ("Alquiler almacén — mar 2026", 880.0, date(2026, 3, 1)),
        # Transporte/flota
        ("Gestión flota transporte — jun-ago 2025", 1200.0, date(2025, 8, 31)),
        ("Gestión flota transporte — sep 2025", 420.0, date(2025, 9, 30)),
        ("Gestión flota transporte — oct 2025", 390.0, date(2025, 10, 31)),
        ("Gestión flota transporte — nov 2025", 410.0, date(2025, 11, 30)),
        ("Gestión flota transporte — dic 2025", 380.0, date(2025, 12, 31)),
        ("Gestión flota transporte — ene 2026", 430.0, date(2026, 1, 31)),
        ("Gestión flota transporte — feb 2026", 415.0, date(2026, 2, 28)),
        ("Gestión flota transporte — mar 2026", 400.0, date(2026, 3, 20)),
        # Suministros
        ("Suministro eléctrico almacén — Q3 2025", 890.0, date(2025, 9, 5)),
        ("Suministro eléctrico almacén — Q4 2025", 950.0, date(2025, 12, 5)),
        ("Suministro eléctrico almacén — ene 2026", 310.0, date(2026, 1, 7)),
        ("Suministro eléctrico almacén — feb 2026", 295.0, date(2026, 2, 7)),
        # Marketing y servicios
        ("Publicidad online — Google Ads Q3 2025", 600.0, date(2025, 9, 30)),
        ("Publicidad online — Google Ads Q4 2025", 750.0, date(2025, 12, 30)),
        ("Publicidad online — Google Ads Q1 2026", 600.0, date(2026, 3, 15)),
        ("Seguro responsabilidad civil anual 2025", 780.0, date(2025, 6, 15)),
        ("Seguro responsabilidad civil anual 2026", 810.0, date(2026, 1, 15)),
        ("Servicio mantenimiento web y ERP — Q3 2025", 480.0, date(2025, 9, 30)),
        ("Servicio mantenimiento web y ERP — Q4 2025", 480.0, date(2025, 12, 31)),
        ("Servicio mantenimiento web y ERP — Q1 2026", 500.0, date(2026, 3, 20)),
        ("Materiales embalaje — compra Q3 2025", 220.0, date(2025, 7, 20)),
        ("Materiales embalaje — compra Q4 2025", 240.0, date(2025, 10, 18)),
        ("Materiales embalaje — compra Q1 2026", 230.0, date(2026, 2, 12)),
        # Gestoría
        ("Gestoría y asesoría fiscal — Q3 2025", 350.0, date(2025, 9, 15)),
        ("Gestoría y asesoría fiscal — Q4 2025", 350.0, date(2025, 12, 15)),
        ("Gestoría y asesoría fiscal — ene 2026", 350.0, date(2026, 1, 15)),
        ("Gestoría y asesoría fiscal — feb 2026", 350.0, date(2026, 2, 15)),
        ("Gestoría y asesoría fiscal — mar 2026", 350.0, date(2026, 3, 15)),
    ]
    return [
        MovementDB(date=f, description=desc, amount=float(amt), type="EGRESO")
        for desc, amt, f in entries
    ]


# ---------------------------------------------------------------------------
# Insertar albaranes, líneas y movimientos asociados
# ---------------------------------------------------------------------------
def _insert_orders(db: Session, clients: list):
    products = db.query(ProductDB).all()
    today = date(2026, 3, 24)
    start = date(2025, 6, 1)
    delta_days = (today - start).days

    base = [1] * 150
    for _ in range(400 - 150):
        base[random.randint(0, 149)] += 1

    all_movements: list = []

    for cli, n_alb in zip(clients, base):
        for _ in range(n_alb):
            dias_desde_inicio = random.randint(0, delta_days)
            fecha = start + timedelta(days=dias_desde_inicio)
            estado = _pick_estado((today - fecha).days)

            alb = DeliveryNoteDB(
                date=fecha,
                description=random.choice(_DESCRIPCIONES_ALBARAN),
                customer_id=cli.id,
                total=0.0,
                status=estado,
            )
            db.add(alb)
            db.flush()

            alb.total = _add_albaran_lines(db, alb, products)
            all_movements.extend(_albaran_movements(alb, cli, fecha, estado, today))

    all_movements.extend(_gastos_fijos_movements())

    for mov in all_movements:
        db.add(mov)
    db.commit()


# ---------------------------------------------------------------------------
# Insertar pagos Stripe de demostración
# ---------------------------------------------------------------------------
def _insert_stripe(db: Session):
    """Simula 12 sesiones Stripe completadas a lo largo del periodo."""
    stripe_sessions = [
        (
            "cs_test_a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6",
            "pi_3Qab1ABC001",
            1890.00,
            "Sofá rinconera Modena — pago online",
        ),
        (
            "cs_test_b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7",
            "pi_3Qab2ABC002",
            920.00,
            "Mesa comedor extensible Fjord — pago online",
        ),
        (
            "cs_test_c3D4e5F6g7H8i9J0k1L2m3N4o5P6q7R8",
            "pi_3Qab3ABC003",
            1100.00,
            "Cama tapizada Élite 150 — pago online",
        ),
        (
            "cs_test_d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8S9",
            "pi_3Qab4ABC004",
            490.00,
            "Colchón viscoelástico Noche 150 — pago online",
        ),
        (
            "cs_test_e5F6g7H8i9J0k1L2m3N4o5P6q7R8s9T0",
            "pi_3Qab5ABC005",
            780.00,
            "Sofá orejero Chesterfield cognac — pago online",
        ),
        (
            "cs_test_f6G7h8I9j0K1l2M3n4O5p6Q7r8S9t0U1",
            "pi_3Qab6ABC006",
            340.00,
            "Escritorio Oslo Compact — pago online",
        ),
        (
            "cs_test_g7H8i9J0k1L2m3N4o5P6q7R8s9T0u1V2",
            "pi_3Qab7ABC007",
            1350.00,
            "Armario ropero Formentera 3P — pago online",
        ),
        (
            "cs_test_h8I9j0K1l2M3n4O5p6Q7r8S9t0U1v2W3",
            "pi_3Qab8ABC008",
            680.00,
            "Colchón muelles ensacados Sueño 150 — pago online",
        ),
        (
            "cs_test_i9J0k1L2m3N4o5P6q7R8s9T0u1V2w3X4",
            "pi_3Qab9ABC009",
            590.00,
            "Sofá cama Génova 140 — pago online",
        ),
        (
            "cs_test_j0K1l2M3n4O5p6Q7r8S9t0U1v2W3x4Y5",
            "pi_3Qab0ABC010",
            2100.00,
            "Recepción mostrador curvo — pago online",
        ),
        (
            "cs_test_k1L2m3N4o5P6q7R8s9T0u1V2w3X4y5Z6",
            "pi_3Qab1ABC011",
            420.00,
            "Silla ejecutiva TechPro 600 — pago online",
        ),
        (
            "cs_test_l2M3n4O5p6Q7r8S9t0U1v2W3x4Y5z6A7",
            "pi_3Qab2ABC012",
            1750.00,
            "Cama de diseño Venezia King 180 — pago online",
        ),
    ]

    stripe_dates = [
        date(2025, 7, 14),
        date(2025, 8, 22),
        date(2025, 9, 5),
        date(2025, 10, 11),
        date(2025, 11, 3),
        date(2025, 11, 28),
        date(2025, 12, 15),
        date(2026, 1, 9),
        date(2026, 1, 23),
        date(2026, 2, 7),
        date(2026, 2, 28),
        date(2026, 3, 10),
    ]

    from datetime import datetime as dt

    for i, (session_id, payment_intent, amount, desc) in enumerate(stripe_sessions):
        db.add(
            StripeCheckoutDB(
                session_id=session_id,
                payment_intent_id=payment_intent,
                amount=amount,
                currency="eur",
                description=desc,
                status="paid",
                created_at=dt.combine(stripe_dates[i], dt.min.time()),
            )
        )
        # Movimiento de ingreso asociado al pago Stripe
        db.add(
            MovementDB(
                date=stripe_dates[i],
                description=f"Pago Stripe — {desc}",
                amount=amount,
                type="INGRESO",
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
    clients = _insert_clients(db, n=150)
    db.flush()
    _insert_orders(db, clients)
    _insert_stripe(db)
    log.info(
        "Seed completado: %d proveedores, %d productos, "
        "150 clientes, 400 albaranes, movimientos y pagos Stripe generados.",
        len(PROVEEDORES),
        len(PRODUCTOS),
    )
