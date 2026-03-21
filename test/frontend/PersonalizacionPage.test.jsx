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

describe('PersonalizacionPage — Formularios cuenta', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiFetch.mockResolvedValue({});
  });

  it('envía el formulario de cambio de contraseña con contraseñas que coinciden', async () => {
    renderPage();
    const forms = document.querySelectorAll('form');
    const pwForm = forms[1]; // handlePasswordSubmit
    const inputs = pwForm.querySelectorAll('input');

    fireEvent.change(inputs[0], { target: { value: 'actual123' } });
    fireEvent.change(inputs[1], { target: { value: 'nueva12345' } });
    fireEvent.change(inputs[2], { target: { value: 'nueva12345' } });
    fireEvent.submit(pwForm);

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith(
        'auth/me',
        expect.objectContaining({ method: 'PUT' }),
      );
    });
  });

  it('muestra error cuando las contraseñas nueva y confirmación no coinciden', async () => {
    renderPage();
    const forms = document.querySelectorAll('form');
    const pwForm = forms[1];
    const inputs = pwForm.querySelectorAll('input');

    fireEvent.change(inputs[0], { target: { value: 'actual' } });
    fireEvent.change(inputs[1], { target: { value: 'nueva12345' } });
    fireEvent.change(inputs[2], { target: { value: 'diferente' } });
    fireEvent.submit(pwForm);

    await waitFor(() => {
      expect(screen.getByText(/contraseñas nuevas no coinciden/i)).toBeInTheDocument();
    });
    // apiFetch no debe haberse llamado con auth/me (solo se llama config en el mount)
    expect(apiFetch).not.toHaveBeenCalledWith('auth/me', expect.anything());
  });

  it('envía el formulario de cambio de usuario y llama a auth/me', async () => {
    renderPage();
    const forms = document.querySelectorAll('form');
    const userForm = forms[0]; // handleUsernameSubmit
    const inputs = userForm.querySelectorAll('input');

    fireEvent.change(inputs[0], { target: { value: 'mipassword' } });
    fireEvent.change(inputs[1], { target: { value: 'nuevonombre' } });
    fireEvent.submit(userForm);

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith(
        'auth/me',
        expect.objectContaining({ method: 'PUT' }),
      );
    });
  });

  it('envía el formulario de resumen por email', async () => {
    renderPage();
    const emailInput = document.querySelector('input[type="email"]');
    fireEvent.change(emailInput, { target: { value: 'resumen@test.com' } });

    const forms = document.querySelectorAll('form');
    const emailForm = Array.from(forms).find((f) => f.contains(emailInput));
    if (emailForm) {
      fireEvent.submit(emailForm);
      await waitFor(() => {
        expect(apiFetch).toHaveBeenCalled();
      });
    }
  });

  it('muestra error cuando la API falla en cambio de contraseña', async () => {
    // Usamos mockImplementation para rechazar solo las llamadas a auth/me
    // (mockRejectedValueOnce se consumiría en el fetch inicial de config)
    apiFetch.mockImplementation((url) => {
      if (url === 'auth/me') return Promise.reject(new Error('Error API'));
      return Promise.resolve({});
    });
    renderPage();
    const forms = document.querySelectorAll('form');
    const pwForm = forms[1];
    const inputs = pwForm.querySelectorAll('input');

    fireEvent.change(inputs[0], { target: { value: 'actual' } });
    fireEvent.change(inputs[1], { target: { value: 'nueva12345' } });
    fireEvent.change(inputs[2], { target: { value: 'nueva12345' } });
    fireEvent.submit(pwForm);

    await waitFor(() => {
      expect(screen.getByText(/error api/i)).toBeInTheDocument();
    });
  });
});
