"""
test_e2e_incidencias.py — Pruebas E2E de la página de Incidencias.

Cubre:
  - La página /incidencias carga correctamente
  - El botón "Nueva incidencia" está presente
  - El modal de creación se abre y se puede cerrar
  - El buscador de incidencias está disponible
  - La sección de incidencias existe en el Dashboard
  - El enlace al listado completo desde el Dashboard funciona
"""
import time
import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

from test.e2e.conftest import BASE_URL


def test_incidencias_pagina_carga(logged_in_browser):
    """La página /incidencias carga correctamente."""
    logged_in_browser.get(f"{BASE_URL}/incidencias")
    WebDriverWait(logged_in_browser, 10).until(EC.url_contains("/incidencias"))
    assert "/incidencias" in logged_in_browser.current_url


def test_incidencias_boton_nueva_incidencia_visible(logged_in_browser):
    """El botón 'Nueva incidencia' está presente en la página."""
    logged_in_browser.get(f"{BASE_URL}/incidencias")
    WebDriverWait(logged_in_browser, 10).until(EC.url_contains("/incidencias"))
    time.sleep(1)
    btn = WebDriverWait(logged_in_browser, 10).until(
        EC.presence_of_element_located((By.CSS_SELECTOR, "[data-testid='create-incidencia-btn']"))
    )
    assert btn.is_displayed()


def test_incidencias_modal_crear_se_abre(logged_in_browser):
    """Al pulsar 'Nueva incidencia' se abre el modal de creación."""
    logged_in_browser.get(f"{BASE_URL}/incidencias")
    WebDriverWait(logged_in_browser, 10).until(EC.url_contains("/incidencias"))
    time.sleep(1)
    btn = WebDriverWait(logged_in_browser, 10).until(
        EC.element_to_be_clickable((By.CSS_SELECTOR, "[data-testid='create-incidencia-btn']"))
    )
    btn.click()
    time.sleep(0.5)
    modal = WebDriverWait(logged_in_browser, 5).until(
        EC.presence_of_element_located((By.CSS_SELECTOR, "[data-testid='create-incidencia-modal']"))
    )
    assert modal.is_displayed()


def test_incidencias_modal_cancelar_cierra(logged_in_browser):
    """El botón Cancelar del modal cierra el modal de creación."""
    logged_in_browser.get(f"{BASE_URL}/incidencias")
    WebDriverWait(logged_in_browser, 10).until(EC.url_contains("/incidencias"))
    time.sleep(1)
    btn = WebDriverWait(logged_in_browser, 10).until(
        EC.element_to_be_clickable((By.CSS_SELECTOR, "[data-testid='create-incidencia-btn']"))
    )
    btn.click()
    time.sleep(0.5)
    cancel_btn = WebDriverWait(logged_in_browser, 5).until(
        EC.element_to_be_clickable((By.CSS_SELECTOR, "[data-testid='create-cancel-btn']"))
    )
    cancel_btn.click()
    time.sleep(0.5)
    modals = logged_in_browser.find_elements(By.CSS_SELECTOR, "[data-testid='create-incidencia-modal']")
    assert len(modals) == 0


def test_incidencias_buscador_presente(logged_in_browser):
    """El campo de búsqueda está disponible en la página de incidencias."""
    logged_in_browser.get(f"{BASE_URL}/incidencias")
    WebDriverWait(logged_in_browser, 10).until(EC.url_contains("/incidencias"))
    time.sleep(1)
    search = WebDriverWait(logged_in_browser, 10).until(
        EC.presence_of_element_located((By.CSS_SELECTOR, "[data-testid='incidencias-search']"))
    )
    assert search.is_displayed()


def test_incidencias_sidebar_enlace_presente(logged_in_browser):
    """La barra lateral tiene un enlace a /incidencias."""
    logged_in_browser.get(f"{BASE_URL}/dashboard")
    WebDriverWait(logged_in_browser, 10).until(EC.url_contains("/dashboard"))
    time.sleep(1)
    links = logged_in_browser.find_elements(By.CSS_SELECTOR, "a[href*='incidencias']")
    assert len(links) >= 1


def test_incidencias_seccion_en_dashboard(logged_in_browser):
    """El Dashboard muestra la sección de incidencias."""
    logged_in_browser.get(f"{BASE_URL}/dashboard")
    WebDriverWait(logged_in_browser, 10).until(EC.url_contains("/dashboard"))
    time.sleep(2)
    section = WebDriverWait(logged_in_browser, 10).until(
        EC.presence_of_element_located((By.CSS_SELECTOR, "[data-testid='dashboard-incidencias-section']"))
    )
    assert section.is_displayed()


def test_incidencias_link_desde_dashboard(logged_in_browser):
    """El Dashboard tiene un enlace que lleva a la vista completa de incidencias."""
    logged_in_browser.get(f"{BASE_URL}/dashboard")
    WebDriverWait(logged_in_browser, 10).until(EC.url_contains("/dashboard"))
    time.sleep(2)
    link = WebDriverWait(logged_in_browser, 10).until(
        EC.element_to_be_clickable((By.CSS_SELECTOR, "[data-testid='dashboard-incidencias-link']"))
    )
    link.click()
    WebDriverWait(logged_in_browser, 10).until(EC.url_contains("/incidencias"))
    assert "/incidencias" in logged_in_browser.current_url
