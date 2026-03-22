"""
test_auth.py — Tests del sistema de autenticación JWT.

Cubre:
  1. Login con credenciales correctas → devuelve access_token
  2. Login con contraseña incorrecta → 401
  3. Login con usuario inexistente → 401
  4. /me con token válido → devuelve datos del usuario
  5. Endpoint protegido sin token → 401
  6. Endpoint protegido con token válido → 200
  7. Token manipulado (firma incorrecta) → 401
  8. get_current_user con usuario inactivo → 401
"""
import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from passlib.context import CryptContext

from backend.app.main import app
from backend.app.database import Base, get_db
from backend.app.entidades.usuario import UsuarioDB
from backend.app.dependencies import get_current_user
from backend.app.utils.jwt_utils import create_access_token

from test.backend.conftest import TestingSessionLocal, engine

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ── Fixtures locales ──────────────────────────────────────────────────────────
@pytest.fixture(autouse=True)
def reset_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def db_session():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture()
def usuario_admin(db_session: Session):
    """Usuario admin con contraseña hasheada real."""
    user = UsuarioDB(
        username="admin_test",
        hashed_password=pwd_context.hash("secreto123"),
        role="admin",
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture()
def usuario_inactivo(db_session: Session):
    user = UsuarioDB(
        username="inactivo",
        hashed_password=pwd_context.hash("pass"),
        role="vendedor",
        is_active=False,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


def override_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture()
def raw_client():
    """TestClient SIN override de get_current_user — prueba autenticación real."""
    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides.pop(get_current_user, None)
    with patch("backend.app.main.seed", return_value=None):
        with TestClient(app, raise_server_exceptions=True) as c:
            yield c
    app.dependency_overrides.clear()


# ── Tests ─────────────────────────────────────────────────────────────────────
def test_login_correcto(raw_client, usuario_admin):
    """Login con credenciales correctas devuelve un token."""
    r = raw_client.post(
        "/api/auth/login",
        data={"username": "admin_test", "password": "secreto123"},
    )
    assert r.status_code == 200
    body = r.json()
    assert "access_token" in body
    assert body["token_type"] == "bearer"


def test_login_contrasena_incorrecta(raw_client, usuario_admin):
    """Contraseña errónea devuelve 401."""
    r = raw_client.post(
        "/api/auth/login",
        data={"username": "admin_test", "password": "mala_pass"},
    )
    assert r.status_code == 401


def test_login_usuario_inexistente(raw_client):
    """Usuario que no existe devuelve 401."""
    r = raw_client.post(
        "/api/auth/login",
        data={"username": "nadie", "password": "da_igual"},
    )
    assert r.status_code == 401


def test_me_con_token_valido(raw_client, usuario_admin):
    """GET /api/auth/me con token válido devuelve los datos del usuario."""
    token = create_access_token({"sub": "admin_test", "role": "admin"})
    r = raw_client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    body = r.json()
    assert body["username"] == "admin_test"
    assert body["role"] == "admin"


def test_endpoint_protegido_sin_token(raw_client, usuario_admin):
    """Acceder a un endpoint protegido sin token devuelve 401."""
    r = raw_client.get("/api/clientes/get")
    assert r.status_code == 401


def test_endpoint_protegido_con_token_valido(raw_client, usuario_admin):
    """Acceder a un endpoint protegido con token válido devuelve 200."""
    token = create_access_token({"sub": "admin_test", "role": "admin"})
    r = raw_client.get(
        "/api/clientes/get",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 200


def test_token_manipulado_devuelve_401(raw_client, usuario_admin):
    """Token con firma incorrecta devuelve 401."""
    token = create_access_token({"sub": "admin_test", "role": "admin"})
    bad_token = token[:-4] + "XXXX"
    r = raw_client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {bad_token}"},
    )
    assert r.status_code == 401


def test_usuario_inactivo_devuelve_401(raw_client, usuario_inactivo):
    """Un usuario inactivo no puede autenticarse aunque el token sea válido."""
    token = create_access_token({"sub": "inactivo", "role": "vendedor"})
    r = raw_client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 401


# ── Tests PUT /api/auth/me ────────────────────────────────────────────────────
def test_put_me_cambia_contrasena(raw_client, usuario_admin):
    """PUT /me con contraseña actual correcta y nueva contraseña actualiza el hash."""
    token = create_access_token({"sub": "admin_test", "role": "admin"})
    r = raw_client.put(
        "/api/auth/me",
        json={"current_password": "secreto123", "new_password": "nueva_password_ok"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 200
    assert r.json()["username"] == "admin_test"


def test_put_me_contrasena_actual_incorrecta(raw_client, usuario_admin):
    """PUT /me con contraseña incorrecta devuelve 400."""
    token = create_access_token({"sub": "admin_test", "role": "admin"})
    r = raw_client.put(
        "/api/auth/me",
        json={"current_password": "mala_pass"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 400


def test_put_me_cambia_username(raw_client, usuario_admin):
    """PUT /me con nuevo username disponible lo actualiza correctamente."""
    token = create_access_token({"sub": "admin_test", "role": "admin"})
    r = raw_client.put(
        "/api/auth/me",
        json={"current_password": "secreto123", "new_username": "admin_nuevo"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 200
    assert r.json()["username"] == "admin_nuevo"


def test_put_me_username_en_uso_devuelve_409(raw_client, usuario_admin, db_session):
    """PUT /me con username ya existente devuelve 409 Conflict."""
    otro = UsuarioDB(
        username="otro_usuario",
        hashed_password=pwd_context.hash("pass"),
        role="admin",
        is_active=True,
    )
    db_session.add(otro)
    db_session.commit()
    token = create_access_token({"sub": "admin_test", "role": "admin"})
    r = raw_client.put(
        "/api/auth/me",
        json={"current_password": "secreto123", "new_username": "otro_usuario"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 409


def test_put_me_contrasena_muy_corta_devuelve_422(raw_client, usuario_admin):
    """PUT /me con nueva contraseña < 8 caracteres devuelve 422."""
    token = create_access_token({"sub": "admin_test", "role": "admin"})
    r = raw_client.put(
        "/api/auth/me",
        json={"current_password": "secreto123", "new_password": "corta"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 422


# ── Tests dependencies: token sin 'sub' y require_role ───────────────────────
def test_token_sin_sub_devuelve_401(raw_client, usuario_admin):
    """Token válido pero sin campo 'sub' devuelve 401 (username is None)."""
    token = create_access_token({"role": "admin"})   # sin 'sub'
    r = raw_client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 401


def test_require_role_permite_rol_correcto(raw_client, usuario_admin):
    """require_role permite acceso cuando el usuario tiene el rol requerido."""
    from backend.app.dependencies import require_role
    from backend.app.entidades.usuario import UsuarioDB as U
    user = U(username="x", hashed_password="h", role="admin", is_active=True)
    checker = require_role("admin")
    result = checker(current_user=user)
    assert result is user


def test_require_role_deniega_rol_incorrecto():
    """require_role lanza 403 cuando el rol del usuario no es el requerido."""
    from fastapi import HTTPException
    from backend.app.dependencies import require_role
    from backend.app.entidades.usuario import UsuarioDB as U
    user = U(username="x", hashed_password="h", role="vendedor", is_active=True)
    checker = require_role("admin")
    with pytest.raises(HTTPException) as exc:
        checker(current_user=user)
    assert exc.value.status_code == 403
