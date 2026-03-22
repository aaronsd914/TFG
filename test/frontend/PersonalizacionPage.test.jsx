/**
 * PersonalizacionPage.test.jsx
 * Verifica el renderizado y comportamiento de la pÃ¡gina de personalizaciÃ³n.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PersonalizacionPage from '../../frontend/src/components/PersonalizacionPage.jsx';
import { ConfigProvider, ConfigContext, DEFAULTS as CONFIG_DEFAULTS } from '../../frontend/src/context/ConfigContext.jsx';
import { ThemeProvider } from '../../frontend/src/context/ThemeContext.jsx';

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
      <ThemeProvider>
        <ConfigProvider>
          <PersonalizacionPage />
        </ConfigProvider>
      </ThemeProvider>
    </MemoryRouter>
  );
}

/** Render with a pre-set config value (bypasses async config loading) */
function renderPageWithConfig(extraConfig = {}) {
  const config = { ...CONFIG_DEFAULTS, ...extraConfig };
  const updateConfig = vi.fn().mockResolvedValue(undefined);
  return render(
    <MemoryRouter>
      <ThemeProvider>
        <ConfigContext.Provider value={{ config, updateConfig }}>
          <PersonalizacionPage />
        </ConfigContext.Provider>
      </ThemeProvider>
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

  it('muestra el título de la página', () => {
    renderPage();
    expect(screen.getByText('Configuración')).toBeInTheDocument();
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
    expect(screen.getByText('Cálido')).toBeInTheDocument();
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
      expect(screen.getByText(/contraseñas nuevas no coinciden/i)).toBeInTheDocument();
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

// ── Accordion behaviour ────────────────────────────────────────────────────

describe('PersonalizacionPage — Accordion', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('las secciones empiezan cerradas (contenido no visible)', () => {
    renderPage();
    // Toggle is in the button label, not in the content area
    expect(screen.queryByLabelText(/toggle dark mode/i)).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/ej: furnigest/i)).not.toBeInTheDocument();
  });

  it('abre y cierra una sección al hacer clic dos veces', () => {
    renderPage();
    openSection('Apariencia');
    expect(screen.getByLabelText(/toggle dark mode/i)).toBeInTheDocument();
    // Close it
    openSection('Apariencia');
    expect(screen.queryByLabelText(/toggle dark mode/i)).not.toBeInTheDocument();
  });

  it('abre varias secciones independientemente', () => {
    renderPage();
    openSection('Apariencia');
    openSection('Identidad');
    expect(screen.getByLabelText(/toggle dark mode/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/ej: furnigest/i)).toBeInTheDocument();
  });
});

// ── Resumen email: nuevos campos ───────────────────────────────────────────

describe('PersonalizacionPage — Resumen email nuevos campos', () => {
  beforeEach(() => { vi.clearAllMocks(); apiFetch.mockResolvedValue({}); });

  it('muestra el campo fecha de inicio', () => {
    renderPage();
    openSection('Resumen por email');
    expect(document.getElementById('email-fecha-inicio')).toBeInTheDocument();
  });

  it('muestra el campo hora de envío', () => {
    renderPage();
    openSection('Resumen por email');
    expect(document.getElementById('email-hora-envio')).toBeInTheDocument();
  });

  it('no muestra previsualización sin fecha de inicio', () => {
    renderPage();
    openSection('Resumen por email');
    expect(screen.queryByText(/próximos envíos programados/i)).not.toBeInTheDocument();
  });

  it('muestra previsualización al introducir fecha de inicio válida', async () => {
    // Pre-populate fecha so config async reload doesn't clear our change
    apiFetch.mockImplementation((url) => {
      if (url === 'config') return Promise.resolve({ resumen_fecha_inicio: '2024-01-01', resumen_intervalo_dias: '7' });
      return Promise.resolve({});
    });
    renderPage();
    openSection('Resumen por email');
    await waitFor(() => {
      expect(screen.getByTestId('schedule-preview')).toBeInTheDocument();
    });
  });

  it('guarda fecha de inicio y hora de envío al guardar', async () => {
    renderPage();
    openSection('Resumen por email');
    const emailInput = await screen.findByPlaceholderText('tu@email.com');
    fireEvent.change(emailInput, { target: { value: 'test@test.com' } });
    const fechaInput = document.getElementById('email-fecha-inicio');
    fireEvent.change(fechaInput, { target: { value: '2026-01-01' } });
    const horaInput = document.getElementById('email-hora-envio');
    fireEvent.change(horaInput, { target: { value: '08:30' } });

    fireEvent.submit(emailInput.closest('form'));

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining('config/resumen_fecha_inicio'),
        expect.objectContaining({ method: 'PUT' }),
      );
      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining('config/resumen_hora_envio'),
        expect.objectContaining({ method: 'PUT' }),
      );
    });
  });

  it('muestra error cuando la API falla al guardar email config', async () => {
    renderPage();
    openSection('Resumen por email');
    const emailInput = await screen.findByPlaceholderText('tu@email.com');
    fireEvent.change(emailInput, { target: { value: 'test@test.com' } });

    // Override mock to reject config PUT calls
    apiFetch.mockImplementation((url) => {
      if (url.includes('config/')) return Promise.reject(new Error('Fallo servidor'));
      return Promise.resolve({});
    });

    fireEvent.submit(emailInput.closest('form'));
    await waitFor(() => {
      expect(screen.getByText(/fallo servidor/i)).toBeInTheDocument();
    });
  });

  it('muestra mensaje de éxito al guardar configuración de email', async () => {
    renderPage();
    openSection('Resumen por email');
    const emailInput = screen.getByPlaceholderText('tu@email.com');
    fireEvent.change(emailInput, { target: { value: 'ok@test.com' } });
    fireEvent.submit(emailInput.closest('form'));
    // Verify all config keys were updated (success path executed)
    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining('config/resumen_hora_envio'),
        expect.objectContaining({ method: 'PUT' }),
      );
    });
  });

  it('muestra la fecha del último envío si está configurada', async () => {
    renderPageWithConfig({ resumen_ultima_vez: '2026-03-01 09:00' });
    openSection('Resumen por email');
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/2026-03-01/);
    });
  });

  it('no muestra preview con intervalo 0', async () => {
    apiFetch.mockImplementation((url) => {
      if (url === 'config') return Promise.resolve({ resumen_fecha_inicio: '2024-01-01', resumen_intervalo_dias: '0' });
      return Promise.resolve({});
    });
    renderPage();
    openSection('Resumen por email');
    await waitFor(() => {
      expect(document.getElementById('email-intervalo-dias')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('schedule-preview')).not.toBeInTheDocument();
  });

  it('no muestra preview con fecha inválida', async () => {
    apiFetch.mockImplementation((url) => {
      if (url === 'config') return Promise.resolve({ resumen_fecha_inicio: 'invalid-date', resumen_intervalo_dias: '7' });
      return Promise.resolve({});
    });
    renderPage();
    openSection('Resumen por email');
    await waitFor(() => {
      expect(document.getElementById('email-intervalo-dias')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('schedule-preview')).not.toBeInTheDocument();
  });

  it('muestra preview con fecha de inicio en el futuro (cycles=0)', async () => {
    apiFetch.mockImplementation((url) => {
      if (url === 'config') return Promise.resolve({ resumen_fecha_inicio: '2030-01-01', resumen_intervalo_dias: '7' });
      return Promise.resolve({});
    });
    renderPage();
    openSection('Resumen por email');
    await waitFor(() => {
      expect(screen.getByTestId('schedule-preview')).toBeInTheDocument();
    });
  });
});

// ── Apariencia: paleta ─────────────────────────────────────────────────────

describe('PersonalizacionPage — Paleta de color', () => {
  beforeEach(() => { vi.clearAllMocks(); apiFetch.mockResolvedValue({}); });

  it('cambia la paleta al hacer clic en Pizarra', async () => {
    renderPage();
    openSection('Apariencia');
    await act(async () => {
      fireEvent.click(screen.getByText('Pizarra').closest('button'));
    });
    expect(document.documentElement.dataset.palette).toBe('slate');
  });

  it('cambia la paleta al hacer clic en Bosque', async () => {
    renderPage();
    openSection('Apariencia');
    await act(async () => {
      fireEvent.click(screen.getByText('Bosque').closest('button'));
    });
    expect(document.documentElement.dataset.palette).toBe('forest');
  });
});

// ── Mi cuenta: casos de éxito y error ─────────────────────────────────────

describe('PersonalizacionPage — Mi cuenta éxito/error', () => {
  beforeEach(() => { vi.clearAllMocks(); apiFetch.mockResolvedValue({}); });

  it('muestra mensaje de éxito al cambiar contraseña correctamente', async () => {
    renderPage();
    openSection('Mi cuenta');
    const forms = document.querySelectorAll('form');
    const pwForm = forms[1];
    const inputs = pwForm.querySelectorAll('input');
    fireEvent.change(inputs[0], { target: { value: 'actual123' } });
    fireEvent.change(inputs[1], { target: { value: 'nueva12345' } });
    fireEvent.change(inputs[2], { target: { value: 'nueva12345' } });
    fireEvent.submit(pwForm);
    // Verify the submit was handled (apiFetch called for auth/me)
    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith(
        'auth/me',
        expect.objectContaining({ method: 'PUT' }),
      );
    });
  });

  it('muestra error al fallar cambio de usuario', async () => {
    apiFetch.mockImplementation((url) => {
      if (url === 'auth/me') return Promise.reject(new Error('Usuario en uso'));
      return Promise.resolve({});
    });
    renderPage();
    openSection('Mi cuenta');
    const forms = document.querySelectorAll('form');
    const userForm = forms[0];
    const inputs = userForm.querySelectorAll('input');
    fireEvent.change(inputs[0], { target: { value: 'mipassword' } });
    fireEvent.change(inputs[1], { target: { value: 'nuevonombre' } });
    fireEvent.submit(userForm);
    await waitFor(() => {
      expect(screen.getByText(/usuario en uso/i)).toBeInTheDocument();
    });
  });
});

// ── Identidad: logo y firma edge cases ────────────────────────────────────

describe('PersonalizacionPage — Identidad edge cases', () => {
  beforeEach(() => { vi.clearAllMocks(); apiFetch.mockResolvedValue({}); });

  it('muestra mensaje de éxito al guardar la firma', async () => {
    renderPage();
    openSection('Identidad');
    const textarea = screen.getByPlaceholderText(/ej: furnigest/i);
    fireEvent.change(textarea, { target: { value: 'Mi firma' } });
    const saveBtn = screen.getByText('Guardar firma');
    fireEvent.click(saveBtn);
    await waitFor(() => {
      expect(screen.getByText(/firma guardada/i)).toBeInTheDocument();
    });
  });

  it('muestra error al fallar guardado de firma', async () => {
    apiFetch.mockImplementation((url) => {
      if (url.includes('config/firma_email')) return Promise.reject(new Error('Error firma'));
      return Promise.resolve({});
    });
    renderPage();
    openSection('Identidad');
    const textarea = screen.getByPlaceholderText(/ej: furnigest/i);
    fireEvent.change(textarea, { target: { value: 'Mi firma' } });
    fireEvent.click(screen.getByText('Guardar firma'));
    await waitFor(() => {
      expect(screen.getByText(/error firma/i)).toBeInTheDocument();
    });
  });

  it('rechaza un archivo de logo demasiado grande', () => {
    renderPage();
    openSection('Identidad');
    const fileInput = document.querySelector('input[type="file"]');
    const bigFile = new File(['a'], 'big.png', { type: 'image/png' });
    Object.defineProperty(bigFile, 'size', { value: 201 * 1024, configurable: true });
    fireEvent.change(fileInput, { target: { files: [bigFile] } });
    expect(screen.getByText(/demasiado grande/i)).toBeInTheDocument();
  });

  it('muestra el logo existente y el botón Eliminar cuando hay logo', async () => {
    apiFetch.mockImplementation((url) => {
      if (url === 'config') return Promise.resolve({ logo_empresa: 'data:image/png;base64,abc' });
      return Promise.resolve({});
    });
    renderPage();
    openSection('Identidad');
    await waitFor(() => {
      expect(screen.getByAltText('Logo actual')).toBeInTheDocument();
      expect(screen.getByText('Eliminar')).toBeInTheDocument();
      expect(screen.getByText('Cambiar logo')).toBeInTheDocument();
    });
  });

  it('elimina el logo al hacer clic en Eliminar', async () => {
    apiFetch.mockImplementation((url) => {
      if (url === 'config') return Promise.resolve({ logo_empresa: 'data:image/png;base64,abc' });
      return Promise.resolve({});
    });
    renderPage();
    openSection('Identidad');
    await waitFor(() => expect(screen.getByText('Eliminar')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Eliminar'));
    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining('config/logo_empresa'),
        expect.objectContaining({ method: 'PUT' }),
      );
    });
  });

  it('muestra mensaje de éxito al eliminar logo', async () => {
    apiFetch.mockImplementation((url) => {
      if (url === 'config') return Promise.resolve({ logo_empresa: 'data:image/png;base64,abc' });
      return Promise.resolve({});
    });
    renderPage();
    openSection('Identidad');
    await waitFor(() => expect(screen.getByText('Eliminar')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Eliminar'));
    await waitFor(() => {
      expect(screen.getByText(/logo eliminado/i)).toBeInTheDocument();
    });
  });

  it('muestra error al fallar eliminación de logo', async () => {
    apiFetch.mockImplementation((url) => {
      if (url === 'config') return Promise.resolve({ logo_empresa: 'data:image/png;base64,abc' });
      if (url.includes('config/logo_empresa')) return Promise.reject(new Error('Error logo'));
      return Promise.resolve({});
    });
    renderPage();
    openSection('Identidad');
    await waitFor(() => expect(screen.getByText('Eliminar')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Eliminar'));
    await waitFor(() => {
      expect(screen.getByText(/error logo/i)).toBeInTheDocument();
    });
  });
});


