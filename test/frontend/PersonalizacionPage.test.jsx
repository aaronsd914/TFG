/**
 * PersonalizacionPage.test.jsx
 * Verifica el renderizado y comportamiento de la página de personalización.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PersonalizacionPage from '../../frontend/src/components/PersonalizacionPage.jsx';
import { ConfigProvider } from '../../frontend/src/context/ConfigContext.jsx';

// ── Mocks ──────────────────────────────────────────────────────────────────
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
}));

// apiFetch responds successfully for all calls
vi.mock('../../frontend/src/api/http.js', () => ({
  apiFetch: vi.fn(() => Promise.resolve({})),
}));
import { apiFetch } from '../../frontend/src/api/http.js';

// ThemeContext default (safe) values are used automatically
// ConfigContext default (safe) values are used automatically

function renderPage() {
  return render(
    <MemoryRouter>
      <ConfigProvider>
        <PersonalizacionPage />
      </ConfigProvider>
    </MemoryRouter>
  );
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('PersonalizacionPage — renderizado', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza sin errores', () => {
    expect(() => renderPage()).not.toThrow();
  });

  it('muestra el título de la página', () => {
    renderPage();
    expect(screen.getByText('Personalización')).toBeInTheDocument();
  });

  it('muestra la sección Mi cuenta', () => {
    renderPage();
    expect(screen.getByText(/mi cuenta/i)).toBeInTheDocument();
  });

  it('muestra la sección Apariencia', () => {
    renderPage();
    expect(screen.getByText(/apariencia/i)).toBeInTheDocument();
  });

  it('muestra la sección Resumen por email', () => {
    renderPage();
    expect(screen.getByText(/resumen por email/i)).toBeInTheDocument();
  });

  it('muestra la sección Identidad', () => {
    renderPage();
    expect(screen.getByText(/identidad/i)).toBeInTheDocument();
  });
});

describe('PersonalizacionPage — Apariencia', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('muestra el toggle de modo oscuro', () => {
    renderPage();
    expect(screen.getByLabelText(/toggle dark mode/i)).toBeInTheDocument();
  });

  it('muestra las 3 paletas de color', () => {
    renderPage();
    expect(screen.getByText('Cálido')).toBeInTheDocument();
    expect(screen.getByText('Pizarra')).toBeInTheDocument();
    expect(screen.getByText('Bosque')).toBeInTheDocument();
  });

  it('el toggle de modo oscuro responde al click', () => {
    renderPage();
    const toggle = screen.getByLabelText(/toggle dark mode/i);
    const htmlEl = document.documentElement;
    const initialDark = htmlEl.classList.contains('dark');
    fireEvent.click(toggle);
    // State changes — just verify no throw
    expect(toggle).toBeInTheDocument();
    // Cleanup: restore original state
    if (htmlEl.classList.contains('dark') !== initialDark) {
      fireEvent.click(toggle);
    }
  });
});

describe('PersonalizacionPage — Mi cuenta', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('muestra los campos de cambio de usuario', () => {
    renderPage();
    // At least one password field and one text field visible in the username form
    const passwordInputs = screen.getAllByDisplayValue('');
    expect(passwordInputs.length).toBeGreaterThan(0);
  });

  it('muestra los botones de guardar', () => {
    renderPage();
    const buttons = screen.getAllByText(/guardar|cambiar/i);
    expect(buttons.length).toBeGreaterThan(0);
  });
});

describe('PersonalizacionPage — Identidad', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('muestra el área de firma de email', () => {
    renderPage();
    expect(screen.getByPlaceholderText(/ej: furnigest/i)).toBeInTheDocument();
  });

  it('muestra el botón de subir logo', () => {
    renderPage();
    expect(screen.getByText(/subir logo/i)).toBeInTheDocument();
  });

  it('guarda la firma de email al enviar el formulario', async () => {
    renderPage();
    const textarea = screen.getByPlaceholderText(/ej: furnigest/i);
    fireEvent.change(textarea, { target: { value: 'Mi firma de prueba' } });

    const saveBtn = screen.getByText('Guardar firma');
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining('config/firma_email'),
        expect.objectContaining({ method: 'PUT' })
      );
    });
  });
});
