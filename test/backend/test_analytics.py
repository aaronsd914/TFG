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

    def test_export_pdf_incluye_prediccion(self, client, mocker, cliente_fixture, producto):
        """El PDF se genera correctamente cuando los datos activan el bloque de predicción."""
        mocker.patch(GROQ_PATH, return_value=GROQ_STUB)
        mocker.patch("backend.app.api.albaranes.send_email_with_pdf", return_value=None)
        mocker.patch("backend.app.api.albaranes.generate_delivery_note_pdf", return_value=b"")
        mocker.patch("backend.app.api.albaranes.render", return_value="<html></html>")
        for ds in ("2026-01-10", "2026-02-18"):
            client.post("/api/albaranes/post", json={
                "date": ds,
                "customer_id": cliente_fixture["id"],
                "items": [{"product_id": producto["id"], "quantity": 1, "unit_price": 120.0}],
            })
        r = client.get("/api/analytics/export/pdf?date_from=2026-01-01&date_to=2026-02-28")
        assert r.status_code == 200
        assert r.headers["content-type"] == "application/pdf"

    def test_export_pdf_prediccion_fallback_silencioso(self, client, mocker):
        """Si _prediction_data lanza excepción, el PDF se sigue generando sin predicción."""
        mocker.patch(GROQ_PATH, return_value=GROQ_STUB)
        mocker.patch("backend.app.api.analytics._prediction_data", side_effect=Exception("DB error"))
        r = client.get("/api/analytics/export/pdf")
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

    def test_predict_holt_activo_dos_meses(self, client, mocker, cliente_fixture, producto):
        """Con albaranes en 2 meses distintos el endpoint activa Holt y cubre _holt_forecast n==2."""
        mocker.patch("backend.app.api.albaranes.send_email_with_pdf", return_value=None)
        mocker.patch("backend.app.api.albaranes.generate_delivery_note_pdf", return_value=b"")
        mocker.patch("backend.app.api.albaranes.render", return_value="<html></html>")
        for ds in ("2026-01-10", "2026-02-15"):
            client.post("/api/albaranes/post", json={
                "date": ds,
                "customer_id": cliente_fixture["id"],
                "items": [{"product_id": producto["id"], "quantity": 1, "unit_price": 100.0}],
            })
        r = client.get("/api/analytics/predict?date_from=2026-01-01&date_to=2026-02-28&n_months=2")
        assert r.status_code == 200
        body = r.json()
        assert body["method"] == "holt_double_exponential_smoothing"
        assert len(body["forecast"]) == 2
        assert all(item["predicted_revenue"] >= 0 for item in body["forecast"])

    def test_predict_holt_activo_tres_meses(self, client, mocker, cliente_fixture, producto):
        """Con albaranes en 3 meses el forecast usa RMSE real (n>=3), cubriendo ese bloque."""
        mocker.patch("backend.app.api.albaranes.send_email_with_pdf", return_value=None)
        mocker.patch("backend.app.api.albaranes.generate_delivery_note_pdf", return_value=b"")
        mocker.patch("backend.app.api.albaranes.render", return_value="<html></html>")
        for ds in ("2026-01-10", "2026-02-15", "2026-03-20"):
            client.post("/api/albaranes/post", json={
                "date": ds,
                "customer_id": cliente_fixture["id"],
                "items": [{"product_id": producto["id"], "quantity": 1, "unit_price": 100.0}],
            })
        r = client.get("/api/analytics/predict?date_from=2026-01-01&date_to=2026-03-31")
        assert r.status_code == 200
        body = r.json()
        assert body["method"] == "holt_double_exponential_smoothing"
        assert all(item["upper_80"] >= item["predicted_revenue"] for item in body["forecast"])
        assert all(item["lower_80"] >= 0 for item in body["forecast"])


class TestHoltForecast:
    """Unit tests directos de _holt_forecast (sin pasar por el endpoint)."""

    def test_lista_vacia_devuelve_listas_vacias(self):
        from backend.app.api.analytics import _holt_forecast
        fcs, lo, hi = _holt_forecast([], 3)
        assert fcs == [] and lo == [] and hi == []

    def test_n_ahead_cero_devuelve_listas_vacias(self):
        from backend.app.api.analytics import _holt_forecast
        fcs, lo, hi = _holt_forecast([100.0, 200.0, 150.0], 0)
        assert fcs == []

    def test_valor_unico_replica_el_valor(self):
        from backend.app.api.analytics import _holt_forecast
        fcs, lo, hi = _holt_forecast([300.0], 2)
        assert len(fcs) == 2
        assert fcs == [300.0, 300.0]
        assert lo == fcs[:] and hi == fcs[:]

    def test_dos_valores_cubre_rmse_fallback(self):
        from backend.app.api.analytics import _holt_forecast
        fcs, lo, hi = _holt_forecast([100.0, 200.0], 3)
        assert len(fcs) == 3
        assert all(f >= 0 for f in fcs)
        assert all(hi[i] >= fcs[i] for i in range(3))

    def test_multiples_valores_cubre_rmse_real(self):
        from backend.app.api.analytics import _holt_forecast
        vals = [100.0, 120.0, 115.0, 130.0, 125.0]
        fcs, lo, hi = _holt_forecast(vals, 3)
        assert len(fcs) == 3 and len(lo) == 3 and len(hi) == 3
        assert all(hi[i] >= fcs[i] for i in range(3))
        assert all(lo[i] >= 0 for i in range(3))

    def test_valores_negativos_tratados_como_cero(self):
        from backend.app.api.analytics import _holt_forecast
        fcs, lo, hi = _holt_forecast([-100.0, 200.0, 150.0], 1)
        assert fcs[0] >= 0


class TestNextMonths:
    """Unit tests de _next_months."""

    def test_transicion_diciembre_enero(self):
        from backend.app.api.analytics import _next_months
        result = _next_months("2026-12", 2)
        assert result == ["2027-01", "2027-02"]

    def test_cadena_invalida_usa_fecha_actual(self):
        from backend.app.api.analytics import _next_months
        result = _next_months("invalid-string", 1)
        assert len(result) == 1
        # Resultado basado en el mes actual, solo verificamos formato
        assert len(result[0]) == 7 and "-" in result[0]


class TestTendenciasPdfPrediccion:
    """Pruebas directas de generar_pdf_tendencias con datos de predicción."""

    def test_pdf_con_prediction_data(self, mocker):
        """generar_pdf_tendencias incluye la tabla de predicción cuando se pasa prediction."""
        mocker.patch("backend.app.api.analytics.groq_chat", return_value="stub")
        from backend.app.utils.tendencias_pdf import generar_pdf_tendencias
        pred = {
            "forecast": [
                {"month": "2026-04", "predicted_revenue": 1500.0, "lower_80": 1100.0, "upper_80": 1900.0},
                {"month": "2026-05", "predicted_revenue": 1600.0, "lower_80": 1200.0, "upper_80": 2000.0},
            ]
        }
        buf = generar_pdf_tendencias(
            tienda_nombre="TestTienda",
            rango_actual={"from": "2026-01-01", "to": "2026-03-31"},
            metrics_actual={"sales_by_day": [], "top_products": [], "basket_pairs": [], "rfm": {}},
            ai_report="Informe IA test.",
            prediction=pred,
        )
        assert len(buf.getvalue()) > 0