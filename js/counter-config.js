/**
 * Configuración dinámica inyectada para los endpoints del contador de setups.
 * En desarrollo local o forks sin secretos, se utilizan los endpoints públicos por defecto.
 * En producción (GitHub Pages), GitHub Actions puede sobreescribir este archivo con secrets.
 */
export const INJECTED_COUNTER_CONFIG = {};
