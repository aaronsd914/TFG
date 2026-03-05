"""Tests para /api/analytics — summary, compare, export/pdf."""
from unittest.mock import patch


# Mock de la IA para que no llame a Groq en tests
def _mock_groq(*args, **kwargs):
    return "Informe de prueba generado por mock."


class TestAnalyticsSummary:
    def test_summary_sin_datos(self, client):
        with patch("backend.app.api.analytics.groq_chat", side_effect=_mock_groq):
            r = client.get("/api/analytics/summary")
        assert r.status_code == 200
        body = r.json()
        assert "metrics" in body
        assert "ai_report" in body

    def test_summary_con_rango_de_fechas(self, client):
        with patch("backend.app.api.analytics.groq_chat", side_effect=_mock_groq):
            r = client.get("/api/analytics/summary?date_from=2026-01-01&date_to=2026-03-31")
        assert r.status_code == 200
        body = r.json()
        assert body["metrics"]["range"]["from"] == "2026-01-01"
        assert body["metrics"]["range"]["to"] == "2026-03-31"

    def test_summary_date_from_posterior_devuelve_400(self, client):
        r = client.get("/api/analytics/summary?date_from=2026-12-31&date_to=2026-01-01")
        assert r.status_code == 400

    def test_summary_estructura_de_metricas(self, client):
        """El cuerpo de /summary debe tener las claves de métricas principales."""
        with patch("backend.app.api.analytics.groq_chat", side_effect=_mock_groq):
            r = client.get("/api/analytics/summary")
        metrics = r.json()["metrics"]
        assert "sales_by_day" in metrics
        assert "top_products" in metrics
        assert "averages" in metrics
        assert "basket_pairs" in metrics
        assert "rfm" in metrics

    def test_summary_con_albaran(self, client, cliente_fixture, producto):
        """Con datos reales, top_products debe tener al menos 1 producto."""
        client.post("/api/albaranes/post", json={
            "fecha": "2026-01-15",
            "cliente_id": cliente_fixture["id"],
            "items": [{"producto_id": producto["id"], "cantidad": 2, "precio_unitario": 15.0}],
        })
        with patch("backend.app.api.analytics.groq_chat", side_effect=_mock_groq):
            r = client.get("/api/analytics/summary")
        assert r.status_code == 200
        top = r.json()["metrics"]["top_products"]
        assert len(top) >= 1


class TestAnalyticsCompare:
    def test_compare_sin_datos(self, client):
        with patch("backend.app.api.analytics.groq_chat", side_effect=_mock_groq):
            r = client.get("/api/analytics/compare")
        assert r.status_code == 200
        assert isinstance(r.json(), dict)

    def test_compare_date_from_posterior_devuelve_400(self, client):
        r = client.get("/api/analytics/compare?date_from=2026-12-31&date_to=2026-01-01")
        assert r.status_code == 400


class TestAnalyticsExportPdf:
    def test_export_pdf_devuelve_pdf(self, client):
        with patch("backend.app.api.analytics.groq_chat", side_effect=_mock_groq):
            r = client.get("/api/analytics/export/pdf")
        assert r.status_code == 200
        assert r.headers["content-type"] == "application/pdf"
        assert len(r.content) > 0

    def test_export_pdf_con_rango(self, client):
        with patch("backend.app.api.analytics.groq_chat", side_effect=_mock_groq):
            r = client.get("/api/analytics/export/pdf?date_from=2026-01-01&date_to=2026-03-31")
        assert r.status_code == 200
        assert r.headers["content-type"] == "application/pdf"

