/**
 * Cliente de Integración con el Backend Supabase de Nuvio (api.nuvio.tv)
 * Maneja Autenticación, Perfiles, Instalación de Addons e Inyección de Colecciones.
 */
export class NuvioClient {
  /**
   * Inicia sesión con credenciales de Nuvio (Supabase Auth)
   * @param {string} apiUrl URL base del backend de Nuvio (ej: https://api.nuvio.tv)
   * @param {string} apikey Clave anónima pública de Nuvio
   * @param {string} email Correo del usuario
   * @param {string} password Contraseña
   * @returns {Promise<{ accessToken: string, userId: string, user: object }>}
   */
  static async login({ apiUrl, apikey, email, password }) {
    const cleanUrl = apiUrl.replace(/\/+$/, '');
    const endpoint = `${cleanUrl}/auth/v1/token?grant_type=password`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'apikey': apikey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: email.trim(),
          password: password
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const message = errorData.error_description || errorData.msg || errorData.message || response.statusText;
        throw new Error(`Error de autenticación (${response.status}): ${message}`);
      }

      const data = await response.json();
      const accessToken = data.access_token;
      const userId = data.user?.id;

      if (!accessToken || !userId) {
        throw new Error('Respuesta de autenticación incompleta (falta token o userId).');
      }

      return {
        accessToken,
        userId,
        user: data.user
      };
    } catch (err) {
      console.error('[NuvioClient] Error de login:', err);
      throw new Error(`Fallo al autenticar con Nuvio: ${err.message}`);
    }
  }

  /**
   * Obtiene la lista de perfiles asociados a la cuenta del usuario
   * @param {string} apiUrl
   * @param {string} apikey
   * @param {string} accessToken
   * @param {string} userId
   * @returns {Promise<Array<object>>} Lista de perfiles
   */
  static async getProfiles({ apiUrl, apikey, accessToken, userId }) {
    const cleanUrl = apiUrl.replace(/\/+$/, '');
    const endpoint = `${cleanUrl}/rest/v1/profiles?user_id=eq.${encodeURIComponent(userId)}&select=*`;

    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'apikey': apikey,
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error consultando perfiles (${response.status}): ${errorText}`);
      }

      const profiles = await response.json();
      return Array.isArray(profiles) ? profiles : [];
    } catch (err) {
      console.error('[NuvioClient] Error obteniendo perfiles:', err);
      throw new Error(`Fallo al obtener perfiles de Nuvio: ${err.message}`);
    }
  }

  /**
   * Crea un nuevo perfil en la cuenta de Nuvio
   * @param {string} apiUrl
   * @param {string} apikey
   * @param {string} accessToken
   * @param {string} userId
   * @param {string} name Nombre del nuevo perfil
   * @param {string} [avatarUrl] URL del avatar opcional
   * @returns {Promise<object>} El perfil creado
   */
  static async createProfile({ apiUrl, apikey, accessToken, userId, name, avatarUrl }) {
    const cleanUrl = apiUrl.replace(/\/+$/, '');
    const endpoint = `${cleanUrl}/rest/v1/profiles`;
    const avatar = avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name.trim())}`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'apikey': apikey,
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          user_id: userId,
          name: name.trim(),
          avatar_url: avatar
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error creando perfil (${response.status}): ${errorText}`);
      }

      const created = await response.json();
      return Array.isArray(created) ? created[0] : created;
    } catch (err) {
      console.error('[NuvioClient] Error creando perfil:', err);
      throw new Error(`Fallo al crear perfil en Nuvio: ${err.message}`);
    }
  }

  /**
   * Registra el addon en el perfil seleccionado
   * @param {string} apiUrl
   * @param {string} apikey
   * @param {string} accessToken
   * @param {object} addonData Datos del addon ({ profile_id, addon_id, manifest_url, transport_url, name, enabled })
   * @returns {Promise<object>}
   */
  static async installAddon({ apiUrl, apikey, accessToken, addonData }) {
    const cleanUrl = apiUrl.replace(/\/+$/, '');
    const endpoint = `${cleanUrl}/rest/v1/addons`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'apikey': apikey,
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(addonData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error instalando addon (${response.status}): ${errorText}`);
      }

      const result = await response.json().catch(() => ({ success: true }));
      return result;
    } catch (err) {
      console.error('[NuvioClient] Error registrando addon:', err);
      throw new Error(`Fallo al instalar addon en Nuvio: ${err.message}`);
    }
  }

  /**
   * Inyecta colecciones nativas en el perfil de Nuvio
   * @param {string} apiUrl
   * @param {string} apikey
   * @param {string} accessToken
   * @param {Array<object>} collections Lista de colecciones
   * @returns {Promise<object>}
   */
  static async injectCollections({ apiUrl, apikey, accessToken, collections }) {
    const cleanUrl = apiUrl.replace(/\/+$/, '');
    const endpoint = `${cleanUrl}/rest/v1/collections`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'apikey': apikey,
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify(collections)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error inyectando colecciones (${response.status}): ${errorText}`);
      }

      const result = await response.json().catch(() => ({ success: true }));
      return result;
    } catch (err) {
      console.error('[NuvioClient] Error inyectando colecciones:', err);
      throw new Error(`Fallo al inyectar colecciones en Nuvio: ${err.message}`);
    }
  }
}
