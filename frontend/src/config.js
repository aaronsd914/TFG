/**
 * Configuración global del frontend.
 * Cambia BASE_URL si el backend se despliega en otra dirección.
 */
export const BASE_URL = 'http://localhost:8000';

/** URL base de la API REST. Se usa en todos los componentes para hacer fetch. */
export const API_URL = `${BASE_URL}/api/`;
