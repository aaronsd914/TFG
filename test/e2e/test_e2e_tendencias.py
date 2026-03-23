"""
test_e2e_tendencias.py — Pruebas E2E de la página de Tendencias (Analytics).

Cubre:
  - La página /tendencias carga correctamente
  - El selector de rango de fechas está presente
  - Los gráficos (canvas o SVG) se renderizan tras cargar los datos
  - Las estadísticas de resumen están visibles
  - El panel de chat con IA se puede abrir/cerrar
  - El botón de exportar PDF está disponible
"""
import time
import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

from test.e2e.conftest import BASE_URL


def test_tendencias_pagina_carga(logged_in_browser):
    """La página /tendencias carga correctamente."""
    logged_in_browser.get(f"{BASE_URL}/tendencias")
    WebDriverWait(logged_in_browser, 10).until(EC.url_contains("/tendencias"))
    assert "/tendencias" in logged_in_browser.current_url


def test_tendencias_selector_fechas_presente(logged_in_browser):
    """El selector de rango de fechas está presente en la página."""
    logged_in_browser.get(f"{BASE_URL}/tendencias")
    WebDriverWait(logged_in_browser, 15).until(EC.url_contains("/tendencias"))
    time.sleep(1)
    # Puede ser un input date, un date range picker o un par de inputs
    date_inputs = logged_in_browser.find_elements(
        By.CSS_SELECTOR, "input[type='date'], input[type='text'][class*='date'], input[placeholder*='fecha'], input[placeholder*='Fecha']"
    )
    body_text = logged_in_browser.find_element(By.TAG_NAME, "body").text.lower()
    has_date_text = any(kw in body_text for kw in ["fecha", "desde", "hasta", "rango"])
    assert len(date_inputs) >= 1 or has_date_text


def test_tendencias_graficos_presentes(logged_in_browser):
    """Se renderizan gráficos (canvas) en la página de tendencias."""
    logged_in_browser.get(f"{BASE_URL}/tendencias")
    WebDriverWait(logged_in_browser, 20).until(EC.url_contains("/tendencias"))
    time.sleep(2)  # Esperar a que los gráficos carguen los datos
    canvases = logged_in_browser.find_elements(By.TAG_NAME, "canvas")
    svgs = logged_in_browser.find_elements(By.TAG_NAME, "svg")
    assert len(canvases) + len(svgs) >= 1, "No se encontraron gráficos en Tendencias"


def test_tendencias_estadisticas_resumen(logged_in_browser):
    """Las estadísticas de resumen (ingresos, ventas, etc.) están visibles."""
    logged_in_browser.get(f"{BASE_URL}/tendencias")
    WebDriverWait(logged_in_browser, 15).until(EC.url_contains("/tendencias"))
    time.sleep(2)
    body_text = logged_in_browser.find_element(By.TAG_NAME, "body").text.lower()
    metrics = ["ingreso", "venta", "total", "cliente", "albarán", "albaran"]
    found = any(m in body_text for m in metrics)
    assert found, "No se encontraron estadísticas de resumen en Tendencias"


def test_tendencias_boton_exportar_pdf(logged_in_browser):
    """El botón de exportar PDF está disponible."""
    logged_in_browser.get(f"{BASE_URL}/tendencias")
    wait = WebDriverWait(logged_in_browser, 15)
    wait.until(EC.url_contains("/tendencias"))
    time.sleep(1)
    pdf_btn = wait.until(
        EC.presence_of_element_located(
            (By.XPATH,
             "//button[contains(normalize-space(.), 'PDF') or contains(normalize-space(.), 'Exportar') or contains(normalize-space(.), 'Informe')]")
        )
    )
    assert pdf_btn.is_displayed()


def test_tendencias_chat_ia_toggle(logged_in_browser):
    """El botón de abrir el chat con IA existe y al pulsarlo muestra el panel."""
    logged_in_browser.get(f"{BASE_URL}/tendencias")
    wait = WebDriverWait(logged_in_browser, 15)
    wait.until(EC.url_contains("/tendencias"))
    time.sleep(1)
    # Buscar botón del chat IA
    chat_btn = wait.until(
        EC.element_to_be_clickable(
            (By.XPATH,
             "//button[contains(normalize-space(.), 'IA') or contains(normalize-space(.), 'Chat') or contains(normalize-space(.), 'Asistente') or contains(@aria-label, 'chat') or contains(@aria-label, 'IA')]")
        )
    )
    chat_btn.click()
    time.sleep(0.5)
    body_text = logged_in_browser.find_element(By.TAG_NAME, "body").text.lower()
    assert "chat" in body_text or "ia" in body_text or "asistente" in body_text or "mensaje" in body_text


def test_tendencias_prevision_presente(logged_in_browser):
    """La sección de previsión predictiva se renderiza en la página de tendencias."""
    logged_in_browser.get(f"{BASE_URL}/tendencias")
    WebDriverWait(logged_in_browser, 20).until(EC.url_contains("/tendencias"))
    time.sleep(3)  # wait for prediction fetch to complete
    body_text = logged_in_browser.find_element(By.TAG_NAME, "body").text.lower()
    # The prediction section title and/or month labels should be visible
    keywords = ["previsión", "prevision", "forecast", "holt", "estimado"]
    found = any(kw in body_text for kw in keywords)
    assert found, "No se encontró la sección de previsión en la página de Tendencias"
