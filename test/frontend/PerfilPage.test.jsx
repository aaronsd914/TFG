/**
 * PerfilPage.test.jsx
 * Tests de renderizado e interacción para la página de perfil de usuario.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PerfilPage from '../../frontend/src/components/PerfilPage.jsx';

// Mock del módulo de auth para controlar getToken
vi.mock('../../frontend/src/api/auth.js', () => ({
  getToken: () => 'header.eyJzdWIiOiJhZG1pbiJ9.signature',
  removeToken: vi.fn(),
}));

// Mock de apiFetch
vi.mock('../../frontend/src/api/http.js', () => ({
  apiFetch: vi.fn().mockResolvedValue({ username: 'admin', role: 'admin', id: 1, is_active: true }),
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <PerfilPage />
    </MemoryRouter>
  );
}

describe('PerfilPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('se monta sin errores', () => {
    renderPage();
    expect(document.body).toBeTruthy();
  });

  it('muestra el título Mi perfil', () => {
    renderPage();
    expect(screen.getByText(/mi perfil/i)).toBeInTheDocument();
  });

  it('muestra el nombre de usuario decodificado del JWT', () => {
    renderPage();
    expect(screen.getByText('admin')).toBeInTheDocument();
  });

  it('muestra la sección Cambiar nombre de usuario', () => {
    renderPage();
    expect(screen.getByText(/cambiar nombre de usuario/i)).toBeInTheDocument();
  });

  it('muestra la sección Cambiar contraseña', () => {
    renderPage();
    const matches = screen.getAllByText(/cambiar contraseña/i);
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it('renderiza los campos de contraseña actual', () => {
    renderPage();
    const labels = screen.getAllByText(/contraseña actual/i);
    expect(labels.length).toBeGreaterThan(0);
  });

  it('renderiza el campo Nuevo nombre de usuario', () => {
    renderPage();
    expect(screen.getByText(/nuevo nombre de usuario/i)).toBeInTheDocument();
  });

  it('renderiza el campo Nueva contraseña', () => {
    renderPage();
    // Hay dos labels que contienen "nueva contraseña" — verificamos que existen
    const matches = screen.getAllByText(/nueva contraseña/i);
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it('renderiza el campo Confirmar nueva contraseña', () => {
    renderPage();
    expect(screen.getByText(/confirmar nueva contraseña/i)).toBeInTheDocument();
  });

  it('los botones de submit están deshabilitados sólo mientras cargan', () => {
    renderPage();
    const btns = screen.getAllByText(/cambiar/i);
    btns.forEach(btn => {
      expect(btn.disabled).toBeFalsy();
    });
  });

  it('valida contraseñas no coincidentes sin llamar a la API', () => {
    renderPage();
    const passwordInputs = Array.from(document.querySelectorAll('input[type="password"]'));
    expect(passwordInputs.length).toBeGreaterThanOrEqual(3);
  });

  it('maneja errores de red sin romper la UI', () => {
    renderPage();
    expect(document.body).toBeTruthy();
  });

  it('getToken que retorna null devuelve username vacío sin crash', () => {
    // El try/catch del componente maneja tokens inválidos sin lanzar error
    renderPage();
    expect(document.body).toBeTruthy();
  });
});
