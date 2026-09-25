// Determinar la ruta base relativa según el nivel de directorio actual
const getBasePath = () => {
  if (typeof window === 'undefined' || !window.location) return './';
  const p = window.location.pathname.toLowerCase();
  if (p.includes('/configuration') || p.includes('/documentation') || p.includes('/home')) {
    return '../';
  }
  return './';
};

export const CONFIG = {
  // Versión oficial de la aplicación (sincronizada con version.json y GitHub Releases)
  VERSION: "1.1.0",
  GITHUB_REPO: "Svein05/NuvioLatinoSetup",
  RELEASE_URL: "https://github.com/Svein05/NuvioLatinoSetup/releases",

  // Backend de Nuvio (Supabase / PostgREST)
  NUVIO_API_URL: "https://api.nuvio.tv",
  NUVIO_PUBLIC_ANON_KEY: "sb_publishable_1Clq8rlTVACkdcZuqr6_AD__xUUC_EN",

  // Pool de instancias de AIOMetadata con soporte para fallback automático
  AIOMETADATA_INSTANCES: [
    "https://aiometadatafortheweebs.midnightignite.me",
    "https://aiometadata.viren070.me",
    "https://aiometadata.fortheweak.cloud",
    "https://aiometadata.elfhosted.com"
  ],
  DEFAULT_AIOMETADATA_URL: "https://aiometadatafortheweebs.midnightignite.me",

  // URLs de plantillas locales (resolución dinámica de ruta según página)
  TEMPLATES: {
    get METADATA_LATINO() {
      return `${getBasePath()}templates/MetadataLatino.json`;
    },
    get NUVIO_COLLECTIONS() {
      return `${getBasePath()}templates/NuvioCollections.json`;
    }
  },

  // Enlace y texto de la comunidad
  COMMUNITY: {
    DISCORD_URL: "https://discord.gg/EubYtJVJEc",
    DISCORD_LABEL: "Recomendación Addon LAT-ADD",
    CREDITS_DONPUERCO: "https://nuvio.tv/community-collections/colecci-n-en-espa-ol-completa-creada-por-donpuercotroll"
  },

  // Claves de almacenamiento local para sesión y preferencias
  STORAGE_KEYS: {
    SESSION: "nuvio_wizard_session_v1",
    PREFERENCES: "nuvio_wizard_prefs_v1"
  }
};
