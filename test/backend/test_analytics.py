"""Tests para /api/analytics - summary, compare, export/pdf.

Los tests de esta suite utilizan pytest-mock (mocker fixture) para
sustituir la llamada a la API de Groq por un Stub/Mock, siguiendo la
estructura Given / When / Then (AIS T1.2).  Esto garantiza el principio
FIRST (Fast, Isolated, Repeatable, Self-validating, Timely): los tests
no dependen de credenciales externas ni de disponibilidad de la red.
"""

# Ruta de importacion del SUT - misma que usa analytics.py al importar groq_chat
GROQ_PATH = "backend.app.api.analytics.groq_chat"
GROQ_STUB  = "Informe de prueba generado por mock."


class TestAnalyticsSummary:
    def test_summary_sin_datos(self, client, mocker):
        # Given - stub que devuelve un informe fijo sin llamar a Groq
        mock_groq = mocker.patch(GROQ_PATH, return_value=GROQ_STUB)
        # When
        r = client.get("/api/analytics/summary")
        # Then
        assert r.status_code == 200
        body = r.json()
        assert "metrics" in body
        assert "ai_report" in body
        mock_groq.assert_called_once()  # spy: se llamo exactamente 1 vez

    def test_summary_con_rango_de_fechas(self, client, mocker):
        # Given
        mocker.patch(GROQ_PATH, return_value=GROQ_STUB)
        # When
        r = client.get("/api/analytics/summary?date_from=2026-01-01&date_to=2026-03-31")
        # Then
        assert r.status_code == 200
        body = r.json()
        assert body["metrics"]["range"]["from"] == "2026-01-01"
        assert body["metrics"]["range"]["to"] == "2026-03-31"

    def test_summary_date_from_posterior_devuelve_400(self, client):
        # No necesita mock: el error de validacion ocurre antes de llamar a Groq
        r = client.get("/api/analytics/summary?date_from=2026-12-31&date_to=2026-01-01")
        assert r.status_code == 400

    def test_summary_estructura_de_metricas(self, client, mocker):
        # Given
        mocker.patch(GROQ_PATH, return_value=GROQ_STUB)
        # When
        r = client.get("/api/analytics/summary")
        # Then
        metrics = r.json()["metrics"]
        assert "sales_by_day" in metrics
        assert "top_products" in metrics
        assert "averages" in metrics
        assert "basket_pairs" in metrics
        assert "rfm" in metrics

    def test_summary_con_albaran(self, client, mocker, cliente_fixture, producto):
        # Given - neutralizar email/PDF para crear el albaran, luego stub de Groq
        mocker.patch("backend.app.api.albaranes.send_email_with_pdf", return_value=None)
        mocker.patch("backend.app.api.albaranes.generate_delivery_note_pdf", return_value=b"")
        mocker.patch("backend.app.api.albaranes.render", return_value="<html></html>")
        client.post("/api/albaranes/post", json={
            "date": "2026-01-15",
            "customer_id": cliente_fixture["id"],
            "items": [{"product_id": producto["id"], "quantity": 2, "unit_price": 15.0}],
        })
        mock_groq = mocker.patch(GROQ_PATH, return_value=GROQ_STUB)
        # When
        r = client.get("/api/analytics/summary")
        # Then
        assert r.status_code == 200
        assert len(r.json()["metrics"]["top_products"]) >= 1
        mock_groq.assert_called_once()


class TestAnalyticsCompare:
    def test_compare_sin_datos(self, client, mocker):
        # Given
        mocker.patch(GROQ_PATH, return_value=GROQ_STUB)
        # When
        r = client.get("/api/analytics/compare")
        # Then
        assert r.status_code == 200
        assert isinstance(r.json(), dict)

    def test_compare_date_from_posterior_devuelve_400(self, client):
        r = client.get("/api/analytics/compare?date_from=2026-12-31&date_to=2026-01-01")
        assert r.status_code == 400


class TestAnalyticsExportPdf:
    def test_export_pdf_devuelve_pdf(self, client, mocker):
        # Given
        mock_groq = mocker.patch(GROQ_PATH, return_value=GROQ_STUB)
        # When
        r = client.get("/api/analytics/export/pdf")
        # Then
        assert r.status_code == 200
        assert r.headers["content-type"] == "application/pdf"
        assert len(r.content) > 0
        mock_groq.assert_called()  # puede llamarse mas de una vez en el PDF

    def test_export_pdf_con_rango(self, client, mocker):
        # Given
        mocker.patch(GROQ_PATH, return_value=GROQ_STUB)
        # When
        r = client.get("/api/analytics/export/pdf?date_from=2026-01-01&date_to=2026-03-31")
        # Then
        assert r.status_code == 200
        assert r.headers["content-type"] == "application/pdf"


class TestAnalyticsPredict:
    """Tests para el endpoint GET /api/analytics/predict (Holt's double ES)."""

    def test_predict_sin_datos(self, client):
        # When - no hay albaranes en DB
        r = client.get("/api/analytics/predict")
        # Then
        assert r.status_code == 200
        body = r.json()
        assert "historical" in body
        assert "forecast" in body
        assert "method" in body
        assert "n_months" in body

    def test_predict_con_rango(self, client):
        # Given
        r = client.get("/api/analytics/predict?date_from=2026-01-01&date_to=2026-03-31")
        # Then
        assert r.status_code == 200
        body = r.json()
        assert body["n_months"] == 3
        assert len(body["forecast"]) == 3
        for item in body["forecast"]:
            assert "month" in item
            assert "predicted_revenue" in item
            assert "lower_80" in item
            assert "upper_80" in item

    def test_predict_date_from_posterior_devuelve_400(self, client):
        # date_from > date_to → must be rejected before calling prediction logic
        r = client.get("/api/analytics/predict?date_from=2026-12-31&date_to=2026-01-01")
        assert r.status_code == 400

    def test_predict_n_months_custom(self, client):
        # n_months=2 → forecast must contain exactly 2 items
        r = client.get("/api/analytics/predict?n_months=2")
        assert r.status_code == 200
        body = r.json()
        assert body["n_months"] == 2
        assert len(body["forecast"]) == 2

    def test_predict_con_albaran(self, client, mocker, cliente_fixture, producto):
        # Given - create a delivery note so there is at least some revenue data
        mocker.patch("backend.app.api.albaranes.send_email_with_pdf", return_value=None)
        mocker.patch("backend.app.api.albaranes.generate_delivery_note_pdf", return_value=b"")
        mocker.patch("backend.app.api.albaranes.render", return_value="<html></html>")
        client.post("/api/albaranes/post", json={
            "date": "2026-01-15",
            "customer_id": cliente_fixture["id"],
            "items": [{"product_id": producto["id"], "quantity": 1, "unit_price": 50.0}],
        })
        # When
        r = client.get("/api/analytics/predict?date_from=2026-01-01&date_to=2026-01-31")
        # Then
        assert r.status_code == 200
        body = r.json()
        for item in body["forecast"]:
            assert item["predicted_revenue"] >= 0
            assert item["upper_80"] >= item["predicted_revenue"]