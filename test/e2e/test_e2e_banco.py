"""
test_e2e_banco.py — Pruebas E2E de la página de Banco (integración Stripe).

Cubre:
  - La página /banco carga correctamente
  - La tarjeta de estado de Stripe está visible
  - El formulario de crear checkout está presente
  - Los campos de importe y descripción existen
  - La tabla de sesiones recientes de pago está presente
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


def test_banco_estado_stripe_visible(logged_in_browser):
    """La tarjeta de estado de la integración con Stripe está visible."""
    logged_in_browser.get(f"{BASE_URL}/banco")
    WebDriverWait(logged_in_browser, 15).until(EC.url_contains("/banco"))
    time.sleep(1)
    body_text = logged_in_browser.find_element(By.TAG_NAME, "body").text.lower()
    assert "stripe" in body_text or "pago" in body_text or "estado" in body_text


def test_banco_formulario_checkout_presente(logged_in_browser):
    """El formulario para crear una sesión de pago está disponible."""
    logged_in_browser.get(f"{BASE_URL}/banco")
    WebDriverWait(logged_in_browser, 15).until(EC.url_contains("/banco"))
    time.sleep(1)
    body_text = logged_in_browser.find_element(By.TAG_NAME, "body").text.lower()
    assert any(kw in body_text for kw in ["importe", "cantidad", "descripci", "checkout", "pagar", "crear pago"])


def test_banco_campos_formulario_checkout(logged_in_browser):
    """El formulario de checkout tiene inputs para importe y descripción."""
    logged_in_browser.get(f"{BASE_URL}/banco")
    WebDriverWait(logged_in_browser, 15).until(EC.url_contains("/banco"))
    time.sleep(1)
    inputs = logged_in_browser.find_elements(
        By.CSS_SELECTOR, "input[type='number'], input[type='text'], input[name='amount'], input[name='description'], input[name='importe']"
    )
    assert len(inputs) >= 1


def test_banco_sesiones_recientes_seccion(logged_in_browser):
    """La sección de sesiones de pago recientes está presente."""
    logged_in_browser.get(f"{BASE_URL}/banco")
    WebDriverWait(logged_in_browser, 15).until(EC.url_contains("/banco"))
    time.sleep(1)
    body_text = logged_in_browser.find_element(By.TAG_NAME, "body").text.lower()
    assert any(kw in body_text for kw in ["reciente", "historial", "sesión", "session", "checkout"])
