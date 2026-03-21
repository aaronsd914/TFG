"""
conftest.py — Fixtures compartidos para todos los tests E2E con Selenium.

Proporciona:
  - browser:            Instancia Chrome headless de alcance de sesión
  - logged_in_browser:  browser con sesión de admin ya iniciada
  - Captura de pantalla automática al fallar un test
"""
import os
import pytest
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

BASE_URL = os.environ.get("E2E_BASE_URL", "http://localhost:5173")
ADMIN_USER = os.environ.get("E2E_USER", "admin")
ADMIN_PASS = os.environ.get("E2E_PASS", "admin123")


def make_driver() -> webdriver.Chrome:
    """Crea un WebDriver Chrome headless listo para usar."""
    opts = Options()
    opts.add_argument("--headless")
    opts.add_argument("--no-sandbox")
    opts.add_argument("--disable-dev-shm-usage")
    opts.add_argument("--disable-gpu")
    opts.add_argument("--window-size=1920,1080")
    # Selenium Manager descarga ChromeDriver automáticamente (Selenium >= 4.6)
    drv = webdriver.Chrome(options=opts)
    drv.implicitly_wait(5)
    return drv


def do_login(driver: webdriver.Chrome, user: str = None, password: str = None) -> None:
    """Navega a /login y completa las credenciales proporcionadas."""
    user = user or ADMIN_USER
    password = password or ADMIN_PASS
    driver.get(f"{BASE_URL}/login")
    wait = WebDriverWait(driver, 15)
    inp = wait.until(
        EC.presence_of_element_located(
            (By.CSS_SELECTOR, "input[placeholder='Nombre de usuario']")
        )
    )
    inp.clear()
    inp.send_keys(user)
    pwd = driver.find_element(By.CSS_SELECTOR, "input[type='password']")
    pwd.clear()
    pwd.send_keys(password)
    driver.find_element(By.CSS_SELECTOR, "button[type='submit']").click()
    wait.until(lambda d: "/login" not in d.current_url)


def wait_for_text(driver: webdriver.Chrome, text: str, timeout: int = 10):
    """Espera a que aparezca un elemento que contenga el texto dado."""
    return WebDriverWait(driver, timeout).until(
        EC.presence_of_element_located(
            (By.XPATH, f"//*[contains(normalize-space(.), '{text}')]")
        )
    )


def navigate(driver: webdriver.Chrome, path: str) -> None:
    """Navega a una ruta de la app y espera a que la URL cambie."""
    driver.get(f"{BASE_URL}{path}")
    WebDriverWait(driver, 10).until(EC.url_contains(path))


# ---------------------------------------------------------------------------
# Fixtures de alcance de sesión
# ---------------------------------------------------------------------------

@pytest.fixture(scope="session")
def browser():
    """Instancia Chrome única para toda la sesión de tests."""
    drv = make_driver()
    yield drv
    drv.quit()


@pytest.fixture(scope="session")
def logged_in_browser(browser):
    """browser con sesión de admin iniciada desde el principio."""
    do_login(browser)
    yield browser


# ---------------------------------------------------------------------------
# Hook: captura de pantalla automática al fallar
# ---------------------------------------------------------------------------

@pytest.hookimpl(tryfirst=True, hookwrapper=True)
def pytest_runtest_makereport(item, call):
    outcome = yield
    rep = outcome.get_result()
    if rep.when == "call" and rep.failed:
        drv = item.funcargs.get("logged_in_browser") or item.funcargs.get(
            "fresh_driver"
        )
        if drv:
            shots_dir = os.path.join("test", "e2e", "screenshots")
            os.makedirs(shots_dir, exist_ok=True)
            drv.save_screenshot(os.path.join(shots_dir, f"{item.name}.png"))
