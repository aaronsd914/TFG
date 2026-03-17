/**
 * App.test.jsx
 * Verifica la estructura raíz de la aplicación: Sidebar + Outlet.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../src/components/App.jsx';

function renderApp() {
  return render(
    <MemoryRouter>
      <App />
    </MemoryRouter>
  );
}

describe('App layout', () => {
  it('renderiza sin errores', () => {
    expect(() => renderApp()).not.toThrow();
  });

  it('muestra el Sidebar con el nombre de la app', () => {
    renderApp();
    expect(screen.getAllByText('Financias')[0]).toBeInTheDocument();
  });

  it('tiene el contenedor raíz con flex y h-screen', () => {
    const { container } = renderApp();
    const root = container.firstChild;
    expect(root.className).toContain('flex');
    expect(root.className).toContain('h-screen');
  });

  it('contiene un elemento <main>', () => {
    const { container } = renderApp();
    expect(container.querySelector('main')).toBeInTheDocument();
  });

  it('el <aside> (sidebar) es visible', () => {
    const { container } = renderApp();
    expect(container.querySelector('aside')).toBeInTheDocument();
  });
});
