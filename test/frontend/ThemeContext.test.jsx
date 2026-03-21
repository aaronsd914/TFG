/**
 * ThemeContext.test.jsx
 * Tests del contexto de tema (modo oscuro + paletas de color).
 * Verifica que ThemeProvider gestiona correctamente el estado, localStorage
 * y los efectos sobre document.documentElement.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { ThemeProvider, useTheme } from '../../frontend/src/context/ThemeContext.jsx';

function wrapper({ children }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

describe('ThemeContext — valores por defecto', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    document.documentElement.dataset.palette = '';
  });

  it('isDark empieza en false', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.isDark).toBe(false);
  });

  it('palette empieza en "warm"', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.palette).toBe('warm');
  });

  it('lee isDark desde localStorage', () => {
    localStorage.setItem('fg-theme', 'dark');
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.isDark).toBe(true);
  });

  it('lee palette desde localStorage', () => {
    localStorage.setItem('fg-palette', 'forest');
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.palette).toBe('forest');
  });
});

describe('ThemeContext — setIsDark', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  it('setIsDark(true) actualiza isDark', async () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    await act(async () => { result.current.setIsDark(true); });
    expect(result.current.isDark).toBe(true);
  });

  it('setIsDark(true) añade clase dark al documentElement', async () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    await act(async () => { result.current.setIsDark(true); });
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('setIsDark(false) elimina clase dark', async () => {
    localStorage.setItem('fg-theme', 'dark');
    const { result } = renderHook(() => useTheme(), { wrapper });
    await act(async () => { result.current.setIsDark(false); });
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('setIsDark persiste en localStorage', async () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    await act(async () => { result.current.setIsDark(true); });
    expect(localStorage.getItem('fg-theme')).toBe('dark');
  });
});

describe('ThemeContext — setPalette', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.dataset.palette = '';
  });

  it('setPalette actualiza palette', async () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    await act(async () => { result.current.setPalette('slate'); });
    expect(result.current.palette).toBe('slate');
  });

  it('setPalette actualiza dataset.palette en documentElement', async () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    await act(async () => { result.current.setPalette('forest'); });
    expect(document.documentElement.dataset.palette).toBe('forest');
  });

  it('setPalette persiste en localStorage', async () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    await act(async () => { result.current.setPalette('slate'); });
    expect(localStorage.getItem('fg-palette')).toBe('slate');
  });
});
