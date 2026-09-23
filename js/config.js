/**
 * Configuración central y constantes para el Setup Wizard de Nuvio & AIOMetadata
 */
export const CONFIG = {
  // Backend de Nuvio (Supabase / PostgREST)
  NUVIO_API_URL: "https://api.nuvio.tv",
  NUVIO_PUBLIC_ANON_KEY: "sb_publishable_1Clq8rlTVACkdcZuqr6_AD__xUUC_EN",

  // Instancia de AIOMetadata predeterminada
  DEFAULT_AIOMETADATA_URL: "https://aiometadata.elfhosted.com",

  // URLs de plantillas locales
  TEMPLATES: {
    METADATA_LATINO: "./templates/MetadataLatino.json",
    NUVIO_COLLECTIONS: "./templates/NuvioCollections.json"
  },

  // Enlace y texto de la comunidad
  COMMUNITY: {
    DISCORD_URL: "https://discord.gg/EubYtJVJEc",
    DISCORD_LABEL: "Recomendación Addon LAT-ADD"
  },

  // Claves de almacenamiento local para sesión y preferencias
  STORAGE_KEYS: {
    SESSION: "nuvio_wizard_session_v1",
    PREFERENCES: "nuvio_wizard_prefs_v1"
  }
};
