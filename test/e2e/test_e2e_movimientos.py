"""
test_e2e_movimientos.py — Pruebas E2E de la página de Movimientos financieros.

Cubre:
  - La página carga y muestra el resumen mensual (ingresos/egresos/balance)
  - La lista de movimientos contiene datos del seed
  - El botón para añadir un movimiento está presente
  - Se puede añadir un movimiento de tipo INGRESO
  - Se puede añadir un movimiento de tipo EGRESO
  - El modal de filtros se puede abrir
"""
import time
import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

from test.e2e.conftest import BASE_URL

MOV_CONCEPTO_ING = "SELENIUM_TEST_Ingreso"
MOV_CONCEPTO_EGR = "SELENIUM_TEST_Egreso"
MOV_CANTIDAD = "150.00"


def test_movimientos_pagina_carga(logged_in_browser):
    """La página /movimientos carga correctamente."""
    logged_in_browser.get(f"{BASE_URL}/movimientos")
    WebDriverWait(logged_in_browser, 10).until(EC.url_contains("/movimientos"))
    assert "/movimientos" in logged_in_browser.current_url


def test_movimientos_resumen_mensual_presente(logged_in_browser):
    """El panel de resumen mensual (ingresos, egresos, balance) está visible."""
    logged_in_browser.get(f"{BASE_URL}/movimientos")
    WebDriverWait(logged_in_browser, 15).until(EC.url_contains("/movimientos"))
    time.sleep(1)
    body_text = logged_in_browser.find_element(By.TAG_NAME, "body").text.lower()
    keywords = ["ingreso", "egreso", "balance", "total"]
    found_keywords = [kw for kw in keywords if kw in body_text]
    assert len(found_keywords) >= 2, f"Solo se encontraron {found_keywords} de {keywords}"


def test_movimientos_lista_seed_data(logged_in_browser):
    """La lista de movimientos tiene datos del seed."""
    logged_in_browser.get(f"{BASE_URL}/movimientos")
    WebDriverWait(logged_in_browser, 15).until(EC.url_contains("/movimientos"))
    time.sleep(1)
    body_text = logged_in_browser.find_element(By.TAG_NAME, "body").text
    assert len(body_text) > 200


def test_movimientos_boton_anadir_presente(logged_in_browser):
    """Existe un botón para añadir movimientos."""
    logged_in_browser.get(f"{BASE_URL}/movimientos")
    wait = WebDriverWait(logged_in_browser, 15)
    btn = wait.until(
        EC.presence_of_element_located(
            (By.XPATH, "//button[contains(normalize-space(.), 'Añadir') or contains(normalize-space(.), 'Nuevo') or contains(normalize-space(.), 'Agregar') or contains(normalize-space(.), '+')]")
        )
    )
    assert btn.is_displayed()


def test_movimientos_anadir_ingreso(logged_in_browser):
    """Se puede añadir un movimiento de tipo INGRESO."""
    logged_in_browser.get(f"{BASE_URL}/movimientos")
    wait = WebDriverWait(logged_in_browser, 15)
    # Abrir modal de añadir
    btn = wait.until(
        EC.element_to_be_clickable(
            (By.XPATH, "//button[contains(normalize-space(.), 'Añadir') or contains(normalize-space(.), 'Nuevo') or contains(normalize-space(.), '+')]")
        )
    )
    btn.click()
    time.sleep(0.5)
    # Rellenar concepto
    # Rellenar concepto — usar placeholder exacto para evitar el buscador de la página
    inputs = logged_in_browser.find_elements(
        By.XPATH, "//input[@placeholder='Concepto']"
    )
    if inputs:
        inputs[0].clear()
        inputs[0].send_keys(MOV_CONCEPTO_ING)
    # Rellenar cantidad
    cant_inputs = logged_in_browser.find_elements(
        By.XPATH, "//input[@type='number']"
    )
    if cant_inputs:
        cant_inputs[0].clear()
        cant_inputs[0].send_keys(MOV_CANTIDAD)
    # Seleccionar tipo INGRESO (botón toggle, ya es el valor por defecto)
    ingreso_btn = logged_in_browser.find_elements(
        By.XPATH, "//button[normalize-space(.)='Ingreso']"
    )
    if ingreso_btn:
        ingreso_btn[0].click()
    # Guardar
    submit_btns = logged_in_browser.find_elements(
        By.XPATH, "//button[@type='submit' or contains(normalize-space(.), 'Guardar')]"
    )
    if submit_btns:
        submit_btns[-1].click()
    time.sleep(1)
    logged_in_browser.get(f"{BASE_URL}/movimientos")
    time.sleep(1)
    body_text = logged_in_browser.find_element(By.TAG_NAME, "body").text
    assert MOV_CONCEPTO_ING in body_text, "El movimiento INGRESO no aparece en la lista"


def test_movimientos_anadir_egreso(logged_in_browser):
    """Se puede añadir un movimiento de tipo EGRESO."""
    logged_in_browser.get(f"{BASE_URL}/movimientos")
    wait = WebDriverWait(logged_in_browser, 15)
    btn = wait.until(
        EC.element_to_be_clickable(
            (By.XPATH, "//button[contains(normalize-space(.), 'Añadir') or contains(normalize-space(.), 'Nuevo') or contains(normalize-space(.), '+')]")
        )
    )
    btn.click()
    time.sleep(0.5)
    # Rellenar concepto — usar placeholder exacto para evitar el buscador de la página
    inputs = logged_in_browser.find_elements(
        By.XPATH, "//input[@placeholder='Concepto']"
    )
    if inputs:
        inputs[0].clear()
        inputs[0].send_keys(MOV_CONCEPTO_EGR)
    cant_inputs = logged_in_browser.find_elements(
        By.XPATH, "//input[@type='number']"
    )
    if cant_inputs:
        cant_inputs[0].clear()
        cant_inputs[0].send_keys(MOV_CANTIDAD)
    # Seleccionar tipo EGRESO (botón toggle)
    gasto_btn = logged_in_browser.find_elements(
        By.XPATH, "//button[normalize-space(.)='Gasto']"
    )
    if gasto_btn:
        gasto_btn[0].click()
    submit_btns = logged_in_browser.find_elements(
        By.XPATH, "//button[@type='submit' or contains(normalize-space(.), 'Guardar')]"
    )
    if submit_btns:
        submit_btns[-1].click()
    time.sleep(1)
    logged_in_browser.get(f"{BASE_URL}/movimientos")
    time.sleep(1)
    body_text = logged_in_browser.find_element(By.TAG_NAME, "body").text
    assert MOV_CONCEPTO_EGR in body_text, "El movimiento EGRESO no aparece en la lista"


def test_movimientos_modal_filtros(logged_in_browser):
    """El botón de filtros abre el panel/modal de filtros."""
    logged_in_browser.get(f"{BASE_URL}/movimientos")
    wait = WebDriverWait(logged_in_browser, 15)
    filter_btn = wait.until(
        EC.element_to_be_clickable(
            (By.XPATH, "//button[contains(normalize-space(.), 'Filtro') or contains(normalize-space(.), 'Filtrar') or contains(@aria-label, 'iltro')]")
        )
    )
    filter_btn.click()
    time.sleep(0.5)
    # Debe aparecer algún panel de filtros
    body_text = logged_in_browser.find_element(By.TAG_NAME, "body").text.lower()
    assert "tipo" in body_text or "filtro" in body_text or "fecha" in body_text
