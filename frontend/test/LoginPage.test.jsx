/**
 * LoginPage.test.jsx
 * Tests de renderizado y comportamiento del formulario de login.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LoginPage from '../src/components/LoginPage.jsx';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => mockNavigate };
});

// Mock api/auth
vi.mock('../src/api/auth.js', () => ({
  login: vi.fn(),
  saveToken: vi.fn(),
}));

import { login, saveToken } from '../src/api/auth.js';

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
    expect(screen.getByText('Financias')).toBeInTheDocument();
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
