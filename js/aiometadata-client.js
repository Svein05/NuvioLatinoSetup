/**
 * Cliente de Integración con AIOMetadata
 * Gestiona el guardado de configuración y la obtención del manifest.
 */
export class AIOMetadataClient {
  /**
   * Guarda la configuración de catálogos y providers en la instancia de AIOMetadata
   * @param {string} instanceUrl URL base de la instancia (ej: https://aiometadata.elfhosted.com)
   * @param {object} payload Configuración completa (formato MetadataLatino con password)
   * @returns {Promise<{ uuid: string, manifestUrl: string, raw: object }>}
   */
  static async saveConfiguration(instanceUrl, payload) {
    const cleanUrl = instanceUrl.replace(/\/+$/, '');
    const endpoint = `${cleanUrl}/api/config/save`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AIOMetadata respondió con status ${response.status}: ${errorText || response.statusText}`);
      }

      const data = await response.json();
      
      // La API oficial responde con userUUID o uuid/id
      const uuid = data.userUUID || data.uuid || data.id || data.configId;
      if (!uuid) {
        throw new Error('La respuesta de AIOMetadata no contiene un UUID válido.');
      }

      // La API oficial también retorna directamente installUrl
      const manifestUrl = data.installUrl || `${cleanUrl}/stremio/${uuid}/manifest.json`;

      return {
        uuid,
        manifestUrl,
        raw: data
      };
    } catch (err) {
      console.error('[AIOMetadataClient] Error al guardar configuración:', err);
      throw new Error(`Fallo de conexión con AIOMetadata (${instanceUrl}): ${err.message}`);
    }
  }

  /**
   * Obtiene e inspecciona el manifest generado
   * @param {string} manifestUrl
   * @returns {Promise<object>} Objeto manifest de Stremio/Nuvio
   */
  static async fetchManifest(manifestUrl) {
    try {
      const response = await fetch(manifestUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`No se pudo leer el manifest (${response.status}): ${response.statusText}`);
      }

      const manifest = await response.json();
      return manifest;
    } catch (err) {
      console.error('[AIOMetadataClient] Error al obtener manifest:', err);
      throw new Error(`Fallo al leer el manifest desde ${manifestUrl}: ${err.message}`);
    }
  }
}
