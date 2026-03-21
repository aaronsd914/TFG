"""
test_emailer.py — Tests de las funciones de envío de email.

Cubre:
  - _html_to_text(): conversión HTML → texto plano
  - send_email_simple(): envío por SMTP (mockeado) y por Resend (mockeado)
"""
import pytest
from unittest.mock import patch, MagicMock

from backend.app.utils.emailer import send_email_simple, _html_to_text


# ── _html_to_text ─────────────────────────────────────────────────────────────
class TestHtmlToText:
    def test_cadena_vacia_devuelve_vacia(self):
        assert _html_to_text("") == ""

    def test_elimina_tags_html(self):
        text = _html_to_text("<p>Hola <b>mundo</b></p>")
        assert "Hola" in text
        assert "mundo" in text
        assert "<" not in text

    def test_elimina_bloque_script(self):
        text = _html_to_text("<script>alert(1)</script><p>seguro</p>")
        assert "alert" not in text
        assert "seguro" in text

    def test_convierte_entidades_html(self):
        text = _html_to_text("<p>A &amp; B &lt; C &gt; D &nbsp; E</p>")
        assert "&amp;" not in text
        assert "&lt;" not in text


# ── send_email_simple ─────────────────────────────────────────────────────────
class TestSendEmailSimple:
    def test_usa_smtp_cuando_no_hay_resend_key(self):
        with patch("backend.app.utils.emailer._send_via_smtp") as mock_smtp, \
             patch("backend.app.utils.emailer.RESEND_API_KEY", ""):
            send_email_simple("to@test.com", "Asunto de prueba", "<p>Hola</p>")
        mock_smtp.assert_called_once()

    def test_usa_resend_cuando_hay_resend_key(self):
        with patch("backend.app.utils.emailer._send_via_resend") as mock_resend, \
             patch("backend.app.utils.emailer.RESEND_API_KEY", "re_test_key"):
            send_email_simple("to@test.com", "Asunto", "<p>Hola</p>")
        mock_resend.assert_called_once()

    def test_mensaje_smtp_incluye_destinatario(self):
        captured = {}

        def fake_smtp(msg, to):
            captured["to"] = to
            captured["msg"] = msg

        with patch("backend.app.utils.emailer._send_via_smtp", side_effect=fake_smtp), \
             patch("backend.app.utils.emailer.RESEND_API_KEY", ""):
            send_email_simple("dest@example.com", "Subj", "<b>Body</b>")

        assert captured["to"] == "dest@example.com"
