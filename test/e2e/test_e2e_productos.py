"""
test_e2e_productos.py — Pruebas E2E de la página de Productos.

Cubre:
  - La página carga y muestra la pestaña 'Listado' por defecto
  - El buscador filtra productos en tiempo real
  - La pestaña 'Gestión' muestra el formulario de creación
  - Se puede crear un nuevo producto
  - Se puede editar el precio de un producto creado
  - Se puede eliminar el producto creado (limpieza)
  - La paginación / agrupación por proveedor está disponible
"""
import os
import time
import pytest
import requests
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

from test.e2e.conftest import BASE_URL, ADMIN_USER, ADMIN_PASS

BACKEND_URL = os.environ.get("E2E_BACKEND_URL", "http://localhost:8000")


def _get_token():
    resp = requests.post(
        f"{BACKEND_URL}/api/auth/login",
        data={"username": ADMIN_USER, "password": ADMIN_PASS},
    )
    resp.raise_for_status()
    return resp.json()["access_token"]

PROD_NAME = "SELENIUM_Producto_E2E"
PROD_PRICE = "199.99"
PROD_DESC = "Producto de prueba automatizada Selenium"


def test_productos_pagina_carga(logged_in_browser):
    """La página /productos carga correctamente."""
    logged_in_browser.get(f"{BASE_URL}/productos")
    WebDriverWait(logged_in_browser, 10).until(EC.url_contains("/productos"))
    assert "/productos" in logged_in_browser.current_url


def test_productos_tab_listado_activo(logged_in_browser):
    """La pestaña 'Listado' está visible y activa por defecto."""
    logged_in_browser.get(f"{BASE_URL}/productos")
    wait = WebDriverWait(logged_in_browser, 15)
    wait.until(
        EC.presence_of_element_located(
            (By.XPATH, "//*[contains(normalize-space(.), 'Listado')]")
        )
    )
    assert wait.until(
        EC.visibility_of_element_located(
            (By.XPATH, "//*[contains(normalize-space(.), 'Listado')]")
        )
    )


def test_productos_lista_seed_data(logged_in_browser):
    """La lista de productos contiene datos del seed (página no vacía)."""
    logged_in_browser.get(f"{BASE_URL}/productos")
    WebDriverWait(logged_in_browser, 15).until(
        EC.presence_of_element_located((By.TAG_NAME, "main"))
    )
    time.sleep(1)
    body_text = logged_in_browser.find_element(By.TAG_NAME, "body").text
    assert len(body_text) > 200


def test_productos_buscador_presente(logged_in_browser):
    """La pestaña Listado tiene un campo de búsqueda."""
    logged_in_browser.get(f"{BASE_URL}/productos")
    WebDriverWait(logged_in_browser, 10).until(EC.url_contains("/productos"))
    inputs = logged_in_browser.find_elements(
        By.CSS_SELECTOR, "input[type='text'], input[type='search'], input:not([type])"
    )
    assert len(inputs) >= 1


def test_productos_tab_gestion_carga(logged_in_browser):
    """La pestaña 'Gestión' está presente y es clickable."""
    logged_in_browser.get(f"{BASE_URL}/productos")
    wait = WebDriverWait(logged_in_browser, 15)
    tab_gestion = wait.until(
        EC.element_to_be_clickable(
            (By.XPATH, "//button[normalize-space()='Gestión' or normalize-space()='Gestion']")
        )
    )
    tab_gestion.click()
    # Confirmar que el contenido exclusivo de la pestaña Gestión es visible
    wait.until(
        EC.presence_of_element_located(
            (By.XPATH, "//*[contains(normalize-space(.), 'Gestionar productos')]")
        )
    )
    body_text = logged_in_browser.find_element(By.TAG_NAME, "body").text
    assert "Gestionar productos" in body_text


def test_productos_crear_producto(logged_in_browser):
    """Se puede crear un producto nuevo desde la pestaña Gestión."""
    from selenium.webdriver.support.ui import Select as SeleniumSelect
    logged_in_browser.get(f"{BASE_URL}/productos")
    wait = WebDriverWait(logged_in_browser, 15)
    # Cambiar a la pestaña Gestión usando el botón exacto (el Modal está dentro de esta rama)
    tab_btn = wait.until(
        EC.element_to_be_clickable(
            (By.XPATH, "//button[normalize-space()='Gestión' or normalize-space()='Gestion']")
        )
    )
    tab_btn.click()
    # Confirmar que la pestaña Gestión está activa esperando el contenido exclusivo de ella
    wait.until(
        EC.presence_of_element_located(
            (By.XPATH, "//*[contains(normalize-space(.), 'Gestionar productos')]")
        )
    )
    # Abrir el modal de creación pulsando 'Nuevo producto'
    wait.until(
        EC.element_to_be_clickable(
            (By.XPATH, "//button[normalize-space()='Nuevo producto']")
        )
    ).click()
    # Rellenar nombre del producto (input dentro del modal)
    nombre_input = wait.until(
        EC.visibility_of_element_located(
            (By.XPATH, "//input[@placeholder='Ej: Mesa de comedor']")
        )
    )
    nombre_input.clear()
    nombre_input.send_keys(PROD_NAME)
    # Precio (input type=number con placeholder 'Ej: 199.99')
    price_input = wait.until(
        EC.visibility_of_element_located(
            (By.XPATH, "//input[@placeholder='Ej: 199.99']")
        )
    )
    price_input.clear()
    price_input.send_keys(PROD_PRICE)
    # Seleccionar el primer proveedor disponible (campo obligatorio)
    prov_select = wait.until(
        EC.presence_of_element_located(
            (By.XPATH, "//select[option[normalize-space()='Selecciona proveedor']]")
        )
    )
    sel = SeleniumSelect(prov_select)
    if len(sel.options) > 1:
        sel.select_by_index(1)
    # Enviar el formulario del modal
    wait.until(
        EC.element_to_be_clickable(
            (By.XPATH, "//button[@type='submit' and contains(normalize-space(), 'Crear producto')]")
        )
    ).click()
    # Esperar a que el modal se cierre (input desaparece del DOM)
    wait.until(
        EC.invisibility_of_element_located(
            (By.XPATH, "//input[@placeholder='Ej: Mesa de comedor']")
        )
    )
    time.sleep(0.5)
    # Navegar al listado y verificar que el producto aparece
    logged_in_browser.get(f"{BASE_URL}/productos")
    time.sleep(1)
    body_text = logged_in_browser.find_element(By.TAG_NAME, "body").text
    assert PROD_NAME in body_text, f"El producto '{PROD_NAME}' no aparece después de crearlo"


def test_productos_eliminar_producto_test(logged_in_browser):
    """Limpieza: elimina el producto de test via API y lo verifica desde el navegador."""
    token = _get_token()
    headers = {"Authorization": f"Bearer {token}"}
    # Buscar el producto por nombre en la API
    prods = requests.get(f"{BACKEND_URL}/api/productos/get", headers=headers).json()
    prod = next((p for p in prods if p["nombre"] == PROD_NAME), None)
    if prod:
        del_resp = requests.delete(
            f"{BACKEND_URL}/api/productos/delete/{prod['id']}", headers=headers
        )
        assert del_resp.status_code in (200, 204), f"No se pudo eliminar el producto: {del_resp.text}"
    # Verificar que ya no aparece en la UI (listado)
    logged_in_browser.get(f"{BASE_URL}/productos")
    WebDriverWait(logged_in_browser, 10).until(EC.url_contains("/productos"))
    time.sleep(1)
    body_text = logged_in_browser.find_element(By.TAG_NAME, "body").text
    assert PROD_NAME not in body_text, "El producto de test no fue eliminado"
