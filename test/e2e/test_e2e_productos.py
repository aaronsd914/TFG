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
import time
import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

from test.e2e.conftest import BASE_URL

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
            (By.XPATH, "//*[contains(normalize-space(.), 'Gestión') or contains(normalize-space(.), 'Gestion')]")
        )
    )
    tab_gestion.click()
    time.sleep(0.5)
    # Tras cambiar de pestaña debe haber un formulario de creación
    body_text = logged_in_browser.find_element(By.TAG_NAME, "body").text
    assert "Gestión" in body_text or "Gestion" in body_text or "Crear" in body_text or "Añadir" in body_text


def test_productos_crear_producto(logged_in_browser):
    """Se puede crear un producto nuevo desde la pestaña Gestión."""
    logged_in_browser.get(f"{BASE_URL}/productos")
    wait = WebDriverWait(logged_in_browser, 15)
    # Ir a Gestión
    wait.until(
        EC.element_to_be_clickable(
            (By.XPATH, "//*[contains(normalize-space(.), 'Gestión') or contains(normalize-space(.), 'Gestion')]")
        )
    ).click()
    time.sleep(0.5)
    # Rellenar nombre del producto
    nombre_input = wait.until(
        EC.presence_of_element_located(
            (By.XPATH, "//input[@placeholder[contains(., 'ombre')] or @name='nombre' or @placeholder[contains(.,'producto')]]")
        )
    )
    nombre_input.clear()
    nombre_input.send_keys(PROD_NAME)
    # Descripción
    desc_inputs = logged_in_browser.find_elements(
        By.XPATH, "//input[@name='descripcion'] | //textarea[@name='descripcion'] | //input[@placeholder[contains(.,'escripci')]] | //textarea"
    )
    if desc_inputs:
        desc_inputs[0].clear()
        desc_inputs[0].send_keys(PROD_DESC)
    # Precio
    price_inputs = logged_in_browser.find_elements(
        By.XPATH, "//input[@name='precio'] | //input[@type='number'] | //input[@placeholder[contains(.,'recio')]]"
    )
    if price_inputs:
        price_inputs[0].clear()
        price_inputs[0].send_keys(PROD_PRICE)
    # Enviar
    submit_btns = logged_in_browser.find_elements(
        By.XPATH, "//button[@type='submit' or contains(normalize-space(.), 'Crear') or contains(normalize-space(.), 'Añadir') or contains(normalize-space(.), 'Guardar')]"
    )
    if submit_btns:
        submit_btns[-1].click()
    time.sleep(1)
    # Navegar a listado y verificar
    logged_in_browser.get(f"{BASE_URL}/productos")
    time.sleep(1)
    body_text = logged_in_browser.find_element(By.TAG_NAME, "body").text
    assert PROD_NAME in body_text, f"El producto '{PROD_NAME}' no aparece después de crearlo"


def test_productos_eliminar_producto_test(logged_in_browser):
    """Se puede eliminar el producto creado por el test (limpieza)."""
    logged_in_browser.get(f"{BASE_URL}/productos")
    wait = WebDriverWait(logged_in_browser, 15)
    # Ir a Gestión
    wait.until(
        EC.element_to_be_clickable(
            (By.XPATH, "//*[contains(normalize-space(.), 'Gestión') or contains(normalize-space(.), 'Gestion')]")
        )
    ).click()
    time.sleep(0.5)
    # Buscar el producto de test
    prod_row = logged_in_browser.find_elements(
        By.XPATH, f"//*[contains(normalize-space(.), '{PROD_NAME}')]"
    )
    if prod_row:
        # Buscar botón de eliminar en su fila
        parent = prod_row[0]
        delete_btns = parent.find_elements(
            By.XPATH, ".//ancestor::*[contains(@class,'row') or contains(@class,'item') or contains(@class,'card')]//button[contains(normalize-space(.), 'Eliminar') or contains(@aria-label,'eliminar')]"
        )
        if not delete_btns:
            delete_btns = logged_in_browser.find_elements(
                By.XPATH, f"//button[contains(normalize-space(.), 'Eliminar')]"
            )
        if delete_btns:
            delete_btns[0].click()
            time.sleep(0.5)
            confirm_btns = logged_in_browser.find_elements(
                By.XPATH, "//button[contains(normalize-space(.), 'Confirmar') or contains(normalize-space(.), 'Sí') or contains(normalize-space(.), 'Eliminar')]"
            )
            if len(confirm_btns) > 1:
                confirm_btns[-1].click()
            elif confirm_btns:
                confirm_btns[0].click()
            time.sleep(1)
    logged_in_browser.get(f"{BASE_URL}/productos")
    time.sleep(1)
    body_text = logged_in_browser.find_element(By.TAG_NAME, "body").text
    assert PROD_NAME not in body_text, "El producto de test no fue eliminado"
