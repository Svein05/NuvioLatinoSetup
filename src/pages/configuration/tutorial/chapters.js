// Starts follow the visible steps in the 60.408-second recording, not the narration draft.
export const TMDB_CHAPTERS = [
  { start: 0, title: 'Buscar TMDB' },
  { start: 7.5, title: 'Entrar a TMDB' },
  { start: 12.5, title: 'Crear tu cuenta' },
  { start: 19.5, title: 'Perfil y ajustes' },
  { start: 24.5, title: 'Solicitar una clave API' },
  { start: 31.5, title: 'Confirmar uso personal' },
  { start: 37.5, title: 'Datos de la aplicación' },
  { start: 43.5, title: 'Contacto y condiciones' },
  { start: 49.5, title: 'Acceder a tus credenciales' },
  { start: 55.5, title: 'Copiar la API Key' },
];

export function mediaTime(seconds) {
  const value = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`;
}
