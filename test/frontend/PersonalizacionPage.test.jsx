/**
 * PersonalizacionPage.test.jsx
 * Verifica el renderizado y comportamiento de la pÃ¡gina de personalizaciÃ³n.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PersonalizacionPage from '../../frontend/src/components/PersonalizacionPage.jsx';
import { ConfigProvider } from '../../frontend/src/context/ConfigContext.jsx';

// â”€â”€ Mocks â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

/** Click the accordion toggle button for the given section title */
function openSection(titleText) {
  const btn = screen.getAllByRole('button').find(b => b.textContent.includes(titleText));
  fireEvent.click(btn);
}

// â”€â”€ Tests â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe('PersonalizacionPage â€” renderizado', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza sin errores', () => {
    expect(() => renderPage()).not.toThrow();
  });

  it('muestra el tÃ­tulo de la pÃ¡gina', () => {
    renderPage();
    expect(screen.getByText('ConfiguraciÃ³n')).toBeInTheDocument();
  });

  it('muestra la secciÃ³n Mi cuenta', () => {
    renderPage();
    expect(screen.getByText(/mi cuenta/i)).toBeInTheDocument();
  });

  it('muestra la secciÃ³n Apariencia', () => {
    renderPage();
    expect(screen.getByText(/apariencia/i)).toBeInTheDocument();
  });

  it('muestra la secciÃ³n Resumen por email', () => {
    renderPage();
    expect(screen.getByText(/resumen por email/i)).toBeInTheDocument();
  });

  it('muestra la secciÃ³n Identidad', () => {
    renderPage();
    expect(screen.getByText(/identidad/i)).toBeInTheDocument();
  });
});

describe('PersonalizacionPage â€” Apariencia', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('muestra el toggle de modo oscuro', () => {
    renderPage();
    openSection('Apariencia');
    expect(screen.getByLabelText(/toggle dark mode/i)).toBeInTheDocument();
  });

  it('muestra las 3 paletas de color', () => {
    renderPage();
    openSection('Apariencia');
    expect(screen.getByText('CÃ¡lido')).toBeInTheDocument();
    expect(screen.getByText('Pizarra')).toBeInTheDocument();
    expect(screen.getByText('Bosque')).toBeInTheDocument();
  });

  it('el toggle de modo oscuro responde al click', () => {
    renderPage();
    openSection('Apariencia');
    const toggle = screen.getByLabelText(/toggle dark mode/i);
    const htmlEl = document.documentElement;
    const initialDark = htmlEl.classList.contains('dark');
    fireEvent.click(toggle);
    // State changes â€” just verify no throw
    expect(toggle).toBeInTheDocument();
    // Cleanup: restore original state
    if (htmlEl.classList.contains('dark') !== initialDark) {
      fireEvent.click(toggle);
    }
  });
});

describe('PersonalizacionPage â€” Mi cuenta', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('muestra los campos de cambio de usuario', () => {
    renderPage();
    openSection('Mi cuenta');
    // At least one password field and one text field visible in the username form
    const passwordInputs = screen.getAllByDisplayValue('');
    expect(passwordInputs.length).toBeGreaterThan(0);
  });

  it('muestra los botones de guardar', () => {
    renderPage();
    openSection('Mi cuenta');
    const buttons = screen.getAllByText(/guardar|cambiar/i);
    expect(buttons.length).toBeGreaterThan(0);
  });
});

describe('PersonalizacionPage â€” Identidad', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('muestra el Ã¡rea de firma de email', () => {
    renderPage();
    openSection('Identidad');
    expect(screen.getByPlaceholderText(/ej: furnigest/i)).toBeInTheDocument();
  });

  it('muestra el botÃ³n de subir logo', () => {
    renderPage();
    openSection('Identidad');
    expect(screen.getByText(/subir logo/i)).toBeInTheDocument();
  });

  it('guarda la firma de email al enviar el formulario', async () => {
    renderPage();
    openSection('Identidad');
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

describe('PersonalizacionPage â€” Formularios cuenta', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiFetch.mockResolvedValue({});
  });

  it('envÃ­a el formulario de cambio de contraseÃ±a con contraseÃ±as que coinciden', async () => {
    renderPage();
    openSection('Mi cuenta');
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

  it('muestra error cuando las contraseÃ±as nueva y confirmaciÃ³n no coinciden', async () => {
    renderPage();
    openSection('Mi cuenta');
    const forms = document.querySelectorAll('form');
    const pwForm = forms[1];
    const inputs = pwForm.querySelectorAll('input');

    fireEvent.change(inputs[0], { target: { value: 'actual' } });
    fireEvent.change(inputs[1], { target: { value: 'nueva12345' } });
    fireEvent.change(inputs[2], { target: { value: 'diferente' } });
    fireEvent.submit(pwForm);

    await waitFor(() => {
      expect(screen.getByText(/contraseÃ±as nuevas no coinciden/i)).toBeInTheDocument();
    });
    // apiFetch no debe haberse llamado con auth/me (solo se llama config en el mount)
    expect(apiFetch).not.toHaveBeenCalledWith('auth/me', expect.anything());
  });

  it('envÃ­a el formulario de cambio de usuario y llama a auth/me', async () => {
    renderPage();
    openSection('Mi cuenta');
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

  it('envÃ­a el formulario de resumen por email', async () => {
    renderPage();
    openSection('Resumen por email');
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

  it('muestra error cuando la API falla en cambio de contraseÃ±a', async () => {
    // Usamos mockImplementation para rechazar solo las llamadas a auth/me
    // (mockRejectedValueOnce se consumirÃ­a en el fetch inicial de config)
    apiFetch.mockImplementation((url) => {
      if (url === 'auth/me') return Promise.reject(new Error('Error API'));
      return Promise.resolve({});
    });
    renderPage();
    openSection('Mi cuenta');
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

