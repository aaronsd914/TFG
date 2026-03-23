"""Tests para /api/incidencias — creación, listado, detalle, eliminación."""
from unittest.mock import patch
import pytest


@pytest.fixture(autouse=True)
def mock_email_y_pdf():
    """Neutraliza email y PDF en todos los tests de este módulo."""
    with patch("backend.app.api.albaranes.send_email_with_pdf", return_value=None), \
         patch("backend.app.api.albaranes.generate_delivery_note_pdf", return_value=b""), \
         patch("backend.app.api.albaranes.render", return_value="<html></html>"):
        yield


# ── Helpers ────────────────────────────────────────────────────────────────────

def crear_albaran(client, cliente_id, producto_id, estado="FIANZA"):
    r = client.post("/api/albaranes/post", json={
        "date": "2026-01-15",
        "customer_id": cliente_id,
        "items": [{"product_id": producto_id, "quantity": 2, "unit_price": 5.0}],
        "status": estado,
    })
    assert r.status_code == 200
    return r.json()


def entregar_albaran(client, albaran_id):
    r = client.patch(f"/api/albaranes/{albaran_id}/estado", json={"status": "ENTREGADO"})
    assert r.status_code == 200
    return r.json()


def crear_incidencia(client, albaran_id, descripcion="Problema con el producto."):
    return client.post("/api/incidencias/post", json={
        "albaran_id": albaran_id,
        "descripcion": descripcion,
    })


# ── Tests ──────────────────────────────────────────────────────────────────────

class TestCrearIncidencia:
    def test_crear_incidencia_exitosamente(self, client, cliente_fixture, producto):
        alb = crear_albaran(client, cliente_fixture["id"], producto["id"])
        entregar_albaran(client, alb["id"])
        r = crear_incidencia(client, alb["id"])
        assert r.status_code == 200
        body = r.json()
        assert body["albaran_id"] == alb["id"]
        assert body["descripcion"] == "Problema con el producto."
        assert body["fecha_creacion"] is not None

    def test_crear_incidencia_cambia_estado_albaran_a_incidencia(self, client, cliente_fixture, producto):
        alb = crear_albaran(client, cliente_fixture["id"], producto["id"])
        entregar_albaran(client, alb["id"])
        crear_incidencia(client, alb["id"])
        r = client.get(f"/api/albaranes/get/{alb['id']}")
        assert r.status_code == 200
        assert r.json()["status"] == "INCIDENCIA"

    def test_crear_incidencia_albaran_no_entregado_devuelve_400(self, client, cliente_fixture, producto):
        alb = crear_albaran(client, cliente_fixture["id"], producto["id"])  # status FIANZA
        r = crear_incidencia(client, alb["id"])
        assert r.status_code == 400

    def test_crear_incidencia_albaran_inexistente_devuelve_404(self, client):
        r = crear_incidencia(client, 9999)
        assert r.status_code == 404

    def test_crear_incidencia_almacen_devuelve_400(self, client, cliente_fixture, producto):
        alb = crear_albaran(client, cliente_fixture["id"], producto["id"])
        # Cambiar a ALMACEN vía PUT
        client.put(f"/api/albaranes/put/{alb['id']}", json={"status": "ALMACEN"})
        r = crear_incidencia(client, alb["id"])
        assert r.status_code == 400


class TestListarIncidencias:
    def test_listar_vacio(self, client):
        assert client.get("/api/incidencias/get").json() == []

    def test_listar_con_datos(self, client, cliente_fixture, producto):
        alb = crear_albaran(client, cliente_fixture["id"], producto["id"])
        entregar_albaran(client, alb["id"])
        crear_incidencia(client, alb["id"])
        r = client.get("/api/incidencias/get")
        assert r.status_code == 200
        assert len(r.json()) == 1

    def test_obtener_por_id(self, client, cliente_fixture, producto):
        alb = crear_albaran(client, cliente_fixture["id"], producto["id"])
        entregar_albaran(client, alb["id"])
        inc_id = crear_incidencia(client, alb["id"]).json()["id"]
        r = client.get(f"/api/incidencias/get/{inc_id}")
        assert r.status_code == 200
        assert r.json()["id"] == inc_id

    def test_obtener_inexistente_devuelve_404(self, client):
        assert client.get("/api/incidencias/get/9999").status_code == 404


class TestEliminarIncidencia:
    def test_eliminar_incidencia(self, client, cliente_fixture, producto):
        alb = crear_albaran(client, cliente_fixture["id"], producto["id"])
        entregar_albaran(client, alb["id"])
        inc_id = crear_incidencia(client, alb["id"]).json()["id"]
        r = client.delete(f"/api/incidencias/{inc_id}")
        assert r.status_code == 200
        assert client.get(f"/api/incidencias/get/{inc_id}").status_code == 404

    def test_eliminar_restaura_estado_albaran_a_entregado(self, client, cliente_fixture, producto):
        alb = crear_albaran(client, cliente_fixture["id"], producto["id"])
        entregar_albaran(client, alb["id"])
        inc_id = crear_incidencia(client, alb["id"]).json()["id"]
        client.delete(f"/api/incidencias/{inc_id}")
        r = client.get(f"/api/albaranes/get/{alb['id']}")
        assert r.json()["status"] == "ENTREGADO"

    def test_eliminar_inexistente_devuelve_404(self, client):
        assert client.delete("/api/incidencias/9999").status_code == 404
