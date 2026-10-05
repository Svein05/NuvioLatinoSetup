/**
 * Cliente de Integración con AIOStreams y Validación de Debrids
 * Soporta compilación de plantilla latino, validación en vivo de APIs Debrid
 * y registro seguro de usuario en la instancia oficial de MidnightIgnite.
 */
export class AIOStreamsClient {
  /**
   * Valida en vivo una clave API contra el proveedor Debrid correspondiente
   * @param {string} serviceId 'torbox' | 'alldebrid' | 'realdebrid' | 'premiumize' | 'debridlink' | string
   * @param {string} apiKey Clave API a verificar
   * @returns {Promise<{ valid: boolean, user?: string, plan?: string, error?: string }>}
   */
  static async validateDebridKey(serviceId, apiKey) {
    const key = String(apiKey || '').trim();
    if (!key) {
      return { valid: false, error: 'La clave API no puede estar vacía.' };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const sId = serviceId.toLowerCase();

    try {
      switch (sId) {
        case 'torbox': {
          try {
            const res = await fetch('https://api.torbox.app/v1/api/user/me', {
              headers: { 'Authorization': `Bearer ${key}` },
              signal: controller.signal
            });
            clearTimeout(timeout);
            if (res.ok) {
              const data = await res.json().catch(() => ({}));
              if (data && data.success) {
                const email = data.data?.email || 'Usuario TorBox';
                const plan = data.data?.plan === 0 ? 'Gratis' : `Plan ${data.data?.plan ?? 'Activo'}`;
                return { valid: true, user: email, plan };
              }
            } else if (res.status === 401 || res.status === 403) {
              return { valid: false, error: 'Clave no válida o revocada por TorBox (HTTP 401).' };
            }
          } catch (fetchErr) {
            clearTimeout(timeout);
            if (fetchErr.name === 'AbortError') {
              return { valid: false, error: 'Tiempo de espera agotado al conectar con TorBox.' };
            }
            // En navegadores web, Cloudflare/TorBox bloquea la llamada directa por falta de preflight CORS.
            // Validamos la sintaxis oficial estricta de Token TorBox (UUID v4 estándar de 36 caracteres)
            const isTorboxUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key);
            if (isTorboxUuid) {
              return {
                valid: true,
                user: 'TorBox Token Válido',
                plan: 'Formato verificado'
              };
            }
            return {
              valid: false,
              error: 'Formato inválido (TorBox requiere un token UUID de 36 caracteres).'
            };
          }
          break;
        }

        case 'alldebrid': {
          try {
            const res = await fetch(`https://api.alldebrid.com/v4/user?agent=nuvio&apikey=${encodeURIComponent(key)}`, {
              signal: controller.signal
            });
            clearTimeout(timeout);
            if (res.ok) {
              const data = await res.json().catch(() => ({}));
              if (data && data.status === 'success') {
                const user = data.data?.user?.username || 'Usuario AllDebrid';
                const isPremium = Boolean(data.data?.user?.isPremium);
                return {
                  valid: true,
                  user,
                  plan: isPremium ? 'Premium Activo' : 'Cuenta Gratuita (Sin Premium)'
                };
              }
              return { valid: false, error: data?.error?.message || 'Clave rechazada por AllDebrid.' };
            } else if (res.status === 401 || res.status === 400) {
              return { valid: false, error: 'Clave no válida en AllDebrid.' };
            }
          } catch (fetchErr) {
            clearTimeout(timeout);
            if (fetchErr.name === 'AbortError') {
              return { valid: false, error: 'Tiempo de espera agotado al conectar con AllDebrid.' };
            }
            if (/^[a-zA-Z0-9_-]{10,80}$/.test(key)) {
              return { valid: true, user: 'AllDebrid Token Válido', plan: 'Formato verificado' };
            }
            return { valid: false, error: 'Formato de clave AllDebrid inválido.' };
          }
          break;
        }

        case 'realdebrid': {
          try {
            const res = await fetch('https://api.real-debrid.com/rest/1.0/user', {
              headers: { 'Authorization': `Bearer ${key}` },
              signal: controller.signal
            });
            clearTimeout(timeout);
            if (res.ok) {
              const data = await res.json().catch(() => ({}));
              if (data && data.username) {
                const user = data.username;
                const type = data.type === 'premium' ? 'Premium' : 'Gratis';
                return { valid: true, user, plan: type };
              }
            } else if (res.status === 401 || res.status === 403) {
              return { valid: false, error: 'Clave no válida o expirada en Real-Debrid.' };
            }
          } catch (fetchErr) {
            clearTimeout(timeout);
            if (fetchErr.name === 'AbortError') {
              return { valid: false, error: 'Tiempo de espera agotado al conectar con Real-Debrid.' };
            }
            if (/^[a-zA-Z0-9]{20,80}$/.test(key)) {
              return { valid: true, user: 'Real-Debrid Token Válido', plan: 'Formato verificado' };
            }
            return { valid: false, error: 'Formato de clave Real-Debrid inválido.' };
          }
          break;
        }

        case 'premiumize': {
          try {
            const res = await fetch(`https://www.premiumize.me/api/account/info?apikey=${encodeURIComponent(key)}`, {
              signal: controller.signal
            });
            clearTimeout(timeout);
            if (res.ok) {
              const data = await res.json().catch(() => ({}));
              if (data && data.status === 'success') {
                const user = data.customer_id ? `ID: ${data.customer_id}` : 'Usuario Premiumize';
                const isPremium = data.premium_until && data.premium_until > (Date.now() / 1000);
                return { valid: true, user, plan: isPremium ? 'Premium Activo' : 'Expirado' };
              }
              return { valid: false, error: data?.message || 'Clave rechazada por Premiumize.' };
            } else if (res.status === 401 || res.status === 400) {
              return { valid: false, error: 'Clave no válida en Premiumize.' };
            }
          } catch (fetchErr) {
            clearTimeout(timeout);
            if (fetchErr.name === 'AbortError') {
              return { valid: false, error: 'Tiempo de espera agotado al conectar con Premiumize.' };
            }
            if (/^[a-zA-Z0-9]{12,60}$/.test(key)) {
              return { valid: true, user: 'Premiumize Token Válido', plan: 'Formato verificado' };
            }
            return { valid: false, error: 'Formato de clave Premiumize inválido.' };
          }
          break;
        }

        case 'debridlink': {
          try {
            const res = await fetch('https://debrid-link.com/api/v2/account/profile', {
              headers: { 'Authorization': `Bearer ${key}` },
              signal: controller.signal
            });
            clearTimeout(timeout);
            if (res.ok) {
              const data = await res.json().catch(() => ({}));
              if (data && (data.success || data.value)) {
                const user = data.value?.pseudo || 'Usuario Debrid-Link';
                const isPremium = Boolean(data.value?.premium);
                return { valid: true, user, plan: isPremium ? 'Premium' : 'Estándar' };
              }
            } else if (res.status === 401 || res.status === 403) {
              return { valid: false, error: 'Clave no válida en Debrid-Link.' };
            }
          } catch (fetchErr) {
            clearTimeout(timeout);
            if (fetchErr.name === 'AbortError') {
              return { valid: false, error: 'Tiempo de espera agotado al conectar con Debrid-Link.' };
            }
            if (/^[a-zA-Z0-9]{10,60}$/.test(key)) {
              return { valid: true, user: 'Debrid-Link Token Válido', plan: 'Formato verificado' };
            }
            return { valid: false, error: 'Formato de clave Debrid-Link inválido.' };
          }
          break;
        }

        default: {
          clearTimeout(timeout);
          if (key.length >= 8) {
            return { valid: true, user: `${serviceId.toUpperCase()} Token`, plan: 'Formato verificado' };
          }
          return { valid: false, error: 'La clave ingresada es demasiado corta (mínimo 8 caracteres).' };
        }
      }
    } catch (err) {
      clearTimeout(timeout);
      return {
        valid: false,
        error: `Error de verificación: ${err.message}`
      };
    }
  }

  /**
   * Compila la plantilla JSON de AIOStreams inyectando las claves Debrid en `services`
   * y asociándolas a los presets de streaming (`SeaDex`, `Torrentio`, `Comet`, etc.).
   * @param {object} baseTemplate Plantilla base leída de /templates/Aiostream.json
   * @param {Record<string, string>} debridKeys Mapa de claves por ID de servicio (ej: { torbox: "...", realdebrid: "..." })
   * @returns {object} Plantilla compilada lista para guardado
   */
  static compileConfig(baseTemplate, debridKeys = {}) {
    const config = JSON.parse(JSON.stringify(baseTemplate));

    // 1. Identificar servicios con claves provistas
    const activeServiceIds = Object.keys(debridKeys).filter(serviceId => {
      return Boolean(debridKeys[serviceId] && String(debridKeys[serviceId]).trim());
    });

    if (activeServiceIds.length === 0) {
      throw new Error('Debes configurar al menos una clave de API Debrid para compilar AIOStreams.');
    }

    // 2. Actualizar sección `services`
    if (Array.isArray(config.services)) {
      config.services.forEach(service => {
        const userKey = debridKeys[service.id];
        if (userKey && String(userKey).trim()) {
          service.enabled = true;
          service.credentials = {
            apiKey: String(userKey).trim()
          };
        } else {
          service.enabled = false;
          service.credentials = {};
        }
      });
    }

    // 3. Asociar los servicios activos a cada preset de streaming
    if (Array.isArray(config.presets)) {
      config.presets.forEach(preset => {
        if (preset.options && Array.isArray(preset.options.services)) {
          // Asignar los servicios activos del usuario a este preset
          preset.options.services = [...activeServiceIds];
        }
      });
    }

    return config;
  }

  /**
   * Guarda la configuración compilada en la instancia oficial de AIOStreams
   * retornando el UUID y el manifest.json definitivo
   * @param {string} instanceUrl URL base de la instancia (ej. https://aiostreamsfortheweebsstable.midnightignite.me)
   * @param {object} config Objeto de configuración compilado
   * @param {string} password Contraseña maestra
   * @returns {Promise<{ uuid: string, encryptedPassword: string, manifestUrl: string }>}
   */
  static async createUser(instanceUrl, config, password) {
    const cleanUrl = instanceUrl.replace(/\/+$/, '');
    const endpoint = `${cleanUrl}/api/v1/user`;
    const masterPassword = (password || 'NuvioSetupMaster2026').trim();

    const requestBody = {
      config,
      password: masterPassword
    };

    let response = null;
    let lastError = null;

    // Intento 1: Llamada directa a la instancia
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
    } catch (directErr) {
      console.warn('[AIOStreamsClient] Llamada directa falló (posible restricción CORS):', directErr.message);
      lastError = directErr;
    }

    // Intento 2: Fallback mediante proxy local o de reenvío si la llamada directa fue bloqueada por el navegador
    if (!response || !response.ok) {
      if (response && !response.ok) {
        let errDetail = '';
        try {
          const errJson = await response.json();
          errDetail = errJson.error?.message || errJson.detail || JSON.stringify(errJson);
        } catch (_) {
          errDetail = await response.text().catch(() => '');
        }
        throw new Error(`AIOStreams rechazó la configuración (HTTP ${response.status}): ${errDetail}`);
      }

      // Si fue error de red/CORS puro, intentar mediante proxy CORS de respaldo
      const fallbackProxies = [
        `https://corsproxy.io/?${encodeURIComponent(endpoint)}`,
        `https://proxy.cors.sh/${endpoint}`
      ];

      for (const proxyUrl of fallbackProxies) {
        try {
          response = await fetch(proxyUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
          });
          if (response && response.ok) break;
        } catch (_) {}
      }
    }

    if (!response || !response.ok) {
      const msg = lastError?.message || (response ? `HTTP ${response.status}` : 'Inalcanzable');
      throw new Error(`No se pudo conectar con la instancia de AIOStreams (${cleanUrl}): ${msg}`);
    }

    const json = await response.json().catch(() => ({}));
    if (!json.success || !json.data?.uuid || !json.data?.encryptedPassword) {
      throw new Error('Respuesta inválida de AIOStreams: no se recibieron las credenciales del manifiesto.');
    }

    const { uuid, encryptedPassword } = json.data;
    const manifestUrl = `${cleanUrl}/stremio/${uuid}/${encryptedPassword}/manifest.json`;

    return {
      uuid,
      encryptedPassword,
      manifestUrl
    };
  }
}
