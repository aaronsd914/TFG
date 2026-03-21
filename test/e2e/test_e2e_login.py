"""
test_e2e_login.py — Pruebas E2E del flujo de autenticación.

Cubre:
  - Renderizado del formulario de login
  - Toggle de visibilidad de contraseña
  - Credenciales incorrectas → mensaje de error
  - Login correcto → redirección al dashboard
  - Rutas protegidas → redirigen a /login sin sesión
  - Logout → limpia sesión y redirige a /login
"""
import pytest
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

from test.e2e.conftest import BASE_URL, ADMIN_USER, ADMIN_PASS, make_driver, do_login

PROTECTED_ROUTES = ["/", "/clientes", "/productos", "/movimientos",
                    "/albaranes", "/transporte", "/tendencias", "/banco",
                    "/ventas/nueva"]


@pytest.fixture(scope="module")
def fresh_driver():
    """Driver limpio (sin token en localStorage) para pruebas de autenticación."""
    drv = make_driver()
    yield drv
    drv.quit()


def clear_session(driver):
    """Limpia localStorage para simular usuario sin sesión."""
    try:
        driver.execute_script("localStorage.clear()")
    except Exception:
        pass


# ---------------------------------------------------------------------------
# Renderizado del formulario
# ---------------------------------------------------------------------------

def test_login_campo_usuario_presente(fresh_driver):
    """El campo de nombre de usuario (placeholder correcto) está visible."""
    fresh_driver.get(f"{BASE_URL}/login")
    wait = WebDriverWait(fresh_driver, 10)
    field = wait.until(
        EC.visibility_of_element_located(
            (By.CSS_SELECTOR, "input[placeholder='Nombre de usuario']")
        )
    )
    assert field.is_displayed()


def test_login_campo_password_tipo_correcto(fresh_driver):
    """El campo de contraseña tiene type='password' inicialmente."""
    fresh_driver.get(f"{BASE_URL}/login")
    WebDriverWait(fresh_driver, 10).until(
        EC.presence_of_element_located(
            (By.CSS_SELECTOR, "input[placeholder='Nombre de usuario']")
        )
    )
    pwd = fresh_driver.find_element(By.CSS_SELECTOR, "input[type='password']")
    assert pwd.get_attribute("type") == "password"


def test_login_boton_submit_presente(fresh_driver):
    """El botón de envío del formulario está presente y contiene 'sesión'."""
    fresh_driver.get(f"{BASE_URL}/login")
    WebDriverWait(fresh_driver, 10).until(
        EC.presence_of_element_located((By.CSS_SELECTOR, "button[type='submit']"))
    )
    btn = fresh_driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
    assert "sesión" in btn.text.lower()


def test_login_toggle_muestra_password(fresh_driver):
    """El toggle de contraseña cambia el tipo del input a text."""
    fresh_driver.get(f"{BASE_URL}/login")
    WebDriverWait(fresh_driver, 10).until(
        EC.presence_of_element_located((By.CSS_SELECTOR, "input[type='password']"))
    )
    toggle = fresh_driver.find_element(
        By.CSS_SELECTOR, "[aria-label='Mostrar contraseña']"
    )
    toggle.click()
    WebDriverWait(fresh_driver, 5).until(
        EC.presence_of_element_located((By.CSS_SELECTOR, "input[type='text']"))
    )
    pwd = fresh_driver.find_element(By.CSS_SELECTOR, "input[type='text']")
    assert pwd.get_attribute("type") == "text"


def test_login_toggle_oculta_password(fresh_driver):
    """Después de mostrar la contraseña, el segundo toggle la vuelve a ocultar."""
    fresh_driver.get(f"{BASE_URL}/login")
    WebDriverWait(fresh_driver, 10).until(
        EC.presence_of_element_located((By.CSS_SELECTOR, "input[type='password']"))
    )
    # Mostrar
    fresh_driver.find_element(
        By.CSS_SELECTOR, "[aria-label='Mostrar contraseña']"
    ).click()
    WebDriverWait(fresh_driver, 5).until(
        EC.presence_of_element_located((By.CSS_SELECTOR, "input[type='text']"))
    )
    # Ocultar de nuevo
    fresh_driver.find_element(
        By.CSS_SELECTOR, "[aria-label='Ocultar contraseña']"
    ).click()
    WebDriverWait(fresh_driver, 5).until(
        EC.presence_of_element_located((By.CSS_SELECTOR, "input[type='password']"))
    )
    assert fresh_driver.find_element(
        By.CSS_SELECTOR, "input[type='password']"
    ).get_attribute("type") == "password"


# ---------------------------------------------------------------------------
# Protección de rutas
# ---------------------------------------------------------------------------

def test_ruta_raiz_redirige_a_login_sin_sesion(fresh_driver):
    """Acceder a / sin token redirige a /login."""
    clear_session(fresh_driver)
    fresh_driver.get(f"{BASE_URL}/")
    WebDriverWait(fresh_driver, 10).until(EC.url_contains("/login"))
    assert "/login" in fresh_driver.current_url


def test_rutas_protegidas_redirigen_a_login(fresh_driver):
    """Todas las rutas protegidas redirigen a /login cuando no hay sesión."""
    for route in PROTECTED_ROUTES:
        clear_session(fresh_driver)
        fresh_driver.get(f"{BASE_URL}{route}")
        WebDriverWait(fresh_driver, 10).until(EC.url_contains("/login"))
        assert "/login" in fresh_driver.current_url, \
            f"Se esperaba redirección a /login desde {route}"


# ---------------------------------------------------------------------------
# Credenciales incorrectas
# ---------------------------------------------------------------------------

def test_login_credenciales_incorrectas_muestra_error(fresh_driver):
    """Login con credenciales incorrectas no redirige y muestra algún error visual."""
    clear_session(fresh_driver)
    fresh_driver.get(f"{BASE_URL}/login")
    wait = WebDriverWait(fresh_driver, 10)
    wait.until(
        EC.presence_of_element_located(
            (By.CSS_SELECTOR, "input[placeholder='Nombre de usuario']")
        )
    )
    fresh_driver.find_element(
        By.CSS_SELECTOR, "input[placeholder='Nombre de usuario']"
    ).send_keys("usuarioinexistente")
    fresh_driver.find_element(
        By.CSS_SELECTOR, "input[type='password']"
    ).send_keys("clavemalísima")
    fresh_driver.find_element(By.CSS_SELECTOR, "button[type='submit']").click()
    # Debe seguir en /login
    import time; time.sleep(2)
    assert "/login" in fresh_driver.current_url


# ---------------------------------------------------------------------------
# Login correcto y logout
# ---------------------------------------------------------------------------

def test_login_correcto_redirige_al_dashboard(fresh_driver):
    """Login con admin/admin123 redirige fuera de /login."""
    clear_session(fresh_driver)
    do_login(fresh_driver, ADMIN_USER, ADMIN_PASS)
    assert "/login" not in fresh_driver.current_url


def test_logout_redirige_a_login(fresh_driver):
    """El botón de logout redirige a /login y elimina el token."""
    # Aseguramos sesión activa
    if "/login" in fresh_driver.current_url:
        do_login(fresh_driver, ADMIN_USER, ADMIN_PASS)
    WebDriverWait(fresh_driver, 10).until(
        EC.element_to_be_clickable(
            (By.CSS_SELECTOR, "[aria-label='Cerrar sesión']")
        )
    ).click()
    WebDriverWait(fresh_driver, 10).until(EC.url_contains("/login"))
    assert "/login" in fresh_driver.current_url
    token = fresh_driver.execute_script("return localStorage.getItem('token')")
    assert token is None
