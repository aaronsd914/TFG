"""Tests para /api/clientes â€” CRUD completo + upsert por DNI/email."""
from datetime import date


# â”€â”€ Helpers locales â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CLIENTE_BASE = {
    "name": "Ana",
    "surnames": "LÃ³pez",
    "dni": "87654321B",
    "email": "ana@test.com",
    "telefono1": "611222333",
    "ciudad": "Madrid",
}


def crear(client, data=None):
    return client.post("/api/clientes/post", json=data or CLIENTE_BASE)


# â”€â”€ Tests â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
class TestCrearCliente:
    def test_crear_ok(self, client):
        r = crear(client)
        assert r.status_code == 200
        body = r.json()
        assert body["name"] == "Ana"
        assert body["dni"] == "87654321B"
        assert "id" in body

    def test_campos_opcionales_nulos(self, client):
        r = client.post("/api/clientes/post", json={"name": "Sin", "surnames": "Datos"})
        assert r.status_code == 200
        body = r.json()
        assert body["dni"] is None
        assert body["email"] is None

    def test_upsert_mismo_dni(self, client):
        """Si ya existe un cliente con el mismo DNI, se actualiza en lugar de duplicar."""
        crear(client)
        r2 = client.post("/api/clientes/post", json={**CLIENTE_BASE, "name": "Ana Modificada"})
        assert r2.status_code == 200
        assert r2.json()["name"] == "Ana Modificada"
        # Sigue habiendo solo 1 cliente
        total = client.get("/api/clientes/get").json()
        assert len(total) == 1

    def test_upsert_mismo_email(self, client):
        """Si coincide el email y no el DNI, tambiÃ©n hace upsert."""
        crear(client)
        r2 = client.post("/api/clientes/post", json={
            "name": "Ana Nueva",
            "surnames": "LÃ³pez",
            "dni": None,
            "email": "ana@test.com",
        })
        assert r2.status_code == 200
        total = client.get("/api/clientes/get").json()
        assert len(total) == 1


class TestObtenerClientes:
    def test_listar_vacio(self, client):
        r = client.get("/api/clientes/get")
        assert r.status_code == 200
        assert r.json() == []

    def test_listar_con_datos(self, client):
        crear(client)
        r = client.get("/api/clientes/get")
        assert r.status_code == 200
        assert len(r.json()) == 1

    def test_obtener_por_id(self, client):
        cid = crear(client).json()["id"]
        r = client.get(f"/api/clientes/get/{cid}")
        assert r.status_code == 200
        assert r.json()["id"] == cid

    def test_obtener_id_inexistente(self, client):
        r = client.get("/api/clientes/get/9999")
        assert r.status_code == 404


class TestActualizarCliente:
    def test_actualizar_ok(self, client):
        cid = crear(client).json()["id"]
        r = client.put(f"/api/clientes/put/{cid}", json={**CLIENTE_BASE, "name": "Ana Actualizada"})
        assert r.status_code == 200
        assert r.json()["name"] == "Ana Actualizada"

    def test_actualizar_inexistente(self, client):
        r = client.put("/api/clientes/put/9999", json=CLIENTE_BASE)
        assert r.status_code == 404


class TestEliminarCliente:
    def test_eliminar_ok(self, client):
        cid = crear(client).json()["id"]
        r = client.delete(f"/api/clientes/delete/{cid}")
        assert r.status_code == 200
        assert client.get(f"/api/clientes/get/{cid}").status_code == 404

    def test_eliminar_inexistente(self, client):
        r = client.delete("/api/clientes/delete/9999")
        assert r.status_code == 404
