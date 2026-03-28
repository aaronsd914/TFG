/**
 * i18n.test.js
 * Tests for src/i18n.js: initialization and loadLocale helper.
 */
import { describe, it, expect, afterAll } from 'vitest';
import i18n, { loadLocale } from '../../frontend/src/i18n.js';

describe('i18n — instancia configurada', () => {
  it('exporta una instancia de i18n definida', () => {
    expect(i18n).toBeDefined();
  });

  it('tiene una función t disponible', () => {
    expect(typeof i18n.t).toBe('function');
  });

  it('el idioma por defecto es español', () => {
    expect(i18n.language).toBe('es');
  });

  it('puede traducir una clave conocida', () => {
    const translation = i18n.t('transport.title');
    expect(translation).toBeTruthy();
    expect(translation).not.toBe('transport.title');
  });
});

describe('i18n — loadLocale', () => {
  afterAll(async () => {
    // Restore Spanish after all locale tests
    await loadLocale('es');
  });

  it('loadLocale es una función exportada', () => {
    expect(typeof loadLocale).toBe('function');
  });

  it('loadLocale cambia el idioma a inglés', async () => {
    await loadLocale('en');
    expect(i18n.language).toBe('en');
  });

  it('loadLocale cambia el idioma de vuelta a español', async () => {
    await loadLocale('es');
    expect(i18n.language).toBe('es');
  });

  it('loadLocale guarda el idioma en localStorage', async () => {
    await loadLocale('en');
    expect(localStorage.getItem('fg-lang')).toBe('en');
    await loadLocale('es');
  });

  it('loadLocale con "en" añade el bundle de inglés', async () => {
    await loadLocale('en');
    expect(i18n.hasResourceBundle('en', 'translation')).toBe(true);
    await loadLocale('es');
  });
});
