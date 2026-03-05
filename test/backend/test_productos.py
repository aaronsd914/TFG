"""Tests para /api/productos — CRUD completo + 409 con albaranes activos."""

PROD_BASE = {
    "nombre": "Tornillo M6",
    "descripcion": "Tornillo métrico M6",
    "precio": 0.50,
    "proveedor_id": None,  # se rellena en cada test usando el fixture
}


def crear(client, proveedor_id):
    return client.post("/api/productos/post", json={**PROD_BASE, "proveedor_id": proveedor_id})


class TestCrearProducto:
    def test_crear_ok(self, client, proveedor):
        r = crear(client, proveedor["id"])
        assert r.status_code == 200
        body = r.json()
        assert body["nombre"] == "Tornillo M6"
        assert body["precio"] == 0.50
        assert "id" in body

    def test_precio_float(self, client, proveedor):
        r = client.post("/api/productos/post", json={
            "nombre": "Tuerca",
            "descripcion": "Tuerca M6",
            "precio": 1.99,
            "proveedor_id": proveedor["id"],
        })
        assert r.status_code == 200
        assert r.json()["precio"] == 1.99


class TestObtenerProductos:
    def test_listar_vacio(self, client):
        assert client.get("/api/productos/get").json() == []

    def test_listar_con_datos(self, client, proveedor):
        crear(client, proveedor["id"])
        r = client.get("/api/productos/get")
        assert len(r.json()) == 1

    def test_obtener_por_id(self, client, proveedor):
        pid = crear(client, proveedor["id"]).json()["id"]
        r = client.get(f"/api/productos/get/{pid}")
        assert r.status_code == 200
        assert r.json()["id"] == pid

    def test_obtener_inexistente(self, client):
        assert client.get("/api/productos/get/9999").status_code == 404


class TestActualizarProducto:
    def test_actualizar_ok(self, client, proveedor):
        pid = crear(client, proveedor["id"]).json()["id"]
        r = client.put(f"/api/productos/put/{pid}", json={
            "nombre": "Tornillo M8",
            "descripcion": "Actualizado",
            "precio": 1.00,
            "proveedor_id": proveedor["id"],
        })
        assert r.status_code == 200
        assert r.json()["nombre"] == "Tornillo M8"

    def test_actualizar_inexistente(self, client, proveedor):
        r = client.put("/api/productos/put/9999", json={**PROD_BASE, "proveedor_id": proveedor["id"]})
        assert r.status_code == 404


class TestEliminarProducto:
    def test_eliminar_ok(self, client, proveedor):
        pid = crear(client, proveedor["id"]).json()["id"]
        r = client.delete(f"/api/productos/delete/{pid}")
        assert r.status_code == 200
        assert client.get(f"/api/productos/get/{pid}").status_code == 404

    def test_eliminar_inexistente(self, client):
        assert client.delete("/api/productos/delete/9999").status_code == 404

    def test_eliminar_con_albarán_referenciado_devuelve_409(self, client, proveedor, cliente_fixture):
        """Un producto con líneas de albarán activas no puede borrarse (409)."""
        prod = crear(client, proveedor["id"]).json()
        # Crear albarán que use ese producto
        client.post("/api/albaranes/post", json={
            "fecha": "2026-01-01",
            "cliente_id": cliente_fixture["id"],
            "items": [{"producto_id": prod["id"], "cantidad": 1, "precio_unitario": 10.0}],
        })
        r = client.delete(f"/api/productos/delete/{prod['id']}")
        assert r.status_code == 409
