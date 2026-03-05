// test-setup.js — Se ejecuta antes de cada fichero de test
import '@testing-library/jest-dom';

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
