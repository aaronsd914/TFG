/**
 * Configuración global del frontend.
 * En producción, VITE_API_BASE_URL debe apuntar al backend (Railway).
 * En desarrollo local, cae al localhost por defecto.
 */
export const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

/** URL base de la API REST. Se usa en todos los componentes para hacer fetch. */
export const API_URL = `${BASE_URL}/api/`;
