"""
test_e2e_personalizacion.py — Pruebas E2E de la página de personalización.

Cubre:
  - La página carga correctamente vía el sidebar
  - El título "Personalización" está visible
  - Las secciones principales están presentes (Mi cuenta, Apariencia, Resumen, Identidad)
  - Los botones de paleta de color están presentes (Cálido, Pizarra, Bosque)
  - El toggle de modo oscuro está presente
  - El campo de email de resumen está presente
  - Los botones de guardar están presentes
"""
import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

from test.e2e.conftest import BASE_URL


def go_to_personalizacion(driver):
    driver.get(f"{BASE_URL}/personalizacion")
    WebDriverWait(driver, 10).until(
        EC.presence_of_element_located(
            (By.XPATH, "//*[contains(normalize-space(.), 'Personalización')]")
        )
    )


def test_personalizacion_carga(logged_in_browser):
    """La página de personalización carga correctamente."""
    go_to_personalizacion(logged_in_browser)
    assert "/personalizacion" in logged_in_browser.current_url


def test_personalizacion_titulo_visible(logged_in_browser):
    """El título 'Personalización' está visible en la página."""
    go_to_personalizacion(logged_in_browser)
    header = WebDriverWait(logged_in_browser, 10).until(
        EC.presence_of_element_located(
            (By.XPATH, "//h2[contains(normalize-space(.), 'Personalización')]")
        )
    )
    assert header.is_displayed()


def test_personalizacion_acceso_desde_sidebar(logged_in_browser):
    """El enlace 'Personalizar' del sidebar navega a la página de personalización."""
    logged_in_browser.get(f"{BASE_URL}/")
    WebDriverWait(logged_in_browser, 10).until(
        EC.presence_of_element_located((By.TAG_NAME, "nav"))
    )
    link = WebDriverWait(logged_in_browser, 10).until(
        EC.element_to_be_clickable(
            (By.XPATH, "//nav//a[contains(normalize-space(.), 'Personalizar')]")
        )
    )
    link.click()
    WebDriverWait(logged_in_browser, 10).until(EC.url_contains("/personalizacion"))
    assert "/personalizacion" in logged_in_browser.current_url


def test_personalizacion_seccion_mi_cuenta(logged_in_browser):
    """La sección 'Mi cuenta' está presente."""
    go_to_personalizacion(logged_in_browser)
    seccion = WebDriverWait(logged_in_browser, 10).until(
        EC.presence_of_element_located(
            (By.XPATH, "//*[contains(normalize-space(.), 'Mi cuenta')]")
        )
    )
    assert seccion.is_displayed()


def test_personalizacion_seccion_apariencia(logged_in_browser):
    """La sección 'Apariencia' está presente."""
    go_to_personalizacion(logged_in_browser)
    seccion = WebDriverWait(logged_in_browser, 10).until(
        EC.presence_of_element_located(
            (By.XPATH, "//*[contains(normalize-space(.), 'Apariencia')]")
        )
    )
    assert seccion.is_displayed()


def test_personalizacion_paletas_presentes(logged_in_browser):
    """Los tres botones de paleta de color están presentes (Cálido, Pizarra, Bosque)."""
    go_to_personalizacion(logged_in_browser)
    for label in ["Cálido", "Pizarra", "Bosque"]:
        btn = WebDriverWait(logged_in_browser, 10).until(
            EC.presence_of_element_located(
                (By.XPATH, f"//*[contains(normalize-space(.), '{label}')]")
            )
        )
        assert btn.is_displayed(), f"Botón de paleta '{label}' no visible"


def test_personalizacion_toggle_modo_oscuro(logged_in_browser):
    """El toggle de modo oscuro (checkbox) está presente en la sección Apariencia."""
    go_to_personalizacion(logged_in_browser)
    # Buscamos el checkbox del toggle de modo oscuro
    toggle = WebDriverWait(logged_in_browser, 10).until(
        EC.presence_of_element_located((By.XPATH, "//input[@type='checkbox']"))
    )
    assert toggle is not None


def test_personalizacion_seccion_resumen_email(logged_in_browser):
    """La sección de resumen semanal por email está presente."""
    go_to_personalizacion(logged_in_browser)
    seccion = WebDriverWait(logged_in_browser, 10).until(
        EC.presence_of_element_located(
            (By.XPATH, "//*[contains(normalize-space(.), 'Resumen')]")
        )
    )
    assert seccion.is_displayed()


def test_personalizacion_campo_email_resumen(logged_in_browser):
    """El campo de email de destino para el resumen está presente."""
    go_to_personalizacion(logged_in_browser)
    # Hay un input de tipo email en la sección de resumen
    email_input = WebDriverWait(logged_in_browser, 10).until(
        EC.presence_of_element_located((By.XPATH, "//input[@type='email']"))
    )
    assert email_input.is_displayed()


def test_personalizacion_seccion_identidad(logged_in_browser):
    """La sección 'Identidad de la tienda' está presente."""
    go_to_personalizacion(logged_in_browser)
    seccion = WebDriverWait(logged_in_browser, 10).until(
        EC.presence_of_element_located(
            (By.XPATH, "//*[contains(normalize-space(.), 'Identidad')]")
        )
    )
    assert seccion.is_displayed()


def test_personalizacion_botones_guardar_presentes(logged_in_browser):
    """Los botones de guardar están presentes en la página."""
    go_to_personalizacion(logged_in_browser)
    btns = WebDriverWait(logged_in_browser, 10).until(
        EC.presence_of_all_elements_located(
            (By.XPATH, "//button[@type='submit']")
        )
    )
    assert len(btns) >= 2, "Se esperan al menos 2 botones de guardar"
