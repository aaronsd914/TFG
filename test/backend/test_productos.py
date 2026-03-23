"""Tests for /api/productos -- CRUD complete + 409 with active delivery notes."""

PROD_BASE = {
    "name": "Tornillo M6",
    "description": "Tornillo metrico M6",
    "price": 0.50,
    "supplier_id": None,  # filled per test using the fixture
}


def crear(client, proveedor_id):
    return client.post("/api/productos/post", json={**PROD_BASE, "supplier_id": proveedor_id})

class TestCrearProducto:
    def test_crear_ok(self, client, proveedor):
        r = crear(client, proveedor["id"])
        assert r.status_code == 200
        body = r.json()
        assert body["name"] == "Tornillo M6"
        assert body["price"] == 0.50
        assert "id" in body

    def test_precio_float(self, client, proveedor):
        r = client.post("/api/productos/post", json={
            "name": "Tuerca",
            "description": "Tuerca M6",
            "price": 1.99,
            "supplier_id": proveedor["id"],
        })
        assert r.status_code == 200
        assert r.json()["price"] == 1.99


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
            "name": "Tornillo M8",
            "description": "Actualizado",
            "price": 1.00,
            "supplier_id": proveedor["id"],
        })
        assert r.status_code == 200
        assert r.json()["name"] == "Tornillo M8"

    def test_actualizar_inexistente(self, client, proveedor):
        r = client.put("/api/productos/put/9999", json={**PROD_BASE, "supplier_id": proveedor["id"]})
        assert r.status_code == 404


class TestEliminarProducto:
    def test_eliminar_ok(self, client, proveedor):
        pid = crear(client, proveedor["id"]).json()["id"]
        r = client.delete(f"/api/productos/delete/{pid}")
        assert r.status_code == 200
        assert client.get(f"/api/productos/get/{pid}").status_code == 404

    def test_eliminar_inexistente(self, client):
        assert client.delete("/api/productos/delete/9999").status_code == 404

    def test_eliminar_con_albaran_referenciado_devuelve_409(self, client, proveedor, cliente_fixture):
        """A product with active delivery note lines cannot be deleted (409)."""
        prod = crear(client, proveedor["id"]).json()
        # Create a delivery note that uses this product
        client.post("/api/albaranes/post", json={
            "date": "2026-01-01",
            "customer_id": cliente_fixture["id"],
            "items": [{"product_id": prod["id"], "quantity": 1, "unit_price": 10.0}],
        })
        r = client.delete(f"/api/productos/delete/{prod['id']}")
        assert r.status_code == 409