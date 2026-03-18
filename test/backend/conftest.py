"""
conftest.py — Fixtures compartidos para todos los tests del backend.

Usa SQLite en memoria para no necesitar PostgreSQL arrancado.
El motor de la app se parchea ANTES de importar main para evitar
que el lifespan intente conectarse a PostgreSQL.
El seed se neutraliza para que cada test empiece con la BD vacía.
"""
import pytest
from unittest.mock import patch
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# ── Motor SQLite en memoria compartido (StaticPool = misma conexión siempre) ─
SQLITE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLITE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

# Habilitar foreign keys en SQLite (por defecto están desactivadas)
from sqlalchemy import event  # noqa: E402

@event.listens_for(engine, "connect")
def _enable_foreign_keys(dbapi_connection, _):
    dbapi_connection.execute("PRAGMA foreign_keys=ON")
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# ── Parchear el módulo database ANTES de importar la app ────────────────────
import backend.app.database as _db_module  # noqa: E402
_db_module.engine = engine
_db_module.SessionLocal = TestingSessionLocal

# Ahora ya es seguro importar la app (el lifespan usará el engine de SQLite)
from fastapi.testclient import TestClient  # noqa: E402
from backend.app.database import Base, get_db  # noqa: E402
from backend.app.main import app  # noqa: E402

# Forzar importación de todos los modelos para que Base.metadata quede completo
import backend.app.entidades.albaran        # noqa: F401
import backend.app.entidades.albaran_ruta   # noqa: F401
import backend.app.entidades.cliente        # noqa: F401
import backend.app.entidades.linea_albaran  # noqa: F401
import backend.app.entidades.movimiento     # noqa: F401
import backend.app.entidades.producto       # noqa: F401
import backend.app.entidades.proveedor      # noqa: F401
import backend.app.entidades.stripe_checkout  # noqa: F401
import backend.app.entidades.usuario        # noqa: F401

from backend.app.entidades.usuario import UsuarioDB
from backend.app.dependencies import get_current_user
from backend.app.utils.jwt_utils import create_access_token


# ── Override de get_db ───────────────────────────────────────────────────────
def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


# ── Fixtures ─────────────────────────────────────────────────────────────────
@pytest.fixture(autouse=True)
def setup_db():
    """Crea todas las tablas antes de cada test y las borra al terminar."""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def admin_user(setup_db):
    """Inserta un usuario admin en la BD de prueba y devuelve el objeto ORM."""
    db = TestingSessionLocal()
    user = UsuarioDB(username="admin", hashed_password="hashed", role="admin", is_active=True)
    db.add(user)
    db.commit()
    db.refresh(user)
    db.close()
    return user


@pytest.fixture()
def auth_headers(admin_user):
    """Cabeceras HTTP con token JWT válido para el usuario admin."""
    token = create_access_token({"sub": admin_user.username, "role": admin_user.role})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def client(setup_db, admin_user, auth_headers):
    """TestClient con BD sobreescrita, seed desactivado y usuario admin cargado."""
    app.dependency_overrides[get_db] = override_get_db
    # Bypass de get_current_user para que los tests existentes no necesiten token
    app.dependency_overrides[get_current_user] = lambda: admin_user
    # Neutralizamos el seed para que la BD empiece vacía en cada test
    with patch("backend.app.main.seed", return_value=None):
        with TestClient(app, raise_server_exceptions=True) as c:
            yield c
    app.dependency_overrides.clear()


# ── Helpers reutilizables ────────────────────────────────────────────────────
@pytest.fixture()
def proveedor(client):
    """Crea un proveedor de prueba y devuelve su JSON."""
    r = client.post("/api/proveedores/post", json={"nombre": "Proveedor Test", "contacto": "600000000"})
    assert r.status_code == 200
    return r.json()


@pytest.fixture()
def producto(client, proveedor):
    """Crea un producto de prueba vinculado al proveedor fixture."""
    r = client.post("/api/productos/post", json={
        "nombre": "Producto Test",
        "descripcion": "Descripción de prueba",
        "precio": 10.0,
        "proveedor_id": proveedor["id"],
    })
    assert r.status_code == 200
    return r.json()


@pytest.fixture()
def cliente_fixture(client):
    """Crea un cliente de prueba y devuelve su JSON."""
    r = client.post("/api/clientes/post", json={
        "nombre": "Juan",
        "apellidos": "García",
        "dni": "12345678A",
        "email": "juan@test.com",
    })
    assert r.status_code == 200
    return r.json()
