"""Tests para /api/albaranes Ã¢â‚¬â€ creaciÃƒÂ³n, listado, estado, rutas relacionadas."""
from datetime import date
import pytest
from unittest.mock import patch


@pytest.fixture(autouse=True)
def mock_email_y_pdf():
    """Neutraliza el envÃƒÂ­o de email y la generaciÃƒÂ³n de PDF en TODOS los tests
    de este mÃƒÂ³dulo.  AsÃƒÂ­ no se realizan conexiones SMTP ni se intenta renderizar
    un PDF durante la ejecuciÃƒÂ³n de la suite."""
    with patch("backend.app.api.albaranes.send_email_with_pdf", return_value=None), \
         patch("backend.app.api.albaranes.generate_delivery_note_pdf", return_value=b""), \
         patch("backend.app.api.albaranes.render", return_value="<html></html>"):
        yield


# Ã¢â€â‚¬Ã¢â€â‚¬ Helpers Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
def payload_albaran(cliente_id, producto_id, fecha="2026-03-01", estado="FIANZA"):
    return {
        "date": fecha,
        "description": "Test albaran",
        "customer_id": cliente_id,
        "items": [{"product_id": producto_id, "quantity": 2, "unit_price": 5.0}],
        "status": estado,
        "registrar_fianza": True,
    }


def crear_albaran(client, cliente_id, producto_id, **kwargs):
    return client.post("/api/albaranes/post", json=payload_albaran(cliente_id, producto_id, **kwargs))


# Ã¢â€â‚¬Ã¢â€â‚¬ Tests Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
class TestCrearAlbaran:
    def test_crear_con_cliente_existente(self, client, cliente_fixture, producto):
        r = crear_albaran(client, cliente_fixture["id"], producto["id"])
        assert r.status_code == 200
        body = r.json()
        assert body["total"] == 10.0
        assert body["status"] == "FIANZA"
        assert body["customer_id"] == cliente_fixture["id"]

    def test_crear_con_cliente_nuevo_inline(self, client, producto):
        r = client.post("/api/albaranes/post", json={
            "date": "2026-03-01",
            "customer": {
                "name": "Nuevo",
                "surnames": "Cliente",
                "dni": "99999999Z",
                "email": "nuevo@test.com",
            },
            "items": [{"product_id": producto["id"], "quantity": 1, "unit_price": 10.0}],
        })
        assert r.status_code == 200
        assert r.json()["total"] == 10.0

    def test_crear_sin_cliente_devuelve_400(self, client, producto):
        r = client.post("/api/albaranes/post", json={
            "date": "2026-03-01",
            "items": [{"product_id": producto["id"], "quantity": 1, "unit_price": 10.0}],
        })
        assert r.status_code == 400

    def test_crear_producto_inexistente_devuelve_404(self, client, cliente_fixture):
        r = client.post("/api/albaranes/post", json={
            "date": "2026-03-01",
            "customer_id": cliente_fixture["id"],
            "items": [{"product_id": 9999, "quantity": 1, "unit_price": 5.0}],
        })
        assert r.status_code == 404

    def test_crea_movimiento_fianza_automaticamente(self, client, cliente_fixture, producto):
        crear_albaran(client, cliente_fixture["id"], producto["id"])
        movimientos = client.get("/api/movimientos/get").json()
        fianzas = [m for m in movimientos if "Fianza albaran" in m["description"]]
        assert len(fianzas) == 1
        # Fianza = 30% del total (10.0 * 0.30 = 3.0)
        assert fianzas[0]["amount"] == 3.0

    def test_fianza_personalizada(self, client, cliente_fixture, producto):
        r = client.post("/api/albaranes/post", json={
            **payload_albaran(cliente_fixture["id"], producto["id"]),
            "deposit_amount": 2.0,
        })
        assert r.status_code == 200
        movimientos = client.get("/api/movimientos/get").json()
        fianzas = [m for m in movimientos if "Fianza albaran" in m["description"]]
        assert fianzas[0]["amount"] == 2.0


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
        r = client.patch(f"/api/albaranes/{aid}/estado", json={"status": "ENTREGADO"})
        assert r.status_code == 200
        assert r.json()["status"] == "ENTREGADO"

    def test_estado_invalido(self, client, cliente_fixture, producto):
        aid = crear_albaran(client, cliente_fixture["id"], producto["id"]).json()["id"]
        r = client.patch(f"/api/albaranes/{aid}/estado", json={"status": "ALMACEN"})
        assert r.status_code == 400

    def test_entregado_registra_cobro_pendiente(self, client, cliente_fixture, producto):
        """Al entregar un albaran, si queda pendiente de cobro se crea un movimiento."""
        aid = crear_albaran(client, cliente_fixture["id"], producto["id"]).json()["id"]
        client.patch(f"/api/albaranes/{aid}/estado", json={"status": "ENTREGADO"})
        movimientos = client.get("/api/movimientos/get").json()
        pendientes = [m for m in movimientos if "pendiente" in m["description"]]
        assert len(pendientes) == 1
        # total=10, fianza=3 Ã¢â€ â€™ pendiente=7
        assert pendientes[0]["amount"] == 7.0

    def test_cambiar_estado_inexistente(self, client):
        r = client.patch("/api/albaranes/9999/estado", json={"status": "ENTREGADO"})
        assert r.status_code == 404


class TestActualizarAlbaran:
    def test_actualizar_descripcion(self, client, cliente_fixture, producto):
        aid = crear_albaran(client, cliente_fixture["id"], producto["id"]).json()["id"]
        r = client.put(f"/api/albaranes/put/{aid}", json={"description": "Nueva descripcion"})
        assert r.status_code == 200
        assert r.json()["description"] == "Nueva descripcion"

    def test_actualizar_estado(self, client, cliente_fixture, producto):
        aid = crear_albaran(client, cliente_fixture["id"], producto["id"]).json()["id"]
        r = client.put(f"/api/albaranes/put/{aid}", json={"status": "ALMACEN"})
        assert r.status_code == 200
        assert r.json()["status"] == "ALMACEN"

    def test_actualizar_fecha(self, client, cliente_fixture, producto):
        aid = crear_albaran(client, cliente_fixture["id"], producto["id"]).json()["id"]
        r = client.put(f"/api/albaranes/put/{aid}", json={"date": "2027-06-15"})
        assert r.status_code == 200
        assert r.json()["date"] == "2027-06-15"

    def test_actualizar_varios_campos_a_la_vez(self, client, cliente_fixture, producto):
        aid = crear_albaran(client, cliente_fixture["id"], producto["id"]).json()["id"]
        r = client.put(f"/api/albaranes/put/{aid}", json={
            "description": "Editado",
            "status": "RUTA",
            "date": "2027-01-01",
        })
        assert r.status_code == 200
        body = r.json()
        assert body["description"] == "Editado"
        assert body["status"] == "RUTA"
        assert body["date"] == "2027-01-01"

    def test_actualizar_albaran_inexistente(self, client):
        r = client.put("/api/albaranes/put/9999", json={"description": "X"})
        assert r.status_code == 404

    def test_actualizar_sin_payload_no_modifica(self, client, cliente_fixture, producto):
        aid = crear_albaran(client, cliente_fixture["id"], producto["id"]).json()["id"]
        original = client.get(f"/api/albaranes/get/{aid}").json()
        r = client.put(f"/api/albaranes/put/{aid}", json={})
        assert r.status_code == 200
        updated = r.json()
        assert updated["status"] == original["status"]
        assert updated["description"] == original["description"]


class TestActualizarLineas:
    def test_reemplazar_lineas(self, client, cliente_fixture, producto):
        aid = crear_albaran(client, cliente_fixture["id"], producto["id"]).json()["id"]
        r = client.put(
            f"/api/albaranes/{aid}/items",
            json={"items": [{"product_id": producto["id"], "quantity": 3, "unit_price": 4.0}]},
        )
        assert r.status_code == 200
        body = r.json()
        assert len(body["items"]) == 1
        assert body["items"][0]["quantity"] == 3
        assert body["items"][0]["unit_price"] == 4.0

    def test_recalculo_total(self, client, cliente_fixture, producto):
        aid = crear_albaran(client, cliente_fixture["id"], producto["id"]).json()["id"]
        r = client.put(
            f"/api/albaranes/{aid}/items",
            json={"items": [{"product_id": producto["id"], "quantity": 5, "unit_price": 10.0}]},
        )
        assert r.status_code == 200
        assert r.json()["total"] == 50.0

    def test_reemplazar_lineas_vacias(self, client, cliente_fixture, producto):
        aid = crear_albaran(client, cliente_fixture["id"], producto["id"]).json()["id"]
        r = client.put(f"/api/albaranes/{aid}/items", json={"items": []})
        assert r.status_code == 200
        body = r.json()
        assert body["items"] == []
        assert body["total"] == 0.0

    def test_reemplazar_lineas_albaran_inexistente(self, client, producto):
        r = client.put(
            "/api/albaranes/9999/items",
            json={"items": [{"product_id": producto["id"], "quantity": 1, "unit_price": 5.0}]},
        )
        assert r.status_code == 404


class TestEnviarEmailAlbaran:
    def test_enviar_email_ok(self, client, cliente_fixture, producto):
        aid = crear_albaran(client, cliente_fixture["id"], producto["id"]).json()["id"]
        r = client.post(f"/api/albaranes/{aid}/send-email")
        assert r.status_code == 200
        assert r.json() == {"detail": "Email en cola"}

    def test_enviar_email_albaran_inexistente(self, client):
        r = client.post("/api/albaranes/9999/send-email")
        assert r.status_code == 404


class TestEliminarAlbaran:
    def test_eliminar_ok(self, client, cliente_fixture, producto):
        aid = crear_albaran(client, cliente_fixture["id"], producto["id"]).json()["id"]
        r = client.delete(f"/api/albaranes/delete/{aid}")
        assert r.status_code == 200
        assert r.json() == {"ok": True}

    def test_eliminar_inexistente_devuelve_404(self, client):
        r = client.delete("/api/albaranes/delete/9999")
        assert r.status_code == 404

    def test_eliminar_borra_de_listado(self, client, cliente_fixture, producto):
        aid = crear_albaran(client, cliente_fixture["id"], producto["id"]).json()["id"]
        client.delete(f"/api/albaranes/delete/{aid}")
        listado = client.get("/api/albaranes/get").json()
        assert all(a["id"] != aid for a in listado)
