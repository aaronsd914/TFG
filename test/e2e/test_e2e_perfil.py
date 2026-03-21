"""
test_e2e_perfil.py — Pruebas E2E de la página de perfil de usuario.

Cubre:
  - La página carga correctamente en /perfil
  - El título 'Mi perfil' está visible
  - El bloque de usuario activo está presente
  - La sección 'Cambiar nombre de usuario' está presente
  - La sección 'Cambiar contraseña' está presente
  - Los campos de contraseña están presentes
  - El campo de nuevo nombre de usuario está presente
  - Los botones de envío están presentes
"""
import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

from test.e2e.conftest import BASE_URL


def go_to_perfil(driver):
    driver.get(f"{BASE_URL}/perfil")
    WebDriverWait(driver, 10).until(
        EC.presence_of_element_located(
            (By.XPATH, "//*[contains(normalize-space(.), 'Mi perfil')]")
        )
    )


def test_perfil_carga(logged_in_browser):
    """La página de perfil carga correctamente en /perfil."""
    go_to_perfil(logged_in_browser)
    assert "/perfil" in logged_in_browser.current_url


def test_perfil_titulo_visible(logged_in_browser):
    """El título 'Mi perfil' está visible."""
    go_to_perfil(logged_in_browser)
    titulo = WebDriverWait(logged_in_browser, 10).until(
        EC.presence_of_element_located(
            (By.XPATH, "//h2[contains(normalize-space(.), 'Mi perfil')]")
        )
    )
    assert titulo.is_displayed()


def test_perfil_muestra_usuario_activo(logged_in_browser):
    """El bloque de 'Usuario activo' con el nombre de usuario está presente."""
    go_to_perfil(logged_in_browser)
    bloque = WebDriverWait(logged_in_browser, 10).until(
        EC.presence_of_element_located(
            (By.XPATH, "//*[contains(normalize-space(.), 'Usuario activo')]")
        )
    )
    assert bloque.is_displayed()


def test_perfil_muestra_nombre_usuario(logged_in_browser):
    """El nombre de usuario 'admin' (del seed) está visible en el bloque de perfil."""
    go_to_perfil(logged_in_browser)
    nombre = WebDriverWait(logged_in_browser, 10).until(
        EC.presence_of_element_located(
            (By.XPATH, "//*[contains(normalize-space(.), 'admin')]")
        )
    )
    assert nombre.is_displayed()


def test_perfil_seccion_cambiar_usuario(logged_in_browser):
    """La sección 'Cambiar nombre de usuario' está presente."""
    go_to_perfil(logged_in_browser)
    seccion = WebDriverWait(logged_in_browser, 10).until(
        EC.presence_of_element_located(
            (By.XPATH, "//*[contains(normalize-space(.), 'Cambiar nombre de usuario')]")
        )
    )
    assert seccion.is_displayed()


def test_perfil_seccion_cambiar_contrasena(logged_in_browser):
    """La sección 'Cambiar contraseña' está presente."""
    go_to_perfil(logged_in_browser)
    seccion = WebDriverWait(logged_in_browser, 10).until(
        EC.presence_of_element_located(
            (By.XPATH, "//*[contains(normalize-space(.), 'Cambiar contraseña')]")
        )
    )
    assert seccion.is_displayed()


def test_perfil_campos_contrasena_presentes(logged_in_browser):
    """Los campos de contraseña están presentes en la página."""
    go_to_perfil(logged_in_browser)
    pw_inputs = WebDriverWait(logged_in_browser, 10).until(
        EC.presence_of_all_elements_located(
            (By.XPATH, "//input[@type='password']")
        )
    )
    # Se esperan al menos 2 campos de contraseña (actual + nueva/confirmar)
    assert len(pw_inputs) >= 2, "Se esperan al menos 2 campos de contraseña"


def test_perfil_campo_nuevo_usuario(logged_in_browser):
    """El campo de texto para el nuevo nombre de usuario está presente."""
    go_to_perfil(logged_in_browser)
    text_inputs = WebDriverWait(logged_in_browser, 10).until(
        EC.presence_of_all_elements_located(
            (By.XPATH, "//input[@type='text']")
        )
    )
    assert len(text_inputs) >= 1, "Se espera al menos 1 campo de texto para el nuevo nombre"


def test_perfil_botones_envio_presentes(logged_in_browser):
    """Los botones de envío están presentes en la página de perfil."""
    go_to_perfil(logged_in_browser)
    btns = WebDriverWait(logged_in_browser, 10).until(
        EC.presence_of_all_elements_located(
            (By.XPATH, "//button[@type='submit']")
        )
    )
    assert len(btns) >= 2, "Se esperan al menos 2 botones de envío (usuario y contraseña)"
