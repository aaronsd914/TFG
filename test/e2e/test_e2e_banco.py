"""
test_e2e_banco.py — Pruebas E2E de la página de Banco (integración Stripe).

Cubre:
  - La página /banco carga correctamente
  - El botón "Nuevo cobro" está presente
  - El modal de nuevo cobro se abre y se puede cerrar
  - Los campos de importe y descripción existen en el modal
  - La tabla de cobros está presente
"""
import time
import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

from test.e2e.conftest import BASE_URL


def test_banco_pagina_carga(logged_in_browser):
    """La página /banco carga correctamente."""
    logged_in_browser.get(f"{BASE_URL}/banco")
    WebDriverWait(logged_in_browser, 10).until(EC.url_contains("/banco"))
    assert "/banco" in logged_in_browser.current_url


def test_banco_boton_nuevo_cobro_presente(logged_in_browser):
    """El botón 'Nuevo cobro' está visible en la página."""
    logged_in_browser.get(f"{BASE_URL}/banco")
    WebDriverWait(logged_in_browser, 15).until(EC.url_contains("/banco"))
    time.sleep(1)
    btn = WebDriverWait(logged_in_browser, 10).until(
        EC.presence_of_element_located((By.CSS_SELECTOR, "[data-testid='nuevo-cobro-btn']"))
    )
    assert btn.is_displayed()


def test_banco_no_muestra_boton_refrescar(logged_in_browser):
    """El botón de refrescar ya no existe en la página."""
    logged_in_browser.get(f"{BASE_URL}/banco")
    WebDriverWait(logged_in_browser, 15).until(EC.url_contains("/banco"))
    time.sleep(1)
    body_text = logged_in_browser.find_element(By.TAG_NAME, "body").text.lower()
    assert "refrescar" not in body_text


def test_banco_no_muestra_card_estado(logged_in_browser):
    """La card de estado de Stripe (configurado/no configurado) ya no existe."""
    logged_in_browser.get(f"{BASE_URL}/banco")
    WebDriverWait(logged_in_browser, 15).until(EC.url_contains("/banco"))
    time.sleep(1)
    body_text = logged_in_browser.find_element(By.TAG_NAME, "body").text.lower()
    assert "configurado" not in body_text


def test_banco_tabla_cobros_presente(logged_in_browser):
    """La tabla de cobros está presente en la página."""
    logged_in_browser.get(f"{BASE_URL}/banco")
    WebDriverWait(logged_in_browser, 15).until(EC.url_contains("/banco"))
    time.sleep(1)
    table = WebDriverWait(logged_in_browser, 10).until(
        EC.presence_of_element_located((By.CSS_SELECTOR, "[data-testid='cobros-table']"))
    )
    assert table.is_displayed()


def test_banco_modal_abre_al_click(logged_in_browser):
    """Al pulsar 'Nuevo cobro' se abre el modal."""
    logged_in_browser.get(f"{BASE_URL}/banco")
    WebDriverWait(logged_in_browser, 15).until(EC.url_contains("/banco"))
    time.sleep(1)
    btn = WebDriverWait(logged_in_browser, 10).until(
        EC.element_to_be_clickable((By.CSS_SELECTOR, "[data-testid='nuevo-cobro-btn']"))
    )
    btn.click()
    time.sleep(0.5)
    modal = WebDriverWait(logged_in_browser, 5).until(
        EC.presence_of_element_located((By.CSS_SELECTOR, "[data-testid='nuevo-cobro-modal']"))
    )
    assert modal.is_displayed()


def test_banco_modal_tiene_campos(logged_in_browser):
    """El modal de nuevo cobro contiene inputs de importe y descripción."""
    logged_in_browser.get(f"{BASE_URL}/banco")
    WebDriverWait(logged_in_browser, 15).until(EC.url_contains("/banco"))
    time.sleep(1)
    logged_in_browser.find_element(By.CSS_SELECTOR, "[data-testid='nuevo-cobro-btn']").click()
    time.sleep(0.5)
    assert logged_in_browser.find_element(By.CSS_SELECTOR, "[data-testid='cobro-amount-input']").is_displayed()
    assert logged_in_browser.find_element(By.CSS_SELECTOR, "[data-testid='cobro-desc-input']").is_displayed()


def test_banco_modal_cancelar_cierra(logged_in_browser):
    """El botón Cancelar del modal cierra el modal."""
    logged_in_browser.get(f"{BASE_URL}/banco")
    WebDriverWait(logged_in_browser, 15).until(EC.url_contains("/banco"))
    time.sleep(1)
    logged_in_browser.find_element(By.CSS_SELECTOR, "[data-testid='nuevo-cobro-btn']").click()
    time.sleep(0.5)
    logged_in_browser.find_element(By.CSS_SELECTOR, "[data-testid='cobro-cancel-btn']").click()
    time.sleep(0.5)
    modals = logged_in_browser.find_elements(By.CSS_SELECTOR, "[data-testid='nuevo-cobro-modal']")
    assert len(modals) == 0
