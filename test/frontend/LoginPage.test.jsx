/**
 * LoginPage.test.jsx
 * Tests de renderizado y comportamiento del formulario de login.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LoginPage from '../../frontend/src/components/LoginPage.jsx';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => mockNavigate };
});

// Mock api/auth
vi.mock('../../frontend/src/api/auth.js', () => ({
  login: vi.fn(),
  saveToken: vi.fn(),
}));

// Mock ThemeContext para controlar isDark y palette en tests
vi.mock('../../frontend/src/context/ThemeContext.jsx', () => ({
  useTheme: vi.fn(() => ({ isDark: false, palette: 'warm' })),
}));

import { login, saveToken } from '../../frontend/src/api/auth.js';
import { useTheme } from '../../frontend/src/context/ThemeContext.jsx';

function renderLogin() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>
  );
}

describe('LoginPage — renderizado', () => {
  it('muestra el título de la aplicación', () => {
    renderLogin();
    expect(screen.getByText('FurniGest')).toBeInTheDocument();
  });

  it('muestra el campo usuario', () => {
    renderLogin();
    expect(screen.getByPlaceholderText('Nombre de usuario')).toBeInTheDocument();
  });

  it('muestra el campo contraseña', () => {
    renderLogin();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
  });

  it('el campo contraseña es de tipo password por defecto', () => {
    renderLogin();
    expect(screen.getByPlaceholderText('••••••••')).toHaveAttribute('type', 'password');
  });

  it('muestra el botón de submit', () => {
    renderLogin();
    expect(screen.getByRole('button', { name: /iniciar sesi/i })).toBeInTheDocument();
  });
});

describe('LoginPage — interacción', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useTheme.mockReturnValue({ isDark: false, palette: 'warm' });
  });

  it('permite escribir en el campo usuario', () => {
    renderLogin();
    const input = screen.getByPlaceholderText('Nombre de usuario');
    fireEvent.change(input, { target: { value: 'admin' } });
    expect(input.value).toBe('admin');
  });

  it('permite escribir en el campo contraseña', () => {
    renderLogin();
    const input = screen.getByPlaceholderText('••••••••');
    fireEvent.change(input, { target: { value: 'secret' } });
    expect(input.value).toBe('secret');
  });

  it('alterna la visibilidad de la contraseña', () => {
    renderLogin();
    const passInput = screen.getByPlaceholderText('••••••••');
    const toggleBtn = screen.getByRole('button', { name: /mostrar|ocultar/i });
    expect(passInput).toHaveAttribute('type', 'password');
    fireEvent.click(toggleBtn);
    expect(passInput).toHaveAttribute('type', 'text');
    fireEvent.click(toggleBtn);
    expect(passInput).toHaveAttribute('type', 'password');
  });

  it('llama a login con las credenciales correctas al enviar el formulario', async () => {
    login.mockResolvedValue({ access_token: 'tok', token_type: 'bearer' });
    renderLogin();

    fireEvent.change(screen.getByPlaceholderText('Nombre de usuario'), { target: { value: 'admin' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'admin123' } });
    fireEvent.click(screen.getByRole('button', { name: /iniciar sesi/i }));

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith('admin', 'admin123');
    });
  });

  it('guarda el token y redirige al dashboard tras login correcto', async () => {
    login.mockResolvedValue({ access_token: 'tok123', token_type: 'bearer' });
    renderLogin();

    fireEvent.change(screen.getByPlaceholderText('Nombre de usuario'), { target: { value: 'admin' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'pass' } });
    fireEvent.click(screen.getByRole('button', { name: /iniciar sesi/i }));

    await waitFor(() => {
      expect(saveToken).toHaveBeenCalledWith('tok123');
      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
    });
  });

  it('muestra el mensaje de error cuando el login falla', async () => {
    login.mockRejectedValue(new Error('Credenciales incorrectas'));
    renderLogin();

    fireEvent.change(screen.getByPlaceholderText('Nombre de usuario'), { target: { value: 'admin' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: /iniciar sesi/i }));

    await waitFor(() => {
      expect(screen.getByText('Credenciales incorrectas')).toBeInTheDocument();
    });
  });

  it('no redirige si el login falla', async () => {
    login.mockRejectedValue(new Error('Error'));
    renderLogin();

    fireEvent.change(screen.getByPlaceholderText('Nombre de usuario'), { target: { value: 'x' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'y' } });
    fireEvent.click(screen.getByRole('button', { name: /iniciar sesi/i }));

    await waitFor(() => expect(login).toHaveBeenCalled());
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});

describe('LoginPage — tema y paleta', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('aplica data-theme="light" y data-palette="warm" por defecto', () => {
    useTheme.mockReturnValue({ isDark: false, palette: 'warm' });
    const { container } = renderLogin();
    expect(container.firstChild).toHaveAttribute('data-theme', 'light');
    expect(container.firstChild).toHaveAttribute('data-palette', 'warm');
  });

  it('aplica data-theme="dark" cuando isDark es true', () => {
    useTheme.mockReturnValue({ isDark: true, palette: 'warm' });
    const { container } = renderLogin();
    expect(container.firstChild).toHaveAttribute('data-theme', 'dark');
  });

  it('aplica data-palette="slate" con la paleta slate', () => {
    useTheme.mockReturnValue({ isDark: false, palette: 'slate' });
    const { container } = renderLogin();
    expect(container.firstChild).toHaveAttribute('data-palette', 'slate');
  });

  it('aplica data-palette="forest" con la paleta forest', () => {
    useTheme.mockReturnValue({ isDark: false, palette: 'forest' });
    const { container } = renderLogin();
    expect(container.firstChild).toHaveAttribute('data-palette', 'forest');
  });

  it('en modo oscuro los inputs muestran color claro (#f1f5f9)', () => {
    useTheme.mockReturnValue({ isDark: true, palette: 'warm' });
    renderLogin();
    const usernameInput = screen.getByPlaceholderText('Nombre de usuario');
    expect(usernameInput.style.color).toBe('#f1f5f9');
  });

  it('en modo claro los inputs muestran color oscuro (#1f2937)', () => {
    useTheme.mockReturnValue({ isDark: false, palette: 'warm' });
    renderLogin();
    const usernameInput = screen.getByPlaceholderText('Nombre de usuario');
    expect(usernameInput.style.color).toBe('#1f2937');
  });
});
