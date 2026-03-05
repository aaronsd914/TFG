"""Tests para /api/stripe — status, checkout, confirm (con mocks), checkouts list."""
from unittest.mock import MagicMock, patch


class TestStripeStatus:
    def test_status_ok(self, client):
        r = client.get("/api/stripe/status")
        assert r.status_code == 200
        body = r.json()
        assert "configured" in body
        assert "currency" in body
        assert "publishable_key" in body


class TestStripeCheckout:
    def test_importe_cero_devuelve_400(self, client):
        r = client.post("/api/stripe/checkout", json={"amount": 0, "description": "Test"})
        assert r.status_code == 400

    def test_importe_negativo_devuelve_400(self, client):
        r = client.post("/api/stripe/checkout", json={"amount": -10, "description": "Test"})
        assert r.status_code == 400

    def test_checkout_ok_con_mock(self, client):
        """Simula la respuesta de Stripe para no depender de la API real."""
        fake_session = MagicMock()
        fake_session.id = "cs_test_fake123"
        fake_session.url = "https://checkout.stripe.com/fake"

        with patch("stripe.checkout.Session.create", return_value=fake_session):
            r = client.post("/api/stripe/checkout", json={"amount": 49.99, "description": "Pago test"})
        assert r.status_code == 200
        body = r.json()
        assert body["id"] == "cs_test_fake123"
        assert "url" in body


class TestStripeConfirm:
    def test_session_id_vacio_devuelve_400(self, client):
        r = client.post("/api/stripe/confirm", json={"session_id": ""})
        assert r.status_code == 400

    def test_confirm_ok_con_mock(self, client):
        """Simula una sesión pagada y comprueba que se crea el movimiento."""
        fake_session = MagicMock()
        fake_session.payment_status = "paid"
        fake_session.status = "complete"
        fake_session.amount_total = 4999  # céntimos → 49.99 €
        fake_session.currency = "eur"
        fake_session.metadata = {"description": "Pago test mock"}
        fake_session.payment_intent = "pi_fake"
        fake_session.created = 1700000000

        with patch("stripe.checkout.Session.retrieve", return_value=fake_session):
            r = client.post("/api/stripe/confirm", json={"session_id": "cs_test_fake999"})
        assert r.status_code == 200
        body = r.json()
        assert body["ok"] is True
        assert body["created"] is True
        assert body["amount"] == 49.99

        # Debe existir un movimiento de INGRESO por esa cantidad
        movs = client.get("/api/movimientos/get").json()
        stripe_movs = [m for m in movs if "Stripe" in m["concepto"]]
        assert len(stripe_movs) == 1
        assert stripe_movs[0]["cantidad"] == 49.99

    def test_confirm_idempotente(self, client):
        """Confirmar dos veces la misma sesión no duplica el movimiento."""
        fake_session = MagicMock()
        fake_session.payment_status = "paid"
        fake_session.status = "complete"
        fake_session.amount_total = 1000
        fake_session.currency = "eur"
        fake_session.metadata = {"description": "Idempotencia"}
        fake_session.payment_intent = "pi_idem"
        fake_session.created = 1700000000

        with patch("stripe.checkout.Session.retrieve", return_value=fake_session):
            r1 = client.post("/api/stripe/confirm", json={"session_id": "cs_idem_001"})
            r2 = client.post("/api/stripe/confirm", json={"session_id": "cs_idem_001"})

        assert r1.status_code == 200
        assert r2.status_code == 200
        assert r1.json()["created"] is True
        assert r2.json()["created"] is False  # segunda vez no crea duplicado

        movs = client.get("/api/movimientos/get").json()
        stripe_movs = [m for m in movs if "Stripe" in m["concepto"]]
        assert len(stripe_movs) == 1

    def test_confirm_no_pagado_devuelve_400(self, client):
        fake_session = MagicMock()
        fake_session.payment_status = "unpaid"
        fake_session.status = "open"

        with patch("stripe.checkout.Session.retrieve", return_value=fake_session):
            r = client.post("/api/stripe/confirm", json={"session_id": "cs_unpaid_001"})
        assert r.status_code == 400


class TestStripeCheckouts:
    def test_listar_vacio(self, client):
        r = client.get("/api/stripe/checkouts")
        assert r.status_code == 200
        assert r.json() == []

    def test_listar_tras_confirm(self, client):
        fake_session = MagicMock()
        fake_session.payment_status = "paid"
        fake_session.status = "complete"
        fake_session.amount_total = 2000
        fake_session.currency = "eur"
        fake_session.metadata = {"description": "Lista test"}
        fake_session.payment_intent = "pi_lista"
        fake_session.created = 1700000000

        with patch("stripe.checkout.Session.retrieve", return_value=fake_session):
            client.post("/api/stripe/confirm", json={"session_id": "cs_lista_001"})

        r = client.get("/api/stripe/checkouts")
        assert r.status_code == 200
        assert len(r.json()) == 1
        assert r.json()[0]["session_id"] == "cs_lista_001"
