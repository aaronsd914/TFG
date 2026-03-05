"""Tests para /api/albaranes — creación, listado, estado, rutas relacionadas."""
from datetime import date
import pytest
from unittest.mock import patch


@pytest.fixture(autouse=True)
def mock_email_y_pdf():
    """Neutraliza el envío de email y la generación de PDF en TODOS los tests
    de este módulo.  Así no se realizan conexiones SMTP ni se intenta renderizar
    un PDF durante la ejecución de la suite."""
    with patch("backend.app.api.albaranes.send_email_with_pdf", return_value=None), \
         patch("backend.app.api.albaranes.generar_pdf_albaran", return_value=b""), \
         patch("backend.app.api.albaranes.render", return_value="<html></html>"):
        yield


# ── Helpers ──────────────────────────────────────────────────────────────────
def payload_albaran(cliente_id, producto_id, fecha="2026-03-01", estado="FIANZA"):
    return {
        "fecha": fecha,
        "descripcion": "Test albarán",
        "cliente_id": cliente_id,
        "items": [{"producto_id": producto_id, "cantidad": 2, "precio_unitario": 5.0}],
        "estado": estado,
        "registrar_fianza": True,
    }


def crear_albaran(client, cliente_id, producto_id, **kwargs):
    return client.post("/api/albaranes/post", json=payload_albaran(cliente_id, producto_id, **kwargs))


# ── Tests ─────────────────────────────────────────────────────────────────────
class TestCrearAlbaran:
    def test_crear_con_cliente_existente(self, client, cliente_fixture, producto):
        r = crear_albaran(client, cliente_fixture["id"], producto["id"])
        assert r.status_code == 200
        body = r.json()
        assert body["total"] == 10.0
        assert body["estado"] == "FIANZA"
        assert body["cliente_id"] == cliente_fixture["id"]

    def test_crear_con_cliente_nuevo_inline(self, client, producto):
        r = client.post("/api/albaranes/post", json={
            "fecha": "2026-03-01",
            "cliente": {
                "nombre": "Nuevo",
                "apellidos": "Cliente",
                "dni": "99999999Z",
                "email": "nuevo@test.com",
            },
            "items": [{"producto_id": producto["id"], "cantidad": 1, "precio_unitario": 10.0}],
        })
        assert r.status_code == 200
        assert r.json()["total"] == 10.0

    def test_crear_sin_cliente_devuelve_400(self, client, producto):
        r = client.post("/api/albaranes/post", json={
            "fecha": "2026-03-01",
            "items": [{"producto_id": producto["id"], "cantidad": 1, "precio_unitario": 10.0}],
        })
        assert r.status_code == 400

    def test_crear_producto_inexistente_devuelve_404(self, client, cliente_fixture):
        r = client.post("/api/albaranes/post", json={
            "fecha": "2026-03-01",
            "cliente_id": cliente_fixture["id"],
            "items": [{"producto_id": 9999, "cantidad": 1, "precio_unitario": 5.0}],
        })
        assert r.status_code == 404

    def test_crea_movimiento_fianza_automaticamente(self, client, cliente_fixture, producto):
        crear_albaran(client, cliente_fixture["id"], producto["id"])
        movimientos = client.get("/api/movimientos/get").json()
        fianzas = [m for m in movimientos if "Fianza albarán" in m["concepto"]]
        assert len(fianzas) == 1
        # Fianza = 30% del total (10.0 * 0.30 = 3.0)
        assert fianzas[0]["cantidad"] == 3.0

    def test_fianza_personalizada(self, client, cliente_fixture, producto):
        r = client.post("/api/albaranes/post", json={
            **payload_albaran(cliente_fixture["id"], producto["id"]),
            "fianza_cantidad": 2.0,
        })
        assert r.status_code == 200
        movimientos = client.get("/api/movimientos/get").json()
        fianzas = [m for m in movimientos if "Fianza albarán" in m["concepto"]]
        assert fianzas[0]["cantidad"] == 2.0


class TestListarAlbaranes:
    def test_listar_vacio(self, client):
        assert client.get("/api/albaranes/get").json() == []

    def test_listar_con_datos(self, client, cliente_fixture, producto):
        crear_albaran(client, cliente_fixture["id"], producto["id"])
        r = client.get("/api/albaranes/get")
        assert len(r.json()) == 1

    def test_obtener_por_id(self, client, cliente_fixture, producto):
        aid = crear_albaran(client, cliente_fixture["id"], producto["id"]).json()["id"]
        r = client.get(f"/api/albaranes/get/{aid}")
        assert r.status_code == 200
        assert r.json()["id"] == aid

    def test_obtener_inexistente(self, client):
        assert client.get("/api/albaranes/get/9999").status_code == 404

    def test_albaranes_por_cliente(self, client, cliente_fixture, producto):
        crear_albaran(client, cliente_fixture["id"], producto["id"])
        r = client.get(f"/api/albaranes/by-cliente/{cliente_fixture['id']}")
        assert r.status_code == 200
        assert len(r.json()) == 1

    def test_albaranes_por_cliente_sin_albaranes(self, client, cliente_fixture):
        r = client.get(f"/api/albaranes/by-cliente/{cliente_fixture['id']}")
        assert r.status_code == 200
        assert r.json() == []


class TestEstadoAlbaran:
    def test_cambiar_a_entregado(self, client, cliente_fixture, producto):
        aid = crear_albaran(client, cliente_fixture["id"], producto["id"]).json()["id"]
        r = client.patch(f"/api/albaranes/{aid}/estado", json={"estado": "ENTREGADO"})
        assert r.status_code == 200
        assert r.json()["estado"] == "ENTREGADO"

    def test_estado_invalido(self, client, cliente_fixture, producto):
        aid = crear_albaran(client, cliente_fixture["id"], producto["id"]).json()["id"]
        r = client.patch(f"/api/albaranes/{aid}/estado", json={"estado": "ALMACEN"})
        assert r.status_code == 400

    def test_entregado_registra_cobro_pendiente(self, client, cliente_fixture, producto):
        """Al entregar un albarán, si queda pendiente de cobro se crea un movimiento."""
        aid = crear_albaran(client, cliente_fixture["id"], producto["id"]).json()["id"]
        client.patch(f"/api/albaranes/{aid}/estado", json={"estado": "ENTREGADO"})
        movimientos = client.get("/api/movimientos/get").json()
        pendientes = [m for m in movimientos if "pendiente" in m["concepto"]]
        assert len(pendientes) == 1
        # total=10, fianza=3 → pendiente=7
        assert pendientes[0]["cantidad"] == 7.0

    def test_cambiar_estado_inexistente(self, client):
        r = client.patch("/api/albaranes/9999/estado", json={"estado": "ENTREGADO"})
        assert r.status_code == 404
