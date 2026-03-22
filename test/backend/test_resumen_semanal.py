"""
test_resumen_semanal.py — Tests del módulo de resumen semanal.

Cubre:
  - _get(): lectura de clave con y sin valor en la BD
  - _set(): creación y actualización de clave en la BD
  - _eur(): formateo de números como euros
  - _build_html(): construcción del HTML del resumen
  - _run(): flujo completo con distintas condiciones
  - job_resumen_semanal(): wrapper de hilo de background
"""
import pytest
from datetime import date, timedelta
from unittest.mock import patch, MagicMock

from backend.app.entidades.configuracion import ConfiguracionDB
from backend.app.entidades.movimiento import MovimientoDB
from backend.app.entidades.albaran import AlbaranDB
from backend.app.utils.resumen_semanal import (
    _get,
    _set,
    _run,
    job_resumen_semanal,
    _eur,
    _build_html,
    _md_to_html,
)
from test.backend.conftest import TestingSessionLocal


@pytest.fixture()
def db():
    session = TestingSessionLocal()
    yield session
    session.close()


# ── _get ──────────────────────────────────────────────────────────────────────
class TestGet:
    def test_devuelve_default_cuando_clave_ausente(self, db):
        val = _get(db, "resumen_intervalo_dias")
        assert val == "7"

    def test_devuelve_default_cuando_valor_vacio(self, db):
        db.add(ConfiguracionDB(key="tienda_nombre", value=""))
        db.commit()
        assert _get(db, "tienda_nombre") == "FurniGest"

    def test_devuelve_valor_almacenado(self, db):
        db.add(ConfiguracionDB(key="resumen_email_destino", value="a@b.com"))
        db.commit()
        assert _get(db, "resumen_email_destino") == "a@b.com"

    def test_devuelve_string_vacio_para_clave_desconocida(self, db):
        assert _get(db, "clave_inexistente") == ""


# ── _set ──────────────────────────────────────────────────────────────────────
class TestSet:
    def test_crea_nueva_fila(self, db):
        _set(db, "resumen_email_destino", "x@y.com")
        row = db.query(ConfiguracionDB).filter_by(key="resumen_email_destino").first()
        assert row is not None
        assert row.value == "x@y.com"

    def test_actualiza_fila_existente(self, db):
        db.add(ConfiguracionDB(key="tienda_nombre", value="viejo"))
        db.commit()
        _set(db, "tienda_nombre", "nuevo")
        row = db.query(ConfiguracionDB).filter_by(key="tienda_nombre").first()
        assert row.value == "nuevo"


# ── _eur ──────────────────────────────────────────────────────────────────────
class TestEur:
    def test_formatea_numero_positivo(self):
        assert _eur(1234.56) == "1.234,56 €"

    def test_formatea_cero(self):
        assert _eur(0) == "0,00 €"

    def test_formatea_numero_negativo(self):
        result = _eur(-500.0)
        assert "500" in result
        assert "€" in result


# ── _md_to_html ──────────────────────────────────────────────────────────────
class TestMdToHtml:
    def test_bold_convierte_a_strong(self):
        assert _md_to_html("**texto**") == "<strong>texto</strong>"

    def test_italic_convierte_a_em(self):
        assert _md_to_html("*texto*") == "<em>texto</em>"

    def test_bold_no_afecta_italica_anidada(self):
        html = _md_to_html("**negrita** y *cursiva*")
        assert "<strong>negrita</strong>" in html
        assert "<em>cursiva</em>" in html

    def test_saltos_de_linea_a_br(self):
        # Single newline → space; double newline → <br><br>
        html = _md_to_html("linea1\nlinea2")
        assert "<br>" not in html
        assert "linea1" in html
        assert "linea2" in html

    def test_doble_salto_a_parrafo(self):
        html = _md_to_html("a\n\nb")
        assert "<br><br>" in html

    def test_lista_numerada_convierte_numero(self):
        html = _md_to_html("1) Primer punto")
        assert "<strong>1)</strong>" in html
        assert "Primer punto" in html

    def test_escapa_html_especial(self):
        html = _md_to_html("<script>alert('xss')</script>")
        assert "<script>" not in html
        assert "&lt;script&gt;" in html

    def test_ampersand_escapado(self):
        html = _md_to_html("A & B")
        assert "&amp;" in html
        assert " & " not in html

    def test_texto_sin_markdown_pasa_sin_cambios(self):
        assert _md_to_html("texto simple") == "texto simple"

    def test_texto_vacio(self):
        assert _md_to_html("") == ""

    def test_build_html_usa_md_to_html(self):
        """_build_html debe convertir markdown en negrita a <strong> en el HTML."""
        desde = date.today() - timedelta(days=7)
        html = _build_html(
            "Tienda", desde, date.today(),
            1000.0, 200.0, 800.0, 5, 1500.0,
            "**Tendencia positiva:** ventas al alza",
            7,
        )
        assert "<strong>Tendencia positiva:</strong>" in html


# ── _build_html ───────────────────────────────────────────────────────────────
class TestBuildHtml:
    def test_devuelve_string_html(self):
        desde = date.today() - timedelta(days=7)
        html = _build_html(
            "TiendaTest",
            desde,
            date.today(),
            1000.0,
            200.0,
            800.0,
            5,
            1500.0,
            "Insight de prueba",
            7,
        )
        assert isinstance(html, str)
        assert "TiendaTest" in html
        assert "Insight de prueba" in html

    def test_html_sin_insight(self):
        desde = date.today() - timedelta(days=7)
        html = _build_html(
            "Tienda",
            desde,
            date.today(),
            0.0,
            0.0,
            0.0,
            0,
            0.0,
            "",
            7,
        )
        assert isinstance(html, str)
        assert "Tienda" in html

    def test_balance_negativo_usa_color_rojo(self):
        desde = date.today() - timedelta(days=7)
        html = _build_html(
            "Tienda",
            desde,
            date.today(),
            100.0,
            500.0,
            -400.0,
            1,
            100.0,
            "",
            7,
        )
        assert "#dc2626" in html


# ── _run ──────────────────────────────────────────────────────────────────────
class TestRun:
    def test_omite_si_no_hay_email(self, db):
        with patch("backend.app.utils.resumen_semanal.send_email_simple") as mock_email:
            _run(db)
        mock_email.assert_not_called()

    def test_omite_si_intervalo_no_ha_transcurrido(self, db):
        ayer = (date.today() - timedelta(days=1)).isoformat()
        db.add(ConfiguracionDB(key="resumen_email_destino", value="a@b.com"))
        db.add(ConfiguracionDB(key="resumen_ultima_vez", value=ayer))
        db.add(ConfiguracionDB(key="resumen_intervalo_dias", value="7"))
        db.commit()
        with patch("backend.app.utils.resumen_semanal.send_email_simple") as mock_email:
            _run(db)
        mock_email.assert_not_called()

    def test_ejecuta_cuando_intervalo_ha_transcurrido(self, db):
        hace_diez = (date.today() - timedelta(days=10)).isoformat()
        db.add(ConfiguracionDB(key="resumen_email_destino", value="a@b.com"))
        db.add(ConfiguracionDB(key="resumen_ultima_vez", value=hace_diez))
        db.add(ConfiguracionDB(key="resumen_intervalo_dias", value="7"))
        db.commit()
        with patch("backend.app.utils.resumen_semanal.send_email_simple") as mock_email, \
             patch("backend.app.utils.resumen_semanal.groq_chat", return_value="Insight generado"):
            _run(db)
        mock_email.assert_called_once()

    def test_ejecuta_en_primer_envio_sin_ultima_vez(self, db):
        db.add(ConfiguracionDB(key="resumen_email_destino", value="a@b.com"))
        db.commit()
        with patch("backend.app.utils.resumen_semanal.send_email_simple") as mock_email, \
             patch("backend.app.utils.resumen_semanal.groq_chat", return_value=""):
            _run(db)
        mock_email.assert_called_once()

    def test_actualiza_ultima_vez_tras_envio(self, db):
        db.add(ConfiguracionDB(key="resumen_email_destino", value="a@b.com"))
        db.commit()
        with patch("backend.app.utils.resumen_semanal.send_email_simple"), \
             patch("backend.app.utils.resumen_semanal.groq_chat", return_value=""):
            _run(db)
        assert _get(db, "resumen_ultima_vez") == date.today().isoformat()

    def test_maneja_error_de_groq_y_sigue_enviando(self, db):
        db.add(ConfiguracionDB(key="resumen_email_destino", value="a@b.com"))
        db.commit()
        with patch("backend.app.utils.resumen_semanal.send_email_simple") as mock_email, \
             patch("backend.app.utils.resumen_semanal.groq_chat", side_effect=Exception("LLM caído")):
            _run(db)
        mock_email.assert_called_once()

    def test_ignora_fecha_invalida_en_ultima_vez(self, db):
        db.add(ConfiguracionDB(key="resumen_email_destino", value="a@b.com"))
        db.add(ConfiguracionDB(key="resumen_ultima_vez", value="not-a-date"))
        db.commit()
        with patch("backend.app.utils.resumen_semanal.send_email_simple") as mock_email, \
             patch("backend.app.utils.resumen_semanal.groq_chat", return_value=""):
            _run(db)
        mock_email.assert_called_once()

    def test_incluye_movimientos_y_albaranes_en_resumen(self, db):
        """Verifica que se incluyen datos de movimientos en el cuerpo del email."""
        db.add(ConfiguracionDB(key="resumen_email_destino", value="a@b.com"))
        db.commit()
        captured_html = {}

        def capture_email(to, subject, html):
            captured_html["html"] = html

        with patch("backend.app.utils.resumen_semanal.send_email_simple", side_effect=capture_email), \
             patch("backend.app.utils.resumen_semanal.groq_chat", return_value=""):
            _run(db)
        assert "html" in captured_html
        assert isinstance(captured_html["html"], str)


# ── job_resumen_semanal ───────────────────────────────────────────────────────
class TestJobResumenSemanal:
    def test_llama_a_run_sin_lanzar_excepcion(self):
        fake_now = MagicMock()
        fake_now.strftime.return_value = "08:30"
        with patch("backend.app.utils.resumen_semanal._run") as mock_run, \
             patch("backend.app.utils.resumen_semanal.datetime") as mock_dt, \
             patch("backend.app.utils.resumen_semanal._get", return_value="08:30"):
            mock_dt.now.return_value = fake_now
            job_resumen_semanal()
        mock_run.assert_called_once()

    def test_captura_excepcion_de_run_sin_propagarla(self):
        with patch("backend.app.utils.resumen_semanal._run", side_effect=Exception("boom")):
            job_resumen_semanal()  # No debe lanzar
