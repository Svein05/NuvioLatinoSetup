/** Compile a detached AIOStreams template without mutating its other settings. */
export function compileStreamingConfig(baseTemplate, debridKeys = {}) {
  if (!baseTemplate || typeof baseTemplate !== 'object' || Array.isArray(baseTemplate)) {
    throw new Error('La plantilla de AIOStreams no es válida.');
  }
  const config = structuredClone(baseTemplate);
  const activeServiceIds = Object.keys(debridKeys).filter(id => Boolean(debridKeys[id] && String(debridKeys[id]).trim()));
  if (!activeServiceIds.length) {
    throw new Error('Debes configurar al menos una clave de API Debrid para compilar AIOStreams.');
  }
  if (Array.isArray(config.services)) {
    config.services.forEach(service => {
      const key = debridKeys[service.id];
      service.enabled = Boolean(key && String(key).trim());
      service.credentials = service.enabled ? { apiKey: String(key).trim() } : {};
    });
  }
  if (Array.isArray(config.presets)) {
    config.presets.forEach(preset => {
      if (preset.options && Array.isArray(preset.options.services)) preset.options.services = [...activeServiceIds];
    });
  }
  return config;
}
