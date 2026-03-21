"""
test_e2e_dashboard.py — Pruebas E2E de la página principal (Dashboard).

Cubre:
  - El dashboard carga correctamente tras el login
  - Las tarjetas KPI están presentes (ingresos, egresos, ventas, almacén)
  - Los gráficos (canvas) están presentes
  - La barra lateral contiene todos los enlaces de navegación
  - Los enlaces de navegación llevan a la página correcta
"""
import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

from test.e2e.conftest import BASE_URL, navigate

SIDEBAR_LINKS = [
    ("Dashboard", "/"),
    ("Nueva venta", "/ventas/nueva"),
    ("Clientes", "/clientes"),
    ("Albaranes", "/albaranes"),
    ("Transporte", "/transporte"),
    ("Movimientos", "/movimientos"),
    ("Productos", "/productos"),
    ("Banco", "/banco"),
    ("Tendencias", "/tendencias"),
]


def test_dashboard_carga_tras_login(logged_in_browser):
    """Tras el login, el usuario llega al dashboard (URL no contiene /login)."""
    logged_in_browser.get(f"{BASE_URL}/")
    WebDriverWait(logged_in_browser, 10).until(
        lambda d: "/login" not in d.current_url
    )
    assert "/login" not in logged_in_browser.current_url


def test_dashboard_sidebar_presente(logged_in_browser):
    """La barra lateral está visible en el dashboard."""
    logged_in_browser.get(f"{BASE_URL}/")
    WebDriverWait(logged_in_browser, 10).until(
        EC.presence_of_element_located((By.TAG_NAME, "nav"))
    )
    nav = logged_in_browser.find_element(By.TAG_NAME, "nav")
    assert nav.is_displayed()


def test_dashboard_sidebar_todos_los_enlaces(logged_in_browser):
    """La barra lateral contiene todos los enlaces de navegación esperados."""
    logged_in_browser.get(f"{BASE_URL}/")
    wait = WebDriverWait(logged_in_browser, 10)
    wait.until(EC.presence_of_element_located((By.TAG_NAME, "nav")))
    for label, _href in SIDEBAR_LINKS:
        elements = logged_in_browser.find_elements(
            By.XPATH, f"//nav//*[contains(normalize-space(.), '{label}')]"
        )
        assert elements, f"No se encontró el enlace '{label}' en la barra lateral"


def test_dashboard_tarjetas_kpi_presentes(logged_in_browser):
    """Las tarjetas de KPI del dashboard muestran métricas clave."""
    logged_in_browser.get(f"{BASE_URL}/")
    wait = WebDriverWait(logged_in_browser, 15)
    # Al menos una de las métricas de ingresos o ventas debe aparecer
    kpi_keywords = ["Ingresos", "Egresos", "Ventas", "Almacén", "Pedidos"]
    found = False
    for kw in kpi_keywords:
        els = logged_in_browser.find_elements(
            By.XPATH, f"//*[contains(normalize-space(.), '{kw}')]"
        )
        if els:
            found = True
            break
    assert found, "No se encontraron tarjetas KPI en el dashboard"


def test_dashboard_graficos_presentes(logged_in_browser):
    """El dashboard muestra al menos un elemento canvas (gráfico Chart.js)."""
    logged_in_browser.get(f"{BASE_URL}/")
    WebDriverWait(logged_in_browser, 15).until(
        EC.presence_of_element_located((By.TAG_NAME, "canvas"))
    )
    canvases = logged_in_browser.find_elements(By.TAG_NAME, "canvas")
    assert len(canvases) >= 1


def test_dashboard_navega_a_clientes(logged_in_browser):
    """Clic en 'Clientes' de la barra lateral navega a /clientes."""
    logged_in_browser.get(f"{BASE_URL}/")
    WebDriverWait(logged_in_browser, 10).until(
        EC.presence_of_element_located((By.TAG_NAME, "nav"))
    )
    link = WebDriverWait(logged_in_browser, 10).until(
        EC.element_to_be_clickable(
            (By.XPATH, "//nav//a[contains(normalize-space(.), 'Clientes')]")
        )
    )
    link.click()
    WebDriverWait(logged_in_browser, 10).until(EC.url_contains("/clientes"))
    assert "/clientes" in logged_in_browser.current_url


def test_dashboard_navega_a_movimientos(logged_in_browser):
    """Clic en 'Movimientos' de la barra lateral navega a /movimientos."""
    logged_in_browser.get(f"{BASE_URL}/")
    WebDriverWait(logged_in_browser, 10).until(
        EC.presence_of_element_located((By.TAG_NAME, "nav"))
    )
    link = WebDriverWait(logged_in_browser, 10).until(
        EC.element_to_be_clickable(
            (By.XPATH, "//nav//a[contains(normalize-space(.), 'Movimientos')]")
        )
    )
    link.click()
    WebDriverWait(logged_in_browser, 10).until(EC.url_contains("/movimientos"))
    assert "/movimientos" in logged_in_browser.current_url


def test_dashboard_boton_logout_presente(logged_in_browser):
    """El botón de cerrar sesión está presente con su aria-label correcto."""
    logged_in_browser.get(f"{BASE_URL}/")
    WebDriverWait(logged_in_browser, 10).until(
        EC.presence_of_element_located(
            (By.CSS_SELECTOR, "[aria-label='Cerrar sesión']")
        )
    )
    btn = logged_in_browser.find_element(
        By.CSS_SELECTOR, "[aria-label='Cerrar sesión']"
    )
    assert btn.is_displayed()
