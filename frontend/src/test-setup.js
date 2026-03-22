// test-setup.js — Se ejecuta antes de cada fichero de test
import '@testing-library/jest-dom';

// ─── Mock global de react-i18next ─────────────────────────────────────────────
// Proporciona una función t que devuelve los valores en español
const _i18nTranslations = {
  'sidebar.nav': 'Navegación principal',
  'sidebar.close': 'Cerrar menú',
  'sidebar.logout': 'Cerrar sesión',
  'sidebar.dashboard': 'Dashboard',
  'sidebar.newSale': 'Nueva venta',
  'sidebar.clients': 'Clientes',
  'sidebar.deliveryNotes': 'Albaranes',
  'sidebar.transport': 'Transporte',
  'sidebar.movements': 'Movimientos',
  'sidebar.products': 'Productos',
  'sidebar.bank': 'Banco',
  'sidebar.trends': 'Tendencias',
  'sidebar.settings': 'Configuración',
  'login.subtitle': 'Panel de gestión',
  'login.username': 'Usuario',
  'login.usernamePlaceholder': 'Nombre de usuario',
  'login.password': 'Contraseña',
  'login.passwordPlaceholder': '••••••••',
  'login.showPassword': 'Mostrar contraseña',
  'login.hidePassword': 'Ocultar contraseña',
  'login.submit': 'Iniciar sesión',
  'login.submitting': 'Iniciando sesión…',
  'appearance.title': 'Apariencia',
  'appearance.darkMode': 'Modo oscuro',
  'appearance.darkModeDesc': 'Cambia entre tema claro y oscuro',
  'appearance.toggleDarkMode': 'Activar/desactivar modo oscuro',
  'appearance.colorPalette': 'Paleta de color',
  'appearance.selectPalette': 'Seleccionar paleta {{name}}',
  'appearance.language': 'Idioma',
  'appearance.languageDesc': 'Elige el idioma de la interfaz',
  'appearance.langEs': 'Español',
  'appearance.langEn': 'English',
  'appearance.selectLanguage': 'Seleccionar idioma {{lang}}',
  'common.save': 'Guardar',
  'common.saving': 'Guardando…',
};

function _t(key, opts = {}) {
  let val = _i18nTranslations[key] ?? key;
  if (opts && typeof opts === 'object') {
    val = val.replace(/\{\{(\w+)\}\}/g, (_, k) => opts[k] ?? k);
  }
  return val;
}

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: _t,
    i18n: { language: 'es', changeLanguage: vi.fn() },
  }),
  initReactI18next: { type: '3rdParty', init: vi.fn() },
  Trans: ({ i18nKey }) => i18nKey,
}));

// Silencia errores de ResizeObserver que lanzan chart.js en jsdom
globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock global de fetch para evitar llamadas reales a la API en tests
globalThis.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve([]),
  })
);
