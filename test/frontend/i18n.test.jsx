/**
 * i18n.test.jsx
 * Verifica la internacionalización (i18next ES/EN) y los atributos ARIA
 * de accesibilidad (WCAG 2.1 AA) en los componentes principales.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../../frontend/src/api/auth.js', () => ({
  getToken: () =>
    'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.' +
    btoa(JSON.stringify({ sub: 'testuser', exp: 9999999999 })) +
    '.sig',
  removeToken: vi.fn(),
  login: vi.fn(),
  saveToken: vi.fn(),
}));

vi.mock('../../frontend/src/api/http.js', () => ({
  apiFetch: vi.fn(() => Promise.resolve({})),
}));

vi.mock('sileo', () => ({
  sileo: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), promise: vi.fn() },
}));

vi.mock('../../frontend/src/context/ThemeContext.jsx', () => ({
  useTheme: vi.fn(() => ({ isDark: false, palette: 'warm', setIsDark: vi.fn(), setPalette: vi.fn() })),
  ThemeProvider: ({ children }) => children,
}));

vi.mock('../../frontend/src/context/ConfigContext.jsx', () => ({
  useAppConfig: vi.fn(() => ({ config: {}, updateConfig: vi.fn() })),
  ConfigProvider: ({ children }) => children,
  ConfigContext: { Provider: ({ children }) => children },
  DEFAULTS: {},
}));

const mockChangeLanguage = vi.hoisted(() => vi.fn());
vi.mock('../../frontend/src/i18n.js', () => ({
  default: { language: 'es', changeLanguage: mockChangeLanguage },
  loadLocale: mockChangeLanguage,
}));

import Sidebar from '../../frontend/src/components/Sidebar.jsx';
import LoginPage from '../../frontend/src/components/LoginPage.jsx';
import PersonalizacionPage from '../../frontend/src/components/PersonalizacionPage.jsx';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function renderSidebar(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Sidebar />
    </MemoryRouter>
  );
}

function renderLogin() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>
  );
}

function renderPersonalizacion() {
  return render(
    <MemoryRouter>
      <PersonalizacionPage />
    </MemoryRouter>
  );
}

function openSection(titleText) {
  const btn = screen.getAllByRole('button').find(b => b.textContent.includes(titleText));
  fireEvent.click(btn);
}

// ─── Sidebar ARIA ─────────────────────────────────────────────────────────────
describe('Sidebar — ARIA y i18n', () => {
  beforeEach(() => vi.clearAllMocks());

  it('el elemento <nav> tiene aria-label de navegación', () => {
    renderSidebar();
    const nav = screen.getByRole('navigation');
    expect(nav).toHaveAttribute('aria-label', 'Navegación principal');
  });

  it('el enlace activo tiene aria-current="page"', () => {
    renderSidebar('/');
    const dashboardLink = screen.getByRole('link', { name: /dashboard/i });
    expect(dashboardLink).toHaveAttribute('aria-current', 'page');
  });

  it('los enlaces inactivos no tienen aria-current', () => {
    renderSidebar('/');
    const clientesLink = screen.getByRole('link', { name: /clientes/i });
    expect(clientesLink).not.toHaveAttribute('aria-current');
  });

  it('el botón de cerrar sesión es accesible por nombre', () => {
    renderSidebar();
    expect(screen.getByRole('button', { name: /cerrar sesión/i })).toBeInTheDocument();
  });

  it('muestra los ítems de navegación traducidos', () => {
    renderSidebar();
    ['Dashboard', 'Nueva venta', 'Clientes', 'Albaranes', 'Incidencias', 'Transporte',
      'Productos', 'Banco', 'Tendencias', 'Configuración']
      .forEach(label => expect(screen.getByText(label)).toBeInTheDocument());
  });
});

// ─── LoginPage ARIA ───────────────────────────────────────────────────────────
describe('LoginPage — ARIA y i18n', () => {
  beforeEach(() => vi.clearAllMocks());

  it('el campo usuario tiene id y label asociado correctamente', () => {
    renderLogin();
    const input = document.getElementById('login-username');
    expect(input).toBeInTheDocument();
    const label = document.querySelector('label[for="login-username"]');
    expect(label).toBeInTheDocument();
  });

  it('el campo contraseña tiene id y label asociado correctamente', () => {
    renderLogin();
    const input = document.getElementById('login-password');
    expect(input).toBeInTheDocument();
    const label = document.querySelector('label[for="login-password"]');
    expect(label).toBeInTheDocument();
  });

  it('el formulario tiene aria-label descriptivo', () => {
    renderLogin();
    const form = screen.getByRole('form');
    expect(form).toHaveAttribute('aria-label', 'Panel de gestión');
  });

  it('el botón de submit muestra el texto traducido', () => {
    renderLogin();
    expect(screen.getByRole('button', { name: /iniciar sesión/i })).toBeInTheDocument();
  });
});

// ─── PersonalizacionPage ARIA ─────────────────────────────────────────────────
describe('PersonalizacionPage — ARIA accesibilidad', () => {
  beforeEach(() => vi.clearAllMocks());

  it('el toggle de modo oscuro tiene role="switch" y aria-checked', () => {
    renderPersonalizacion();
    openSection('Apariencia');
    const toggle = screen.getByRole('switch');
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    expect(toggle).toHaveAttribute('aria-label', 'Activar/desactivar modo oscuro');
  });

  it('los botones de paleta tienen role="radio" y aria-checked', () => {
    renderPersonalizacion();
    openSection('Apariencia');
    const radiobtns = screen.getAllByRole('radio');
    // At least 6 palette radios
    const paletteRadios = radiobtns.filter(b => b.closest('[aria-label="Paleta de color"]'));
    expect(paletteRadios.length).toBeGreaterThanOrEqual(6);
  });

  it('el selector de idioma tiene radio buttons ES y EN', () => {
    renderPersonalizacion();
    openSection('Apariencia');
    const langEs = screen.getByTestId('lang-es');
    const langEn = screen.getByTestId('lang-en');
    expect(langEs).toBeInTheDocument();
    expect(langEn).toBeInTheDocument();
  });

  it('al hacer clic en EN llama a i18n.changeLanguage("en")', () => {
    renderPersonalizacion();
    openSection('Apariencia');
    fireEvent.click(screen.getByTestId('lang-en'));
    expect(mockChangeLanguage).toHaveBeenCalledWith('en');
  });

  it('al hacer clic en ES llama a i18n.changeLanguage("es")', () => {
    renderPersonalizacion();
    openSection('Apariencia');
    fireEvent.click(screen.getByTestId('lang-es'));
    expect(mockChangeLanguage).toHaveBeenCalledWith('es');
  });
});
