/**
 * Cliente de Integración con el Backend Supabase de Nuvio (api.nuvio.tv)
 * Maneja Autenticación, Procedimientos Almacenados (RPC), Addons y Colecciones.
 */
export class NuvioClient {
  /**
   * Ejecutor genérico de procedimientos almacenados RPC de Supabase
   */
  static async rpc({ apiUrl, apikey, accessToken, path, body = {} }) {
    const cleanUrl = apiUrl.replace(/\/+$/, '');
    const endpoint = `${cleanUrl}/rest/v1/rpc/${path.replace(/^\/+/, '')}`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'apikey': apikey,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`RPC ${path} falló (${response.status}): ${errorText}`);
    }

    if (response.status === 204) return null;
    return await response.json().catch(() => null);
  }

  /**
   * Crea una nueva cuenta en Nuvio (Supabase Auth SignUp)
   */
  static async signup({ apiUrl, apikey, email, password }) {
    const cleanUrl = apiUrl.replace(/\/+$/, '');
    const endpoint = `${cleanUrl}/auth/v1/signup`;

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
        const message = errorData.msg || errorData.error_description || errorData.message || response.statusText;
        if (/already registered|already exists|duplicate/i.test(message)) {
          throw new Error('Ya existe una cuenta con este correo en Nuvio. Por favor cambia a la opción "Iniciar Sesión".');
        }
        throw new Error(`Error al registrar cuenta (${response.status}): ${message}`);
      }

      const data = await response.json();

      // Si la respuesta incluye directamente la sesión con access_token
      if (data.access_token && data.user?.id) {
        return {
          accessToken: data.access_token,
          userId: data.user.id,
          user: data.user
        };
      }

      // Si la cuenta fue creada pero no retornó token de sesión inmediato, iniciar sesión automáticamente
      return await this.login({ apiUrl, apikey, email, password });
    } catch (err) {
      console.error('[NuvioClient] Error de signup:', err);
      throw err;
    }
  }

  /**
   * Inicia sesión con credenciales de Nuvio (Supabase Auth)
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
   * Obtiene la lista de perfiles asociados a la cuenta del usuario (intenta RPC sync_pull_profiles primero)
   */
  static async getProfiles({ apiUrl, apikey, accessToken, userId }) {
    // 1. Intentar procedimiento RPC oficial de Nuvio
    try {
      const data = await this.rpc({
        apiUrl,
        apikey,
        accessToken,
        path: 'sync_pull_profiles',
        body: {}
      });

      const list = Array.isArray(data) ? data : (data?.profiles || []);
      if (list.length > 0) {
        return list.map(p => {
          const profileIndex = p.profile_index ?? p.id ?? 1;
          const name = String(p.name || '').trim() || `Perfil ${profileIndex}`;
          return {
            id: profileIndex,
            profile_index: profileIndex,
            name: name,
            avatar_url: p.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name)}`
          };
        });
      }
    } catch (rpcErr) {
      console.warn('[NuvioClient] sync_pull_profiles no disponible, probando fallback REST:', rpcErr.message);
    }

    // 2. Fallback a consulta REST directa en tabla profiles
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
      return Array.isArray(profiles) ? profiles.map((p, idx) => ({
        id: p.profile_index ?? p.id ?? (idx + 1),
        profile_index: p.profile_index ?? (idx + 1),
        name: p.name || `Perfil ${idx + 1}`,
        avatar_url: p.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(p.name || idx)}`
      })) : [];
    } catch (err) {
      console.error('[NuvioClient] Error obteniendo perfiles:', err);
      throw new Error(`Fallo al obtener perfiles de Nuvio: ${err.message}`);
    }
  }

  /**
   * Crea un nuevo perfil en la cuenta de Nuvio (mediante RPC sync_push_profiles con fallback REST)
   */
  static async createProfile({ apiUrl, apikey, accessToken, userId, name, avatarUrl }) {
    const avatar = avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name.trim())}`;

    // 1. Intentar sincronización con RPC sync_push_profiles
    try {
      let existing = [];
      try {
        existing = await this.getProfiles({ apiUrl, apikey, accessToken, userId });
      } catch (_) {}

      const usedIndexes = new Set(existing.map(p => Number(p.profile_index || p.id)).filter(Number.isFinite));
      let newIndex = 1;
      while (usedIndexes.has(newIndex)) {
        newIndex++;
      }

      const newProfile = {
        profile_index: newIndex,
        name: name.trim(),
        avatar_color_hex: '#6366F1',
        uses_primary_addons: false,
        uses_primary_plugins: false,
        avatar_id: null,
        avatar_url: avatar
      };

      const allProfiles = [
        ...existing.map(p => ({
          profile_index: Number(p.profile_index || p.id),
          name: p.name,
          avatar_color_hex: '#6366F1',
          uses_primary_addons: false,
          uses_primary_plugins: false,
          avatar_url: p.avatar_url
        })),
        newProfile
      ];

      await this.rpc({
        apiUrl,
        apikey,
        accessToken,
        path: 'sync_push_profiles',
        body: { p_profiles: allProfiles }
      });

      return {
        id: newIndex,
        profile_index: newIndex,
        name: newProfile.name,
        avatar_url: newProfile.avatar_url
      };
    } catch (rpcErr) {
      console.warn('[NuvioClient] sync_push_profiles falló, probando fallback REST:', rpcErr.message);
    }

    // 2. Fallback a POST /rest/v1/profiles
    const cleanUrl = apiUrl.replace(/\/+$/, '');
    const endpoint = `${cleanUrl}/rest/v1/profiles`;

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
   * Resuelve el sync owner de la cuenta
   */
  static async getSyncOwner({ apiUrl, apikey, accessToken, userId }) {
    try {
      const data = await this.rpc({
        apiUrl,
        apikey,
        accessToken,
        path: 'get_sync_owner',
        body: {}
      });
      if (typeof data === 'string' && data.length > 5) return data;
      if (Array.isArray(data) && typeof data[0] === 'string') return data[0];
      if (data?.owner_id) return data.owner_id;
    } catch (_) {}
    return userId;
  }

  /**
   * Registra el addon en el perfil seleccionado
   */
  static async installAddon({ apiUrl, apikey, accessToken, userId, addonData }) {
    let ownerId = userId;
    try {
      ownerId = await this.getSyncOwner({ apiUrl, apikey, accessToken, userId });
    } catch (_) {}

    const cleanUrl = apiUrl.replace(/\/+$/, '');
    const endpoint = `${cleanUrl}/rest/v1/addons`;

    const payload = [{
      user_id: ownerId,
      profile_id: addonData.profile_id,
      url: addonData.manifest_url || addonData.url,
      name: addonData.name || 'AIOMetadata',
      enabled: true,
      sort_order: addonData.sort_order ?? 1
    }];

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'apikey': apikey,
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        // Intentar formato sin array por compatibilidad
        const singleResponse = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'apikey': apikey,
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify({
            user_id: ownerId,
            profile_id: addonData.profile_id,
            addon_id: addonData.addon_id || 'aio-metadata',
            manifest_url: addonData.manifest_url,
            transport_url: addonData.manifest_url,
            url: addonData.manifest_url,
            name: addonData.name || 'AIOMetadata',
            enabled: true
          })
        });

        if (!singleResponse.ok) {
          const errorText = await singleResponse.text();
          throw new Error(`Error instalando addon (${singleResponse.status}): ${errorText}`);
        }
      }

      return { success: true };
    } catch (err) {
      console.error('[NuvioClient] Error registrando addon:', err);
      throw new Error(`Fallo al instalar addon en Nuvio: ${err.message}`);
    }
  }

  /**
   * Inyecta colecciones nativas mediante el RPC oficial sync_push_collections que lee la app de Nuvio
   */
  static async pushCollections({ apiUrl, apikey, accessToken, profileId, collectionsJson }) {
    // 1. Invocar el procedimiento almacenado que usa la aplicación nativa de Nuvio
    try {
      await this.rpc({
        apiUrl,
        apikey,
        accessToken,
        path: 'sync_push_collections',
        body: {
          p_profile_id: Number(profileId) || profileId,
          p_collections_json: collectionsJson
        }
      });
      return { success: true, method: 'rpc' };
    } catch (rpcErr) {
      console.warn('[NuvioClient] sync_push_collections RPC falló, probando fallback REST:', rpcErr.message);

      // 2. Fallback a POST /rest/v1/collections
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
          body: JSON.stringify(collectionsJson)
        });

        if (!response.ok) {
          throw rpcErr;
        }

        return { success: true, method: 'rest_fallback' };
      } catch (_) {
        throw rpcErr;
      }
    }
  }
}
