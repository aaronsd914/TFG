"""Tests para /api/bank/caixa — solo los endpoints que no dependen de APIs externas."""
from unittest.mock import patch, MagicMock


class TestBankStatus:
    def test_debug_endpoint(self, client):
        """/debug devuelve la configuración interna sin llamar a ninguna API."""
        r = client.get("/api/bank/caixa/_debug")
        assert r.status_code == 200
        body = r.json()
        assert "DEMO" in body
        assert "token" in body

    def test_status_sin_token(self, client):
        """/status indica que no hay token vinculado."""
        r = client.get("/api/bank/caixa/status")
        assert r.status_code == 200
        body = r.json()
        assert "linked" in body
        assert body["linked"] is False  # sin token en memoria, no está vinculado


class TestBankLink:
    def test_link_falla_sin_credenciales_reales(self, client):
        """
        En un entorno de test sin credenciales CaixaBank reales,
        el endpoint /link debe devolver un error (4xx o 5xx), nunca 200.
        Si no hay creds, la petición externa falla y eso está bien.
        """
        # Mockeamos requests.post para simular respuesta fallida del banco
        mock_resp = MagicMock()
        mock_resp.status_code = 401
        mock_resp.text = "Unauthorized"

        with patch("requests.post", return_value=mock_resp):
            r = client.post("/api/bank/caixa/link")
        assert r.status_code >= 400
