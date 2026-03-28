/**
 * UIComponents.test.jsx
 * Tests para componentes de UI con cobertura 0%:
 * Badge, AnimatedTabs, Pagination, NotFoundPage, ProtectedRoute
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

// ─────────────────────────────────────────────────────────────────
// Badge
// ─────────────────────────────────────────────────────────────────
import { Badge } from '../../frontend/src/components/ui/Badge.jsx';

describe('Badge', () => {
  it('renderiza con variante por defecto', () => {
    render(<Badge>Texto</Badge>);
    expect(screen.getByText('Texto')).toBeInTheDocument();
  });

  it('renderiza con variante success', () => {
    render(<Badge variant="success">OK</Badge>);
    const badge = screen.getByText('OK');
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain('green');
  });

  it('renderiza con variante destructive', () => {
    render(<Badge variant="destructive">Error</Badge>);
    const badge = screen.getByText('Error');
    expect(badge.className).toContain('red');
  });

  it('renderiza con variante warning', () => {
    render(<Badge variant="warning">Aviso</Badge>);
    expect(screen.getByText('Aviso')).toBeInTheDocument();
  });

  it('renderiza con variante secondary', () => {
    render(<Badge variant="secondary">Sec</Badge>);
    expect(screen.getByText('Sec')).toBeInTheDocument();
  });

  it('renderiza con variante info', () => {
    render(<Badge variant="info">Info</Badge>);
    expect(screen.getByText('Info')).toBeInTheDocument();
  });

  it('renderiza con variante purple', () => {
    render(<Badge variant="purple">Purple</Badge>);
    expect(screen.getByText('Purple')).toBeInTheDocument();
  });

  it('renderiza con variante outline', () => {
    render(<Badge variant="outline">Outline</Badge>);
    expect(screen.getByText('Outline')).toBeInTheDocument();
  });

  it('aplica className adicional', () => {
    render(<Badge className="mi-clase">X</Badge>);
    expect(screen.getByText('X').className).toContain('mi-clase');
  });

  it('pasa props adicionales al span', () => {
    render(<Badge data-testid="mybadge">Y</Badge>);
    expect(screen.getByTestId('mybadge')).toBeInTheDocument();
  });

  it('variante desconocida usa la variante default', () => {
    render(<Badge variant="unknown-variant">Z</Badge>);
    expect(screen.getByText('Z')).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────
// AnimatedTabs
// ─────────────────────────────────────────────────────────────────
import { AnimatedTabs } from '../../frontend/src/components/ui/AnimatedTabs.jsx';

describe('AnimatedTabs', () => {
  const tabs = [
    { value: 'lista', label: 'Listado' },
    { value: 'gestion', label: 'Gestión' },
  ];

  it('renderiza todos los tabs', () => {
    render(<AnimatedTabs tabs={tabs} activeTab="lista" onChange={vi.fn()} />);
    expect(screen.getByText('Listado')).toBeInTheDocument();
    expect(screen.getByText('Gestión')).toBeInTheDocument();
  });

  it('el tab activo tiene la clase correcta', () => {
    render(<AnimatedTabs tabs={tabs} activeTab="lista" onChange={vi.fn()} />);
    const btn = screen.getByText('Listado');
    expect(btn.className).toContain('text-gray-900');
  });

  it('el tab inactivo tiene la clase correcta', () => {
    render(<AnimatedTabs tabs={tabs} activeTab="lista" onChange={vi.fn()} />);
    const btn = screen.getByText('Gestión');
    expect(btn.className).toContain('text-gray-500');
  });

  it('llama a onChange al hacer clic en un tab', () => {
    const onChange = vi.fn();
    render(<AnimatedTabs tabs={tabs} activeTab="lista" onChange={onChange} />);
    fireEvent.click(screen.getByText('Gestión'));
    expect(onChange).toHaveBeenCalledWith('gestion');
  });

  it('llama a onChange con el valor correcto para el primer tab', () => {
    const onChange = vi.fn();
    render(<AnimatedTabs tabs={tabs} activeTab="gestion" onChange={onChange} />);
    fireEvent.click(screen.getByText('Listado'));
    expect(onChange).toHaveBeenCalledWith('lista');
  });

  it('renderiza tres tabs correctamente', () => {
    const tres = [
      { value: 'a', label: 'A' },
      { value: 'b', label: 'B' },
      { value: 'c', label: 'C' },
    ];
    render(<AnimatedTabs tabs={tres} activeTab="b" onChange={vi.fn()} />);
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
    expect(screen.getByText('C')).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────
// Pagination
// ─────────────────────────────────────────────────────────────────
import { Pagination } from '../../frontend/src/components/ui/Pagination.jsx';

describe('Pagination', () => {
  it('no renderiza nada cuando hay solo 1 página', () => {
    const { container } = render(
      <Pagination page={1} total={10} pageSize={20} onChange={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renderiza botones de paginación cuando hay múltiples páginas', () => {
    render(<Pagination page={1} total={100} pageSize={10} onChange={vi.fn()} />);
    expect(screen.getByLabelText('Siguiente')).toBeInTheDocument();
    expect(screen.getByLabelText('Anterior')).toBeInTheDocument();
  });

  it('el botón anterior está deshabilitado en la primera página', () => {
    render(<Pagination page={1} total={100} pageSize={10} onChange={vi.fn()} />);
    expect(screen.getByLabelText('Anterior')).toBeDisabled();
  });

  it('el botón siguiente está deshabilitado en la última página', () => {
    render(<Pagination page={10} total={100} pageSize={10} onChange={vi.fn()} />);
    expect(screen.getByLabelText('Siguiente')).toBeDisabled();
  });

  it('llama a onChange al hacer clic en la siguiente página', () => {
    const onChange = vi.fn();
    render(<Pagination page={1} total={100} pageSize={10} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText('Siguiente'));
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it('llama a onChange al hacer clic en la página anterior', () => {
    const onChange = vi.fn();
    render(<Pagination page={3} total={100} pageSize={10} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText('Anterior'));
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it('llama a onChange al hacer clic en un número de página', () => {
    const onChange = vi.fn();
    render(<Pagination page={1} total={50} pageSize={10} onChange={onChange} />);
    // Click page 2
    const page2Btns = screen.getAllByRole('button').filter(b => b.textContent === '2');
    expect(page2Btns.length).toBeGreaterThan(0);
    fireEvent.click(page2Btns[0]);
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it('muestra los puntos suspensivos cuando hay muchas páginas', () => {
    render(<Pagination page={5} total={200} pageSize={10} onChange={vi.fn()} />);
    const ellipsis = document.querySelectorAll('span');
    const ellipsisSpans = Array.from(ellipsis).filter(s => s.textContent === '…');
    expect(ellipsisSpans.length).toBeGreaterThan(0);
  });

  it('la página actual tiene aria-current="page"', () => {
    render(<Pagination page={2} total={50} pageSize={10} onChange={vi.fn()} />);
    const buttons = screen.getAllByRole('button');
    const activePage = buttons.find(b => b.getAttribute('aria-current') === 'page');
    expect(activePage).toBeTruthy();
    expect(activePage.textContent).toBe('2');
  });

  it('renderiza cuando total es 0 (sin páginas)', () => {
    const { container } = render(
      <Pagination page={1} total={0} pageSize={10} onChange={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('getPages genera correctamente para total ≤ 7 páginas', () => {
    render(<Pagination page={1} total={30} pageSize={10} onChange={vi.fn()} />);
    // 3 pages total, all buttons should appear: 1, 2, 3
    const btns = screen.getAllByRole('button').filter(b => /^\d+$/.test(b.textContent));
    expect(btns.map(b => b.textContent)).toContain('1');
    expect(btns.map(b => b.textContent)).toContain('2');
    expect(btns.map(b => b.textContent)).toContain('3');
  });

  it('getPages cuando página actual está al final', () => {
    render(<Pagination page={10} total={200} pageSize={10} onChange={vi.fn()} />);
    expect(screen.getByText('1')).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────
// NotFoundPage
// ─────────────────────────────────────────────────────────────────
import { MemoryRouter } from 'react-router-dom';
import NotFoundPage from '../../frontend/src/components/NotFoundPage.jsx';

describe('NotFoundPage', () => {
  it('muestra el código 404', () => {
    render(<MemoryRouter><NotFoundPage /></MemoryRouter>);
    expect(screen.getByText('404')).toBeInTheDocument();
  });

  it('muestra el enlace "Volver al inicio"', () => {
    render(<MemoryRouter><NotFoundPage /></MemoryRouter>);
    expect(screen.getByRole('link')).toBeInTheDocument();
  });

  it('el enlace apunta a /', () => {
    render(<MemoryRouter><NotFoundPage /></MemoryRouter>);
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe('/');
  });
});

// ─────────────────────────────────────────────────────────────────
// ProtectedRoute
// ─────────────────────────────────────────────────────────────────
import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import * as auth from '../../frontend/src/api/auth.js';
import ProtectedRoute from '../../frontend/src/components/ProtectedRoute.jsx';

describe('ProtectedRoute', () => {
  it('renderiza el elemento cuando el usuario está autenticado', () => {
    vi.spyOn(auth, 'isAuthenticated').mockReturnValue(true);
    render(
      <Router>
        <Routes>
          <Route path="/" element={<ProtectedRoute element={<div>Protected</div>} />} />
          <Route path="/login" element={<div>Login</div>} />
        </Routes>
      </Router>
    );
    expect(screen.getByText('Protected')).toBeInTheDocument();
  });

  it('redirige a /login cuando el usuario NO está autenticado', () => {
    vi.spyOn(auth, 'isAuthenticated').mockReturnValue(false);
    render(
      <Router>
        <Routes>
          <Route path="/" element={<ProtectedRoute element={<div>Protected</div>} />} />
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </Router>
    );
    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Protected')).not.toBeInTheDocument();
  });
});
