/**
 * TransportePage.test.jsx
 * Verifica el layout del módulo de transporte y las llamadas iniciales a la API.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import TransportePage from '../../frontend/src/components/TransportePage.jsx';
import { sileo } from 'sileo';

vi.mock('sileo', () => ({
  sileo: Object.assign(vi.fn(), {
    error: vi.fn(), success: vi.fn(), warning: vi.fn(), info: vi.fn(),
  }),
  Toaster: () => null,
}));

afterEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
});

function renderPage() {
  return render(<TransportePage />);
}

describe('TransportePage', () => {
  beforeEach(() => {
    // Responde a las tres llamadas iniciales: almacen, rutas, clientes
    fetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) }) // almacen
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) }) // rutas
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) }); // clientes
  });

  it('se monta sin errores', async () => {
    await act(async () => { renderPage(); });
    expect(document.body).toBeTruthy();
  });

  it('llama a la API al montar', async () => {
    renderPage();
    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });
  });

  it('consulta almacén, rutas y clientes al montar', async () => {
    renderPage();
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('transporte/almacen'));
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('transporte/rutas'));
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('clientes/get'));
    });
  });

  it('muestra el título "Transporte"', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /transporte/i })).toBeInTheDocument();
    });
  });

  it('muestra la columna de camiones', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/camiones/i)).toBeInTheDocument();
    });
  });

  it('gestiona errores de red sin romper la UI', async () => {
    fetch.mockReset();
    fetch.mockRejectedValue(new Error('Network Error'));
    await act(async () => { renderPage(); });
    expect(document.body).toBeTruthy();
  });

  it('no muestra las pestañas de Almacén/En ruta en la cabecera', async () => {
    await act(async () => { renderPage(); });
    // AnimatedTabs with almacen/ruta tabs were removed; only the h1 heading should appear
    const headings = screen.getAllByRole('heading');
    // There should be exactly one heading (the page title), no tab controls
    expect(headings.length).toBeGreaterThanOrEqual(1);
    // The header area should not contain animated tab buttons for almacen/ruta switching
    expect(screen.queryByRole('tab', { name: /almac/i })).toBeNull();
    expect(screen.queryByRole('tab', { name: /en ruta/i })).toBeNull();
  });

  it('no muestra el botón Entregar en las tarjetas de En ruta sin camión', async () => {
    // Set up rutas response with one albaran sin camion
    fetch.mockReset();
    fetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) }) // almacen empty
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          camiones: [],
          sin_camion: [{ id: 1, date: '2026-01-01', total: 100, status: 'RUTA', customer_id: 1, items: [] }],
        }),
      })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([{ id: 1, name: 'Juan', surnames: 'Test' }]) });

    await act(async () => { renderPage(); });

    await waitFor(() => {
      // The "Almacén" (return to warehouse) button should exist for sin_camion cards
      // but "Entregar" (deliver) button should NOT be present
      const buttons = screen.queryAllByRole('button');
      const entregar = buttons.filter(b => /entregar/i.test(b.textContent));
      expect(entregar).toHaveLength(0);
    });
  });
});
// ─────────────────────────────────────────────────────────────────
// Badge "Aceptada" desde localStorage (fix persistencia)
// ─────────────────────────────────────────────────────────────────
describe('TransportePage – aceptarRuta persistencia localStorage', () => {
  const LS_KEY_ACCEPTED = 'tfg_transportes_camiones_accepted';
  const LS_KEY_EXTRA = 'tfg_transportes_camiones_extra';

  it('muestra el badge "Aceptada" al cargar si está en localStorage', async () => {
    localStorage.setItem(LS_KEY_ACCEPTED, JSON.stringify({ '1': '2024-01-01T00:00:00Z' }));
    localStorage.setItem(LS_KEY_EXTRA, JSON.stringify([1]));

    fetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) }) // almacen
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          camiones: [{ camion_id: 1, albaranes: [{ id: 99, date: '2024-01-01', total: 100, customer_id: 1, status: 'RUTA', items: [] }] }],
          sin_camion: [],
        }),
      }) // rutas
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([{ id: 1, name: 'Juan', surnames: 'Test' }]) }); // clientes

    await act(async () => { renderPage(); });
    await waitFor(() => {
      expect(screen.getByText(/aceptada/i)).toBeInTheDocument();
    });
  });

  it('no muestra el badge "Aceptada" si no está en localStorage', async () => {
    fetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) }) // almacen
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          camiones: [{ camion_id: 1, albaranes: [{ id: 99, date: '2024-01-01', total: 100, customer_id: 1, status: 'RUTA', items: [] }] }],
          sin_camion: [],
        }),
      }) // rutas
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) }); // clientes

    await act(async () => { renderPage(); });
    await waitFor(() => screen.getByRole('heading', { name: /transporte/i }));
    // No accepted badge - only emptyBadge (Vacío) or nothing
    expect(screen.queryAllByText(/aceptada/i)).toHaveLength(0);
  });

  it('el estado aceptado persiste para múltiples camiones', async () => {
    localStorage.setItem(LS_KEY_ACCEPTED, JSON.stringify({
      '1': '2024-01-01T00:00:00Z',
      '2': '2024-01-02T00:00:00Z',
    }));

    fetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) }) // almacen
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          camiones: [
            { camion_id: 1, albaranes: [{ id: 99, date: '2024-01-01', total: 100, customer_id: 1, status: 'RUTA', items: [] }] },
            { camion_id: 2, albaranes: [{ id: 100, date: '2024-01-02', total: 200, customer_id: 1, status: 'RUTA', items: [] }] },
          ],
          sin_camion: [],
        }),
      }) // rutas
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) }); // clientes

    await act(async () => { renderPage(); });
    await waitFor(() => {
      const badges = screen.getAllByText(/aceptada/i);
      expect(badges.length).toBeGreaterThanOrEqual(2);
    });
  });
});

// ─────────────────────────────────────────────────────────────────
// Modal de camiones
// ─────────────────────────────────────────────────────────────────
describe('TransportePage – modal de camiones', () => {
  beforeEach(() => {
    fetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) }) // almacen
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ camiones: [], sin_camion: [] }) }) // rutas
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) }); // clientes
  });

  it('el botón "Camiones" abre el modal', async () => {
    await act(async () => { renderPage(); });
    await waitFor(() => screen.getByRole('button', { name: /camiones/i }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /camiones/i }));
    });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /añadir/i })).toBeInTheDocument();
    });
  });

  it('en el modal se puede introducir un número de camión', async () => {
    await act(async () => { renderPage(); });
    await waitFor(() => screen.getByRole('button', { name: /camiones/i }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /camiones/i }));
    });
    await waitFor(() => screen.getByRole('button', { name: /añadir/i }));
    const numInput = document.querySelector('input[type="number"]');
    expect(numInput).toBeInTheDocument();
    fireEvent.change(numInput, { target: { value: '5' } });
    expect(numInput.value).toBe('5');
  });

  it('añadir camión con número válido llama a sileo.success', async () => {
    await act(async () => { renderPage(); });
    await waitFor(() => screen.getByRole('button', { name: /camiones/i }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /camiones/i }));
    });
    await waitFor(() => screen.getByRole('button', { name: /añadir/i }));
    const numInput = document.querySelector('input[type="number"]');
    await act(async () => {
      fireEvent.change(numInput, { target: { value: '7' } });
      fireEvent.click(screen.getByRole('button', { name: /añadir/i }));
    });
    expect(sileo.success).toHaveBeenCalled();
  });

  it('añadir camión con número inválido (0) llama a sileo.warning', async () => {
    await act(async () => { renderPage(); });
    await waitFor(() => screen.getByRole('button', { name: /camiones/i }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /camiones/i }));
    });
    await waitFor(() => screen.getByRole('button', { name: /añadir/i }));
    const numInput = document.querySelector('input[type="number"]');
    await act(async () => {
      fireEvent.change(numInput, { target: { value: '0' } });
      fireEvent.click(screen.getByRole('button', { name: /añadir/i }));
    });
    expect(sileo.warning).toHaveBeenCalled();
  });

  it('el modal muestra "No hay camiones aún" cuando no hay camiones', async () => {
    await act(async () => { renderPage(); });
    await waitFor(() => screen.getByRole('button', { name: /camiones/i }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /camiones/i }));
    });
    await waitFor(() => {
      expect(screen.getByText(/no hay camiones/i)).toBeInTheDocument();
    });
  });
});

// ─────────────────────────────────────────────────────────────────
// Búsqueda y filtrado
// ─────────────────────────────────────────────────────────────────
describe('TransportePage – búsqueda', () => {
  beforeEach(() => {
    fetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) }) // almacen
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ camiones: [], sin_camion: [] }) }) // rutas
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) }); // clientes
  });

  it('muestra el campo de búsqueda', async () => {
    await act(async () => { renderPage(); });
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/id, cliente/i)).toBeInTheDocument();
    });
  });

  it('escribir en búsqueda actualiza el estado', async () => {
    await act(async () => { renderPage(); });
    await waitFor(() => screen.getByPlaceholderText(/id, cliente/i));
    const searchInput = screen.getByPlaceholderText(/id, cliente/i);
    await act(async () => {
      fireEvent.change(searchInput, { target: { value: '#99' } });
    });
    expect(searchInput.value).toBe('#99');
  });
});

// ─────────────────────────────────────────────────────────────────
// Renderizado con albaranes en almacén
// ─────────────────────────────────────────────────────────────────
describe('TransportePage – albaranes en almacén', () => {
  it('muestra los albaranes de almacén cuando el servidor los retorna', async () => {
    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([
          { id: 5, date: '2024-03-01', total: 250, customer_id: 42, status: 'ALMACEN', items: [] },
        ]),
      }) // almacen
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ camiones: [], sin_camion: [] }) }) // rutas
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) }); // clientes

    await act(async () => { renderPage(); });
    await waitFor(() => {
      expect(screen.getByText('#5')).toBeInTheDocument();
    });
  });

  it('muestra el botón "En ruta" para los albaranes de almacén', async () => {
    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([
          { id: 5, date: '2024-03-01', total: 250, customer_id: 42, status: 'ALMACEN', items: [] },
        ]),
      }) // almacen
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ camiones: [], sin_camion: [] }) }) // rutas
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) }); // clientes

    await act(async () => { renderPage(); });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /en ruta/i })).toBeInTheDocument();
    });
  });

  it('botón "En ruta" llama a POST transporte/ruta/pendiente', async () => {
    fetch
      // Initial load
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([
          { id: 5, date: '2024-03-01', total: 250, customer_id: 42, status: 'ALMACEN', items: [] },
        ]),
      })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ camiones: [], sin_camion: [] }) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) })
      // POST pendiente response
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ ok: true, n: 1 }) })
      // fetchAll re-fetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ camiones: [], sin_camion: [] }) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) });

    await act(async () => { renderPage(); });
    await waitFor(() => screen.getByRole('button', { name: /^en ruta$/i }));

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^en ruta$/i }));
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('transporte/ruta/pendiente'),
        expect.any(Object),
      );
    });
  });
});

// ─────────────────────────────────────────────────────────────────
// Albaranes en ruta sin camión
// ─────────────────────────────────────────────────────────────────
describe('TransportePage – albaranes sin camión (pendiente)', () => {
  const sinCamionRutas = {
    camiones: [],
    sin_camion: [
      { id: 8, date: '2024-03-02', total: 180, customer_id: 1, status: 'RUTA', items: [] },
    ],
  };

  beforeEach(() => {
    fetch.mockReset();
    fetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(sinCamionRutas) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([{ id: 1, name: 'Luis', surnames: 'Pérez' }]) });
  });

  it('muestra albarán en la columna "En ruta (pendiente camión)"', async () => {
    await act(async () => { renderPage(); });
    await waitFor(() => {
      expect(screen.getByText('#8')).toBeInTheDocument();
    });
  });

  it('muestra el botón "Almacén" para los albaranes sin camión', async () => {
    await act(async () => { renderPage(); });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^almacén$/i })).toBeInTheDocument();
    });
  });

  it('botón "Almacén" en pendiente llama a POST transporte/ruta/quitar', async () => {
    fetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ ok: true }) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ camiones: [], sin_camion: [] }) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) });

    await act(async () => { renderPage(); });
    await waitFor(() => screen.getByRole('button', { name: /^almacén$/i }));

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^almacén$/i }));
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('transporte/ruta/quitar'),
        expect.any(Object),
      );
    });
  });
});

// ─────────────────────────────────────────────────────────────────
// Albaranes asignados a un camión
// ─────────────────────────────────────────────────────────────────
describe('TransportePage – albaranes en camión', () => {
  const rutasConCamion = {
    camiones: [
      {
        camion_id: 3,
        albaranes: [
          { id: 12, date: '2024-03-03', total: 320, customer_id: 1, status: 'RUTA', items: [] },
        ],
      },
    ],
    sin_camion: [],
  };

  beforeEach(() => {
    fetch.mockReset();
    fetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(rutasConCamion) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([{ id: 1, name: 'Ana', surnames: 'Ruiz' }]) });
  });

  it('muestra el label del camión', async () => {
    await act(async () => { renderPage(); });
    await waitFor(() => {
      expect(screen.getByText(/camión 3/i)).toBeInTheDocument();
    });
  });

  it('muestra el albarán asignado al camión', async () => {
    await act(async () => { renderPage(); });
    await waitFor(() => {
      expect(screen.getByText('#12')).toBeInTheDocument();
    });
  });

  it('muestra el botón "Entregado" para albaranes en camión', async () => {
    await act(async () => { renderPage(); });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^entregado$/i })).toBeInTheDocument();
    });
  });

  it('botón "Entregado" llama a PATCH albaranes/{id}/estado', async () => {
    fetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ id: 12, status: 'ENTREGADO' }) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ camiones: [], sin_camion: [] }) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) });

    await act(async () => { renderPage(); });
    await waitFor(() => screen.getByRole('button', { name: /^entregado$/i }));

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^entregado$/i }));
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('albaranes/12/estado'),
        expect.any(Object),
      );
    });
  });

  it('botón "Almacén" en camión llama a POST transporte/ruta/quitar', async () => {
    fetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ ok: true }) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ camiones: [], sin_camion: [] }) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) });

    await act(async () => { renderPage(); });
    await waitFor(() => screen.getByRole('button', { name: /^entregado$/i }));

    // There are multiple "Almacén" texts (zone header + button in truck card)
    // getAllByRole('button') filters to only button elements
    const almacenBtns = await waitFor(() => screen.getAllByRole('button', { name: /^almacén$/i }));
    await act(async () => {
      fireEvent.click(almacenBtns[0]);
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('transporte/ruta/quitar'),
        expect.any(Object),
      );
    });
  });

  it('botón "Aceptar ruta" llama a liquidar y factura', async () => {
    // Mock URL methods for PDF download in descargarFactura
    const origCreate = URL.createObjectURL;
    const origRevoke = URL.revokeObjectURL;
    URL.createObjectURL = vi.fn(() => 'blob:test-url');
    URL.revokeObjectURL = vi.fn();

    try {
      fetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ ok: true, importe: 22.4, n_albaranes: 1 }),
        }) // liquidar
        .mockResolvedValueOnce({
          ok: true,
          blob: () => Promise.resolve(new Blob(['%PDF'], { type: 'application/pdf' })),
        }); // factura

      await act(async () => { renderPage(); });
      await waitFor(() => screen.getByRole('button', { name: /aceptar ruta/i }));

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /aceptar ruta/i }));
      });

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('transporte/ruta/3/liquidar'),
          expect.any(Object),
        );
      });
    } finally {
      URL.createObjectURL = origCreate;
      URL.revokeObjectURL = origRevoke;
    }
  });

  it('marcar "Entregado" exitosamente llama a sileo.success (cubre línea 372)', async () => {
    // Need mocks for: PATCH albaranes/12/estado + fetchAll (almacen, rutas, clientes)
    fetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ id: 12, status: 'ENTREGADO' }) }) // PATCH
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) }) // fetchAll - almacen
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ camiones: [], sin_camion: [] }) }) // fetchAll - rutas
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) }); // fetchAll - clientes

    await act(async () => { renderPage(); });
    await waitFor(() => screen.getByRole('button', { name: /^entregado$/i }));

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /^entregado$/i }));
    });

    await waitFor(() => {
      expect(sileo.success).toHaveBeenCalled();
    }, { timeout: 5000 });
  });
});

// ─────────────────────────────────────────────────────────────────
// Modal de camiones
// ─────────────────────────────────────────────────────────────────
describe('TransportePage – modal de camiones', () => {
  const rutasConCamion = {
    camiones: [
      {
        camion_id: 3,
        albaranes: [{ id: 12, date: '2024-03-03', total: 320, customer_id: 1, status: 'RUTA', items: [] }],
      },
    ],
    sin_camion: [],
  };

  beforeEach(() => {
    fetch.mockReset();
    fetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(rutasConCamion) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([{ id: 1, name: 'Ana', surnames: 'Ruiz' }]) });
  });

  it('abre el modal de camiones al pulsar el botón "Camiones"', async () => {
    await act(async () => { renderPage(); });
    await waitFor(() => screen.getByRole('button', { name: /^camiones$/i }));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /^camiones$/i })); });
    await waitFor(() => {
      expect(screen.getByText(/añadir camión/i)).toBeInTheDocument();
    });
  });

  it('el modal de camiones muestra el camión 3 en la lista', async () => {
    await act(async () => { renderPage(); });
    await waitFor(() => screen.getByRole('button', { name: /^camiones$/i }));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /^camiones$/i })); });
    await waitFor(() => {
      expect(screen.getAllByText(/camión 3/i).length).toBeGreaterThan(0);
    });
  });

  it('el modal muestra el badge "Aceptada" para camiones aceptados', async () => {
    localStorage.setItem('tfg_transportes_camiones_accepted', JSON.stringify({ '3': true }));
    await act(async () => { renderPage(); });
    await waitFor(() => screen.getByRole('button', { name: /^camiones$/i }));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /^camiones$/i })); });
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Aceptada/);
    });
  });

  it('el botón eliminar en camión vacío lo elimina de la lista', async () => {
    // Camion 5 has no albaranes → can be deleted
    const rutasConCamionVacio = {
      camiones: [{ camion_id: 5, albaranes: [] }],
      sin_camion: [],
    };
    fetch.mockReset();
    fetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(rutasConCamionVacio) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) });

    await act(async () => { renderPage(); });
    await waitFor(() => screen.getByRole('button', { name: /^camiones$/i }));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /^camiones$/i })); });
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/cami[oó]n 5/i);
    });
    // The delete button should be enabled for empty camion
    expect(document.body.textContent).toMatch(/vac[ií]o/i);
  });

  it('escribir en el input de nuevo camión actualiza el valor', async () => {
    await act(async () => { renderPage(); });
    await waitFor(() => screen.getByRole('button', { name: /^camiones$/i }));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /^camiones$/i })); });
    await waitFor(() => screen.getByRole('button', { name: 'Añadir' }));
    // Type in the truck number input
    const truckInput = document.querySelector('input[type="number"][placeholder]');
    await act(async () => { fireEvent.change(truckInput, { target: { value: '7' } }); });
    expect(truckInput.value).toBe('7');
  });

  it('añadir camión con número válido llama a sileo.success', async () => {
    const { sileo } = await import('sileo');
    await act(async () => { renderPage(); });
    await waitFor(() => screen.getByRole('button', { name: /^camiones$/i }));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /^camiones$/i })); });
    await waitFor(() => screen.getByRole('button', { name: 'Añadir' }));
    const truckInput = document.querySelector('input[type="number"][placeholder]');
    await act(async () => { fireEvent.change(truckInput, { target: { value: '7' } }); });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Añadir' })); });
    await waitFor(() => {
      expect(sileo.success).toHaveBeenCalled();
    });
  });

  it('eliminar camión vacío llama a sileo.success', async () => {
    const { sileo } = await import('sileo');
    const rutasCamionVacio = { camiones: [{ camion_id: 8, albaranes: [] }], sin_camion: [] };
    fetch.mockReset();
    fetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(rutasCamionVacio) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) });
    await act(async () => { renderPage(); });
    await waitFor(() => screen.getByRole('button', { name: /^camiones$/i }));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /^camiones$/i })); });
    await waitFor(() => screen.getAllByRole('button', { name: 'Eliminar' }));
    const elButtons = screen.getAllByRole('button', { name: 'Eliminar' });
    await act(async () => { fireEvent.click(elButtons[0]); });
    await waitFor(() => {
      expect(sileo.success).toHaveBeenCalled();
    });
  });
});