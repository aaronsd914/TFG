"""Tests para /api/movimientos â€” CRUD completo."""

MOV_BASE = {
    "date": "2026-01-15",
    "description": "Pago de alquiler",
    "amount": 500.0,
    "type": "EGRESO",
}


def crear(client, data=None):
    return client.post("/api/movimientos/post", json=data or MOV_BASE)


class TestCrearMovimiento:
    def test_crear_ok(self, client):
        r = crear(client)
        assert r.status_code == 200
        body = r.json()
        assert body["description"] == "Pago de alquiler"
        assert body["amount"] == 500.0
        assert body["type"] == "EGRESO"
        assert "id" in body

    def test_crear_ingreso(self, client):
        r = crear(client, {**MOV_BASE, "type": "INGRESO", "description": "Venta"})
        assert r.status_code == 200
        assert r.json()["type"] == "INGRESO"

    def test_tipo_invalido(self, client):
        r = crear(client, {**MOV_BASE, "type": "OTRO"})
        assert r.status_code == 422


class TestObtenerMovimientos:
    def test_listar_vacio(self, client):
        assert client.get("/api/movimientos/get").json() == []

    def test_listar_con_datos(self, client):
        crear(client)
        r = client.get("/api/movimientos/get")
        assert len(r.json()) == 1

    def test_ordenados_por_fecha_desc(self, client):
        crear(client, {**MOV_BASE, "date": "2026-01-01", "description": "Primero"})
        crear(client, {**MOV_BASE, "date": "2026-06-01", "description": "Ãšltimo"})
        r = client.get("/api/movimientos/get").json()
        assert r[0]["description"] == "Ãšltimo"

    def test_obtener_por_id(self, client):
        mid = crear(client).json()["id"]
        r = client.get(f"/api/movimientos/get/{mid}")
        assert r.status_code == 200
        assert r.json()["id"] == mid

    def test_obtener_inexistente(self, client):
        assert client.get("/api/movimientos/get/9999").status_code == 404


class TestActualizarMovimiento:
    def test_actualizar_ok(self, client):
        mid = crear(client).json()["id"]
        r = client.put(f"/api/movimientos/put/{mid}", json={**MOV_BASE, "description": "Actualizado"})
        assert r.status_code == 200
        assert r.json()["description"] == "Actualizado"

    def test_actualizar_inexistente(self, client):
        assert client.put("/api/movimientos/put/9999", json=MOV_BASE).status_code == 404


class TestEliminarMovimiento:
    def test_eliminar_ok(self, client):
        mid = crear(client).json()["id"]
        r = client.delete(f"/api/movimientos/delete/{mid}")
        assert r.status_code == 200
        assert client.get(f"/api/movimientos/get/{mid}").status_code == 404

    def test_eliminar_inexistente(self, client):
        assert client.delete("/api/movimientos/delete/9999").status_code == 404
