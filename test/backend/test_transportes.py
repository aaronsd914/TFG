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

    def test_quitar_borra_movimientos_cuando_habia_liquidacion(self, client, cliente_fixture, producto):
        """Al quitar un albarán de un camión ya liquidado se eliminan sus movimientos."""
        alb = crear_albaran_almacen(client, cliente_fixture["id"], producto["id"])
        client.post("/api/transporte/ruta/asignar", json={"albaran_ids": [alb["id"]], "camion_id": 20})
        client.post("/api/transporte/ruta/20/liquidar")
        # Verify movements exist
        movs_before = client.get("/api/movimientos/get").json()
        assert any("camion 20" in m["description"] for m in movs_before)
        # Remove from route
        r = client.post("/api/transporte/ruta/quitar", json={"albaran_ids": [alb["id"]]})
        assert r.status_code == 200
        movs_after = client.get("/api/movimientos/get").json()
        camion20_movs = [m for m in movs_after if "camion 20" in m["description"]]
        assert len(camion20_movs) == 0

    def test_quitar_recalcula_si_quedan_albaranes(self, client, cliente_fixture, producto):
        """Al quitar uno de varios albaranes, los movimientos se recalculan para los restantes."""
        alb1 = crear_albaran_almacen(client, cliente_fixture["id"], producto["id"])
        alb2 = crear_albaran_almacen(client, cliente_fixture["id"], producto["id"])
        client.post("/api/transporte/ruta/asignar", json={"albaran_ids": [alb1["id"], alb2["id"]], "camion_id": 21})
        client.post("/api/transporte/ruta/21/liquidar")
        # Remove only alb1
        r = client.post("/api/transporte/ruta/quitar", json={"albaran_ids": [alb1["id"]]})
        assert r.status_code == 200
        movs = client.get("/api/movimientos/get").json()
        # Movements should still exist for the truck (recalculated for alb2)
        camion21_movs = [m for m in movs if "camion 21" in m["description"]]
        assert len(camion21_movs) >= 1


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

    def test_liquidar_crea_movimiento_ingreso(self, client, cliente_fixture, producto):
        """settle_truck debe crear un movimiento INGRESO además del EGRESO."""
        alb = crear_albaran_almacen(client, cliente_fixture["id"], producto["id"])
        client.post("/api/transporte/ruta/asignar", json={"albaran_ids": [alb["id"]], "camion_id": 11})
        r = client.post("/api/transporte/ruta/11/liquidar")
        assert r.status_code == 200
        movs = client.get("/api/movimientos/get").json()
        ingresos = [m for m in movs if m["type"] == "INGRESO" and "ruta camion 11" in m["description"]]
        assert len(ingresos) == 1
        assert ingresos[0]["amount"] >= 0

    def test_liquidar_ingreso_idempotente(self, client, cliente_fixture, producto):
        """Llamar dos veces no duplica el movimiento de ingreso."""
        alb = crear_albaran_almacen(client, cliente_fixture["id"], producto["id"])
        client.post("/api/transporte/ruta/asignar", json={"albaran_ids": [alb["id"]], "camion_id": 12})
        client.post("/api/transporte/ruta/12/liquidar")
        client.post("/api/transporte/ruta/12/liquidar")
        movs = client.get("/api/movimientos/get").json()
        ingresos = [m for m in movs if m["type"] == "INGRESO" and "camion 12" in m["description"]]
        assert len(ingresos) == 1

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


class TestGetRutas:
    def test_rutas_vacio(self, client):
        r = client.get("/api/transporte/rutas")
        assert r.status_code == 200
        body = r.json()
        assert "camiones" in body
        assert "sin_camion" in body
        assert body["camiones"] == []
        assert body["sin_camion"] == []

    def test_rutas_con_camion_asignado(self, client, cliente_fixture, producto):
        alb = crear_albaran_almacen(client, cliente_fixture["id"], producto["id"])
        client.post("/api/transporte/ruta/asignar", json={"albaran_ids": [alb["id"]], "camion_id": 2})
        r = client.get("/api/transporte/rutas")
        assert r.status_code == 200
        body = r.json()
        camion_ids = [c["camion_id"] for c in body["camiones"]]
        assert 2 in camion_ids
        alb_ids = [a["id"] for c in body["camiones"] for a in c["albaranes"]]
        assert alb["id"] in alb_ids

    def test_rutas_sin_camion_aparece(self, client, cliente_fixture, producto):
        """Un albarán puesto en ruta sin camión aparece en sin_camion."""
        alb = crear_albaran_almacen(client, cliente_fixture["id"], producto["id"])
        client.post("/api/transporte/ruta/pendiente", json={"albaran_ids": [alb["id"]]})
        r = client.get("/api/transporte/rutas")
        assert r.status_code == 200
        body = r.json()
        sin_camion_ids = [a["id"] for a in body["sin_camion"]]
        assert alb["id"] in sin_camion_ids


class TestPendiente:
    def test_pendiente_ok_desde_almacen(self, client, cliente_fixture, producto):
        """Un albarán en ALMACEN puede moverse a ruta pendiente (sin camión)."""
        alb = crear_albaran_almacen(client, cliente_fixture["id"], producto["id"])
        r = client.post("/api/transporte/ruta/pendiente", json={"albaran_ids": [alb["id"]]})
        assert r.status_code == 200
        assert r.json()["ok"] is True
        ruta = client.get("/api/transporte/ruta").json()
        assert alb["id"] in [a["id"] for a in ruta]

    def test_pendiente_ok_desde_camion(self, client, cliente_fixture, producto):
        """Un albarán en un camión puede volverse pendiente (sin camión)."""
        alb = crear_albaran_almacen(client, cliente_fixture["id"], producto["id"])
        client.post("/api/transporte/ruta/asignar", json={"albaran_ids": [alb["id"]], "camion_id": 40})
        r = client.post("/api/transporte/ruta/pendiente", json={"albaran_ids": [alb["id"]]})
        assert r.status_code == 200
        body = r.json()
        assert body["ok"] is True
        # should no longer be in the truck
        rutas = client.get("/api/transporte/rutas").json()
        truck40 = next((c for c in rutas["camiones"] if c["camion_id"] == 40), None)
        assert truck40 is None or alb["id"] not in [a["id"] for a in truck40["albaranes"]]

    def test_pendiente_ids_vacios_devuelve_400(self, client):
        r = client.post("/api/transporte/ruta/pendiente", json={"albaran_ids": []})
        assert r.status_code == 400

    def test_pendiente_albaran_inexistente_devuelve_404(self, client):
        r = client.post("/api/transporte/ruta/pendiente", json={"albaran_ids": [9999]})
        assert r.status_code == 404

    def test_pendiente_albaran_estado_invalido_devuelve_400(self, client, cliente_fixture, producto):
        """Un albarán en estado FIANZA no puede ponerse pendiente."""
        r = client.post("/api/albaranes/post", json={
            "date": "2026-03-01",
            "customer_id": cliente_fixture["id"],
            "items": [{"product_id": producto["id"], "quantity": 1, "unit_price": 10.0}],
            "status": "FIANZA",
        })
        alb_id = r.json()["id"]
        r2 = client.post("/api/transporte/ruta/pendiente", json={"albaran_ids": [alb_id]})
        assert r2.status_code == 400


class TestQuitarRutaEdgeCases:
    def test_quitar_albaran_inexistente_devuelve_404(self, client):
        r = client.post("/api/transporte/ruta/quitar", json={"albaran_ids": [9999]})
        assert r.status_code == 404

    def test_asignar_reasigna_camion_existente(self, client, cliente_fixture, producto):
        """Asignar un albarán ya en ruta a otro camión actualiza el truck_id."""
        alb = crear_albaran_almacen(client, cliente_fixture["id"], producto["id"])
        client.post("/api/transporte/ruta/asignar", json={"albaran_ids": [alb["id"]], "camion_id": 50})
        r2 = client.post("/api/transporte/ruta/asignar", json={"albaran_ids": [alb["id"]], "camion_id": 51})
        assert r2.status_code == 200
        rutas = client.get("/api/transporte/rutas").json()
        camion51 = next((c for c in rutas["camiones"] if c["camion_id"] == 51), None)
        assert camion51 is not None
        assert alb["id"] in [a["id"] for a in camion51["albaranes"]]


class TestFianzaPagada:
    def test_fianza_pagada_se_guarda_cuando_register_deposit_true(self, client, cliente_fixture, producto):
        """Al crear un albarán con register_deposit=True la fianza_pagada debe ser > 0."""
        r = client.post("/api/albaranes/post", json={
            "date": "2026-03-01",
            "customer_id": cliente_fixture["id"],
            "items": [{"product_id": producto["id"], "quantity": 2, "unit_price": 50.0}],
            "status": "ALMACEN",
            "register_deposit": True,
        })
        assert r.status_code == 200
        alb = r.json()
        assert alb.get("fianza_pagada", 0) > 0

    def test_fianza_pagada_cero_cuando_register_deposit_false(self, client, cliente_fixture, producto):
        """Al crear un albarán con register_deposit=False la fianza_pagada debe ser 0."""
        r = client.post("/api/albaranes/post", json={
            "date": "2026-03-01",
            "customer_id": cliente_fixture["id"],
            "items": [{"product_id": producto["id"], "quantity": 2, "unit_price": 50.0}],
            "status": "ALMACEN",
            "register_deposit": False,
        })
        assert r.status_code == 200
        alb = r.json()
        assert alb.get("fianza_pagada", 0) == 0.0

    def test_ingreso_descontado_en_liquidacion_con_fianza(self, client, cliente_fixture, producto):
        """El importe INGRESO debe ser menor que el total cuando hay fianza."""
        r = client.post("/api/albaranes/post", json={
            "date": "2026-03-01",
            "customer_id": cliente_fixture["id"],
            "items": [{"product_id": producto["id"], "quantity": 2, "unit_price": 50.0}],
            "status": "ALMACEN",
            "register_deposit": True,
        })
        alb = r.json()
        total = alb["total"]
        fianza = alb.get("fianza_pagada", 0)
        client.post("/api/transporte/ruta/asignar", json={"albaran_ids": [alb["id"]], "camion_id": 30})
        client.post("/api/transporte/ruta/30/liquidar")
        movs = client.get("/api/movimientos/get").json()
        ingresos = [m for m in movs if m["type"] == "INGRESO" and "camion 30" in m["description"]]
        assert len(ingresos) == 1
        expected_max = total - (total * 0.07)
        if fianza > 0:
            assert ingresos[0]["amount"] < expected_max
