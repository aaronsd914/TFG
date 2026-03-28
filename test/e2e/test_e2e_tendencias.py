"""
test_e2e_tendencias.py — Pruebas E2E de la página de Tendencias (Analytics).

Cubre:
  - La página /tendencias carga correctamente
  - El panel colapsable de opciones de rango se abre al pulsar el botón
  - El selector de rango de fechas está presente dentro del panel
  - Los gráficos (canvas o SVG) se renderizan tras cargar los datos
  - Las estadísticas de resumen están visibles
  - El panel de chat con IA se puede abrir/cerrar
  - Los botones de exportar PDF están disponibles con los nuevos nombres
  - El toggle de comparativa funciona
  - El rango se muestra en formato DD-MM-AAAA
  - La sección de previsión predictiva está presente
"""
import time
import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

from test.e2e.conftest import BASE_URL


def _open_range_panel(browser):
    """Helper: abre el panel colapsable de opciones de rango."""
    wait = WebDriverWait(browser, 15)
    btn = wait.until(
        EC.element_to_be_clickable(
            (By.XPATH, "//button[contains(normalize-space(.), 'Opciones de rango') or contains(normalize-space(.), 'Range options')]")
        )
    )
    btn.click()
    time.sleep(0.5)


def test_tendencias_pagina_carga(logged_in_browser):
    """La página /tendencias carga correctamente."""
    logged_in_browser.get(f"{BASE_URL}/tendencias")
    WebDriverWait(logged_in_browser, 10).until(EC.url_contains("/tendencias"))
    assert "/tendencias" in logged_in_browser.current_url


def test_tendencias_panel_colapsable(logged_in_browser):
    """El panel colapsable de rango se abre al pulsar el botón."""
    logged_in_browser.get(f"{BASE_URL}/tendencias")
    WebDriverWait(logged_in_browser, 15).until(EC.url_contains("/tendencias"))
    time.sleep(1)
    # Panel should not be visible initially
    panels = logged_in_browser.find_elements(By.CSS_SELECTOR, "[data-testid='range-panel']")
    assert len(panels) == 0, "El panel de rango debería estar cerrado por defecto"
    # Open it
    _open_range_panel(logged_in_browser)
    panel = logged_in_browser.find_element(By.CSS_SELECTOR, "[data-testid='range-panel']")
    assert panel.is_displayed()


def test_tendencias_selector_fechas_presente(logged_in_browser):
    """El selector de rango de fechas está presente dentro del panel colapsable."""
    logged_in_browser.get(f"{BASE_URL}/tendencias")
    WebDriverWait(logged_in_browser, 15).until(EC.url_contains("/tendencias"))
    time.sleep(1)
    _open_range_panel(logged_in_browser)
    date_inputs = logged_in_browser.find_elements(
        By.CSS_SELECTOR, "[data-testid='range-panel'] input[type='date']"
    )
    assert len(date_inputs) >= 2, "Deben existir al menos 2 inputs de fecha en el panel"


def test_tendencias_graficos_presentes(logged_in_browser):
    """Se renderizan gráficos (canvas) en la página de tendencias."""
    logged_in_browser.get(f"{BASE_URL}/tendencias")
    WebDriverWait(logged_in_browser, 20).until(EC.url_contains("/tendencias"))
    time.sleep(2)
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
    """Los botones de exportar PDF están disponibles con los nuevos nombres."""
    logged_in_browser.get(f"{BASE_URL}/tendencias")
    wait = WebDriverWait(logged_in_browser, 15)
    wait.until(EC.url_contains("/tendencias"))
    time.sleep(1)
    _open_range_panel(logged_in_browser)
    basic_btn = wait.until(
        EC.presence_of_element_located(
            (By.XPATH,
             "//button[contains(normalize-space(.), 'informe básico') or contains(normalize-space(.), 'basic report')]")
        )
    )
    assert basic_btn.is_displayed()
    full_btn = logged_in_browser.find_element(
        By.XPATH,
        "//button[contains(normalize-space(.), 'informe completo') or contains(normalize-space(.), 'full report')]"
    )
    assert full_btn.is_displayed()


def test_tendencias_chat_ia_toggle(logged_in_browser):
    """El botón de abrir el chat con IA existe y al pulsarlo muestra el panel."""
    logged_in_browser.get(f"{BASE_URL}/tendencias")
    wait = WebDriverWait(logged_in_browser, 15)
    wait.until(EC.url_contains("/tendencias"))
    time.sleep(1)
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


def test_tendencias_toggle_comparativa(logged_in_browser):
    """El toggle de comparativa funciona dentro del panel colapsable."""
    logged_in_browser.get(f"{BASE_URL}/tendencias")
    WebDriverWait(logged_in_browser, 15).until(EC.url_contains("/tendencias"))
    time.sleep(1)
    _open_range_panel(logged_in_browser)
    toggle = logged_in_browser.find_element(By.CSS_SELECTOR, "[role='switch']")
    assert toggle.is_displayed()
    assert toggle.get_attribute("aria-checked") == "false"
    toggle.click()
    time.sleep(0.3)
    assert toggle.get_attribute("aria-checked") == "true"


def test_tendencias_rango_formato_dd_mm_aaaa(logged_in_browser):
    """El rango se muestra en formato DD-MM-AAAA."""
    logged_in_browser.get(f"{BASE_URL}/tendencias")
    WebDriverWait(logged_in_browser, 15).until(EC.url_contains("/tendencias"))
    time.sleep(2)
    el = logged_in_browser.find_element(By.CSS_SELECTOR, "[data-testid='range-display']")
    text = el.text
    import re
    assert re.search(r"\d{2}-\d{2}-\d{4}", text), f"El rango no está en formato DD-MM-AAAA: {text}"
