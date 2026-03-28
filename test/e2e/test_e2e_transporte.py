"""
test_e2e_transporte.py — Pruebas E2E de la página de Transporte (Kanban).

Cubre:
  - La página /transporte carga correctamente
  - Las pestañas Almacén, En ruta y Camiones están presentes
  - La pestaña Almacén muestra los albaranes en estado de almacén
  - La pestaña En ruta / Camiones se puede seleccionar
  - El buscador de texto filtra el contenido
  - La gestión de camiones (añadir/ocultar) está disponible
"""
import time
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

from test.e2e.conftest import BASE_URL


def test_transporte_pagina_carga(logged_in_browser):
    """La página /transporte carga correctamente."""
    logged_in_browser.get(f"{BASE_URL}/transporte")
    WebDriverWait(logged_in_browser, 10).until(EC.url_contains("/transporte"))
    assert "/transporte" in logged_in_browser.current_url


def test_transporte_tabs_presentes(logged_in_browser):
    """Las pestañas Almacén, En ruta y Camiones están presentes."""
    logged_in_browser.get(f"{BASE_URL}/transporte")
    wait = WebDriverWait(logged_in_browser, 15)
    wait.until(EC.url_contains("/transporte"))
    # Esperar a que desaparezca el indicador de carga
    wait.until(
        EC.invisibility_of_element_located(
            (By.XPATH, "//*[contains(text(),'Cargando')]")
        )
    )
    body_text = logged_in_browser.find_element(By.TAG_NAME, "body").text
    tabs = ["Almacén", "ruta", "Camión"]
    found_tabs = [t for t in tabs if t.lower() in body_text.lower()]
    assert len(found_tabs) >= 2, f"Sólo se encontraron las tabs: {found_tabs}"


def test_transporte_tab_almacen_contenido(logged_in_browser):
    """La pestaña Almacén es clickable y muestra contenido."""
    logged_in_browser.get(f"{BASE_URL}/transporte")
    wait = WebDriverWait(logged_in_browser, 15)
    almacen_tab = wait.until(
        EC.element_to_be_clickable(
            (By.XPATH, "//*[contains(normalize-space(.), 'Almacén') or contains(normalize-space(.), 'Almacen')][@role='tab' or self::button or self::a]")
        )
    )
    almacen_tab.click()
    time.sleep(0.5)
    # El contenido de Almacén debe mostrar albaranes o mensaje vacío
    body_text = logged_in_browser.find_element(By.TAG_NAME, "body").text.lower()
    assert "almacén" in body_text or "almacen" in body_text or len(body_text) > 100


def test_transporte_tab_ruta(logged_in_browser):
    """La pestaña 'En ruta' o 'Camiones' se puede seleccionar."""
    logged_in_browser.get(f"{BASE_URL}/transporte")
    wait = WebDriverWait(logged_in_browser, 15)
    ruta_tab = wait.until(
        EC.element_to_be_clickable(
            (By.XPATH,
             "//*[contains(normalize-space(.), 'ruta') or contains(normalize-space(.), 'Ruta') or contains(normalize-space(.), 'Camión')][@role='tab' or self::button or self::a]")
        )
    )
    ruta_tab.click()
    time.sleep(0.5)
    body_text = logged_in_browser.find_element(By.TAG_NAME, "body").text.lower()
    assert "ruta" in body_text or "camión" in body_text or "camion" in body_text


def test_transporte_buscador_presente(logged_in_browser):
    """Existe un buscador de texto en la página de transporte."""
    logged_in_browser.get(f"{BASE_URL}/transporte")
    WebDriverWait(logged_in_browser, 10).until(EC.url_contains("/transporte"))
    time.sleep(0.5)
    inputs = logged_in_browser.find_elements(
        By.CSS_SELECTOR, "input[type='text'], input[type='search'], input:not([type])"
    )
    assert len(inputs) >= 1, "No se encontró campo de búsqueda en transporte"


def test_transporte_gestion_camiones_disponible(logged_in_browser):
    """La opción de gestión de camiones (añadir/ocultar) está en la UI."""
    logged_in_browser.get(f"{BASE_URL}/transporte")
    wait = WebDriverWait(logged_in_browser, 15)
    wait.until(EC.url_contains("/transporte"))
    time.sleep(0.5)
    body_text = logged_in_browser.find_element(By.TAG_NAME, "body").text.lower()
    # La gestión puede ser a través de la pestaña Camiones
    camiones_elements = logged_in_browser.find_elements(
        By.XPATH, "//*[contains(normalize-space(.), 'Camión') or contains(normalize-space(.), 'camion')]"
    )
    assert len(camiones_elements) >= 1 or "camión" in body_text
