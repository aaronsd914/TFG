"""Tests para /api/proveedores Ã¢â‚¬â€ CRUD completo."""

PROV_BASE = {"name": "Mi Proveedor", "contact": "info@proveedor.com"}


def crear(client, data=None):
    return client.post("/api/proveedores/post", json=data or PROV_BASE)


class TestCrearProveedor:
    def test_crear_ok(self, client):
        r = crear(client)
        assert r.status_code == 200
        body = r.json()
        assert body["name"] == "Mi Proveedor"
        assert "id" in body

    def test_multiples_proveedores(self, client):
        crear(client)
        crear(client, {"name": "Otro", "contact": "otro@test.com"})
        r = client.get("/api/proveedores/get")
        assert len(r.json()) == 2


class TestObtenerProveedores:
    def test_listar_vacio(self, client):
        assert client.get("/api/proveedores/get").json() == []

    def test_obtener_por_id(self, client):
        pid = crear(client).json()["id"]
        r = client.get(f"/api/proveedores/get/{pid}")
        assert r.status_code == 200
        assert r.json()["id"] == pid

    def test_obtener_inexistente(self, client):
        assert client.get("/api/proveedores/get/9999").status_code == 404


class TestActualizarProveedor:
    def test_actualizar_ok(self, client):
        pid = crear(client).json()["id"]
        r = client.put(f"/api/proveedores/put/{pid}", json={"name": "Actualizado", "contact": "x"})
        assert r.status_code == 200
        assert r.json()["name"] == "Actualizado"

    def test_actualizar_inexistente(self, client):
        assert client.put("/api/proveedores/put/9999", json=PROV_BASE).status_code == 404


class TestEliminarProveedor:
    def test_eliminar_ok(self, client):
        pid = crear(client).json()["id"]
        r = client.delete(f"/api/proveedores/delete/{pid}")
        assert r.status_code == 200
        assert client.get(f"/api/proveedores/get/{pid}").status_code == 404

    def test_eliminar_inexistente(self, client):
        assert client.delete("/api/proveedores/delete/9999").status_code == 404
