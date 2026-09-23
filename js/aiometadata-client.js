/**
 * Cliente de Integración con AIOMetadata
 * Gestiona el guardado de configuración y la obtención del manifest.
 */
export class AIOMetadataClient {
  /**
   * Guarda la configuración en una instancia específica de AIOMetadata
   * @param {string} instanceUrl URL base de la instancia
   * @param {object} payload Objeto con { password, config }
   * @returns {Promise<{ uuid: string, manifestUrl: string, instanceUrl: string, raw: object }>}
   */
  static async saveConfiguration(instanceUrl, payload) {
    const cleanUrl = instanceUrl.replace(/\/+$/, '');
    const endpoint = `${cleanUrl}/api/config/save`;

    // Normalizar body al formato oficial verificado: { password, config }
    const requestBody = {
      password: payload.password || 'NuvioSetupMaster2026',
      config: payload.config || payload
    };

    let response;
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
    } catch (fetchErr) {
      throw new Error(`Inalcanzable (${cleanUrl}): ${fetchErr.message || fetchErr}`);
    }

    if (!response.ok) {
      let detail = '';
      try {
        const errorJson = await response.json();
        detail = errorJson.error || errorJson.message || JSON.stringify(errorJson);
      } catch (_) {
        detail = await response.text().catch(() => '');
      }
      const safeDetail = String(detail || response.statusText || 'Error desconocido').slice(0, 300);
      throw new Error(`Rechazó la configuración (HTTP ${response.status}): ${safeDetail}`);
    }

    const data = await response.json().catch(() => ({}));
    const uuid = data.userUUID || data.uuid || data.id || data.configId;
    if (!uuid) {
      throw new Error(`Respuesta incompleta de ${cleanUrl}: no retornó un UUID válido.`);
    }

    const manifestUrl = data.installUrl || `${cleanUrl}/stremio/${uuid}/manifest.json`;

    return {
      uuid,
      manifestUrl,
      instanceUrl: cleanUrl,
      raw: data
    };
  }

  /**
   * Guarda la configuración intentando secuencialmente a través de un pool de instancias con fallback automático
   * (Metodología probada en stremio-perfect-setup)
   * @param {string[]} instanceList Lista ordenada de instancias de AIOMetadata
   * @param {object} payload Configuración a enviar
   * @param {Function} [onAttempt] Callback opcional para reportar intentos en vivo
   * @returns {Promise<{ uuid: string, manifestUrl: string, instanceUrl: string, warnings: string[], raw: object }>}
   */
  static async saveWithFallbacks(instanceList, payload, onAttempt = null) {
    const list = Array.isArray(instanceList) && instanceList.length > 0
      ? instanceList
      : ['https://aiometadatafortheweebs.midnightignite.me'];

    const warnings = [];

    for (let i = 0; i < list.length; i++) {
      const instance = list[i];
      if (typeof onAttempt === 'function') {
        onAttempt(instance, i + 1, list.length);
      }

      try {
        const result = await this.saveConfiguration(instance, payload);
        return {
          ...result,
          warnings
        };
      } catch (err) {
        const warningMsg = `Instancia ${instance} falló: ${err.message}`;
        console.warn(`[AIOMetadataClient] ${warningMsg}`);
        warnings.push(warningMsg);
      }
    }

    throw new Error(`Todas las instancias de AIOMetadata fallaron:\n${warnings.join('\n')}`);
  }

  /**
   * Obtiene e inspecciona el manifest generado con timeout de seguridad
   * @param {string} manifestUrl
   * @returns {Promise<object>} Objeto manifest de Stremio/Nuvio
   */
  static async fetchManifest(manifestUrl) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    try {
      const response = await fetch(manifestUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        },
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (err) {
      console.warn('[AIOMetadataClient] No se pudo leer manifest en vivo:', err.message);
      // Retornar fallback con valores estándar si falla la lectura del manifest
      return {
        id: 'aio-metadata',
        name: 'AIOMetadata Latino'
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
