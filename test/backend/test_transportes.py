"""Tests para /transporte - almacen, rutas, asignar, quitar, liquidar."""


# Helper para crear albaran en estado ALMACEN
def crear_albaran_almacen(client, cliente_id, producto_id):
    r = client.post("/api/albaranes/post", json={
        "date": "2026-03-01",
        "customer_id": cliente_id,
        "items": [{"product_id": producto_id, "quantity": 2, "unit_price": 50.0}],
        "status": "ALMACEN",
        "register_deposit": False,
    })
    assert r.status_code == 200
    return r.json()


class TestAlmacenRuta:
    def test_almacen_vacio(self, client):
        r = client.get("/api/transporte/almacen")
        assert r.status_code == 200
        assert r.json() == []

    def test_ruta_vacio(self, client):
        r = client.get("/api/transporte/ruta")
        assert r.status_code == 200
        assert r.json() == []

    def test_albaran_en_almacen_aparece(self, client, cliente_fixture, producto):
        alb = crear_albaran_almacen(client, cliente_fixture["id"], producto["id"])
        r = client.get("/api/transporte/almacen")
        ids = [a["id"] for a in r.json()]
        assert alb["id"] in ids


class TestAsignarRuta:
    def test_asignar_ok(self, client, cliente_fixture, producto):
        alb = crear_albaran_almacen(client, cliente_fixture["id"], producto["id"])
        r = client.post("/api/transporte/ruta/asignar", json={
            "albaran_ids": [alb["id"]],
            "camion_id": 1,
        })
        assert r.status_code == 200
        assert r.json()["ok"] is True
        almacen_ids = [a["id"] for a in client.get("/api/transporte/almacen").json()]
        assert alb["id"] not in almacen_ids

    def test_asignar_ids_vacios_devuelve_400(self, client):
        r = client.post("/api/transporte/ruta/asignar", json={"albaran_ids": [], "camion_id": 1})
        assert r.status_code == 400

    def test_asignar_camion_invalido_devuelve_400(self, client, cliente_fixture, producto):
        alb = crear_albaran_almacen(client, cliente_fixture["id"], producto["id"])
        r = client.post("/api/transporte/ruta/asignar", json={"albaran_ids": [alb["id"]], "camion_id": 0})
        assert r.status_code == 400

    def test_asignar_albaran_inexistente_devuelve_404(self, client):
        r = client.post("/api/transporte/ruta/asignar", json={"albaran_ids": [9999], "camion_id": 1})
        assert r.status_code == 404

    def test_asignar_albaran_no_en_almacen_devuelve_400(self, client, cliente_fixture, producto):
        """Un albaran en estado FIANZA no puede asignarse a ruta."""
        r = client.post("/api/albaranes/post", json={
            "date": "2026-03-01",
            "customer_id": cliente_fixture["id"],
            "items": [{"product_id": producto["id"], "quantity": 1, "unit_price": 10.0}],
            "status": "FIANZA",
        })
        alb_id = r.json()["id"]
        r2 = client.post("/api/transporte/ruta/asignar", json={"albaran_ids": [alb_id], "camion_id": 1})
        assert r2.status_code == 400


class TestQuitarRuta:
    def test_quitar_ok(self, client, cliente_fixture, producto):
        alb = crear_albaran_almacen(client, cliente_fixture["id"], producto["id"])
        client.post("/api/transporte/ruta/asignar", json={"albaran_ids": [alb["id"]], "camion_id": 1})
        r = client.post("/api/transporte/ruta/quitar", json={"albaran_ids": [alb["id"]]})
        assert r.status_code == 200
        almacen_ids = [a["id"] for a in client.get("/api/transporte/almacen").json()]
        assert alb["id"] in almacen_ids

    def test_quitar_ids_vacios_devuelve_400(self, client):
        r = client.post("/api/transporte/ruta/quitar", json={"albaran_ids": []})
        assert r.status_code == 400


class TestLiquidarCamion:
    def test_liquidar_ok(self, client, cliente_fixture, producto):
        alb = crear_albaran_almacen(client, cliente_fixture["id"], producto["id"])
        client.post("/api/transporte/ruta/asignar", json={"albaran_ids": [alb["id"]], "camion_id": 7})
        r = client.post("/api/transporte/ruta/7/liquidar")
        assert r.status_code == 200
        body = r.json()
        assert body["ok"] is True
        assert body["camion_id"] == 7
        assert body["importe"] > 0
        movs = client.get("/api/movimientos/get").json()
        egresos = [m for m in movs if m["type"] == "EGRESO" and "camion 7" in m["description"]]
        assert len(egresos) >= 1

    def test_liquidar_camion_sin_albaranes_devuelve_404(self, client):
        r = client.post("/api/transporte/ruta/99/liquidar")
        assert r.status_code == 404

    def test_liquidar_camion_invalido_devuelve_400(self, client):
        r = client.post("/api/transporte/ruta/0/liquidar")
        assert r.status_code == 400

    def test_liquidar_idempotente(self, client, cliente_fixture, producto):
        """Llamar dos veces no duplica el movimiento de egreso."""
        alb = crear_albaran_almacen(client, cliente_fixture["id"], producto["id"])
        client.post("/api/transporte/ruta/asignar", json={"albaran_ids": [alb["id"]], "camion_id": 3})
        client.post("/api/transporte/ruta/3/liquidar")
        client.post("/api/transporte/ruta/3/liquidar")
        movs = client.get("/api/movimientos/get").json()
        egresos = [m for m in movs if m["type"] == "EGRESO" and "camion 3" in m["description"]]
        assert len(egresos) == 1


class TestFacturaRuta:
    def test_factura_ok(self, client, cliente_fixture, producto):
        alb = crear_albaran_almacen(client, cliente_fixture["id"], producto["id"])
        client.post("/api/transporte/ruta/asignar", json={"albaran_ids": [alb["id"]], "camion_id": 5})
        r = client.get("/api/transporte/ruta/5/factura")
        assert r.status_code == 200
        assert r.headers["content-type"] == "application/pdf"
        assert len(r.content) > 100

    def test_factura_camion_sin_albaranes_devuelve_404(self, client):
        r = client.get("/api/transporte/ruta/99/factura")
        assert r.status_code == 404

    def test_factura_camion_invalido_devuelve_400(self, client):
        r = client.get("/api/transporte/ruta/0/factura")
        assert r.status_code == 400
