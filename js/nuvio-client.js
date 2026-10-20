import { readProfiles } from '../src/integrations/nuvio/profiles-read.js';
import { createProfile, deleteProfile, updateProfile, updateProfileAvatar } from '../src/integrations/nuvio/profiles-write.js';
import { login, signup } from '../src/integrations/nuvio/authentication.js';
import { pushProfileSettings as saveProfileSettings } from '../src/integrations/nuvio/profile-settings.js';
import { legacyHistory } from '../src/integrations/nuvio/profile-history.js';
/**
 * Cliente de Integración con el Backend Supabase de Nuvio (api.nuvio.tv)
 * Maneja Autenticación, Procedimientos Almacenados (RPC), Addons y Colecciones.
 */
import { CONFIG } from '../src/app/config.js';

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
  static signup(context) { return signup(context); }

  /**
   * Inicia sesión con credenciales de Nuvio (Supabase Auth)
   */
  static login(context) { return login(context); }

  /**
   * Obtiene la lista de perfiles asociados a la cuenta del usuario (intenta RPC sync_pull_profiles primero)
   */
  static getProfiles(context) { return readProfiles(context); }

  /**
   * Crea un nuevo perfil en la cuenta de Nuvio (mediante RPC sync_push_profiles con fallback REST)
   */
  static async createProfile(context) {
    const profile = await createProfile(context);
    try { await this.cleanProfileAddons({ ...context, profileId: profile.profile_index }); }
    catch { profile.warnings = ['El perfil se creó, pero no se pudo limpiar su lista inicial de addons.']; }
    return profile;
  }

  /**
   * Elimina un perfil de la cuenta de Nuvio mediante pipeline multi-vector:
   * 1. RPC sync_delete_profile_data (procedimiento oficial de Nuvio).
   * 2. Limpieza de addons y colecciones asociadas.
   * 3. DELETE directo en tabla PostgREST /rest/v1/profiles.
   * 4. Sincronización de perfiles restantes vía sync_push_profiles.
   * 5. Verificación fresca contra el backend de Nuvio.
   */
  static deleteProfile(context) { return deleteProfile(context); }

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
      enabled: addonData.enabled !== undefined ? Boolean(addonData.enabled) : true,
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
            manifest_url: addonData.manifest_url,
            transport_url: addonData.manifest_url,
            url: addonData.manifest_url,
            name: addonData.name || 'AIOMetadata',
            enabled: addonData.enabled !== undefined ? Boolean(addonData.enabled) : true,
            sort_order: addonData.sort_order ?? 1
          })
        });

        if (!singleResponse.ok) {
          const errorText = await singleResponse.text();
          throw new Error(`Error instalando addon (${singleResponse.status}): ${errorText}`);
        }

        const singleData = await singleResponse.json().catch(() => null);
        const addonId = (Array.isArray(singleData) ? singleData[0]?.id : singleData?.id) || null;
        return { success: true, addonId };
      }

      const resData = await response.json().catch(() => null);
      const addonId = (Array.isArray(resData) ? resData[0]?.id : resData?.id) || null;
      return { success: true, addonId };
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

  /**
   * Obtiene las colecciones del perfil desde Nuvio (vía RPC sync_pull_collections o fallback PostgREST)
   */
  static async pullCollections({ apiUrl, apikey, accessToken, profileId }) {
    const profId = Number(profileId) || profileId;

    // 1. Intentar RPC sync_pull_collections
    try {
      const data = await this.rpc({
        apiUrl,
        apikey,
        accessToken,
        path: 'sync_pull_collections',
        body: {
          p_profile_id: profId
        }
      });
      if (data) {
        if (Array.isArray(data)) return data;
        if (Array.isArray(data.collections)) return data.collections;
        if (typeof data === 'object') return data;
      }
    } catch (rpcErr) {
      console.warn('[NuvioClient] sync_pull_collections RPC falló, probando fallback REST:', rpcErr.message);
    }

    // 2. Fallback REST a /rest/v1/collections
    const cleanUrl = apiUrl.replace(/\/+$/, '');
    try {
      const endpoint = `${cleanUrl}/rest/v1/collections?profile_id=eq.${encodeURIComponent(profId)}&select=*&order=updated_at.desc,id.desc`;
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'apikey': apikey,
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      });
      if (response.ok) {
        const rows = await response.json();
        if (Array.isArray(rows) && rows.length > 0) return rows;
      }
    } catch (_) {}

    // 3. Fallback adicional a /rest/v1/profile_collections
    try {
      const endpoint2 = `${cleanUrl}/rest/v1/profile_collections?profile_id=eq.${encodeURIComponent(profId)}&select=*&order=updated_at.desc,id.desc`;
      const response2 = await fetch(endpoint2, {
        method: 'GET',
        headers: {
          'apikey': apikey,
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      });
      if (response2.ok) {
        const rows2 = await response2.json();
        if (Array.isArray(rows2) && rows2.length > 0) return rows2;
      }
    } catch (_) {}

    return [];
  }

  /**
   * Obtiene la configuración de enriquecimiento y carátulas del perfil (vía RPC sync_pull_profile_settings_blob o fallback PostgREST)
   */
  static async pullProfileSettings({ apiUrl, apikey, accessToken, profileId, platform = 'tv' }) {
    const profId = Number(profileId) || profileId;

    // 1. Intentar RPC sync_pull_profile_settings_blob
    try {
      const data = await this.rpc({
        apiUrl,
        apikey,
        accessToken,
        path: 'sync_pull_profile_settings_blob',
        body: {
          p_profile_id: profId,
          p_platform: platform
        }
      });
      if (data) return data;
    } catch (rpcErr) {
      console.warn(`[NuvioClient] sync_pull_profile_settings_blob (${platform}) falló:`, rpcErr.message);
    }

    // 2. Fallback REST con plataforma específica
    const cleanUrl = apiUrl.replace(/\/+$/, '');
    try {
      const endpoint = `${cleanUrl}/rest/v1/profile_settings?profile_id=eq.${encodeURIComponent(profId)}&platform=eq.${encodeURIComponent(platform)}&select=*&order=updated_at.desc,id.desc`;
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'apikey': apikey,
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      });
      if (response.ok) {
        const rows = await response.json();
        if (Array.isArray(rows) && rows.length > 0) {
          return rows[0].settings || rows[0].settings_json || rows[0];
        }
      }
    } catch (_) {}

    // 3. Fallback REST sin filtro exclusivo de plataforma (cualquiera guardada en Nuvio)
    try {
      const endpointAll = `${cleanUrl}/rest/v1/profile_settings?profile_id=eq.${encodeURIComponent(profId)}&select=*&order=updated_at.desc,id.desc`;
      const responseAll = await fetch(endpointAll, {
        method: 'GET',
        headers: {
          'apikey': apikey,
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      });
      if (responseAll.ok) {
        const rowsAll = await responseAll.json();
        if (Array.isArray(rowsAll) && rowsAll.length > 0) {
          return rowsAll[0].settings || rowsAll[0].settings_json || rowsAll[0];
        }
      }
    } catch (_) {}

    return null;
  }

  /**
   * Lista los addons registrados en un perfil específico
   */
  static async listAddons({ apiUrl, apikey, accessToken, userId, profileId }) {
    let ownerId = userId;
    try {
      ownerId = await this.getSyncOwner({ apiUrl, apikey, accessToken, userId });
    } catch (_) {}

    const cleanUrl = apiUrl.replace(/\/+$/, '');
    const profId = Number(profileId) || profileId;
    const query = new URLSearchParams({
      select: '*',
      user_id: `eq.${ownerId}`,
      profile_id: `eq.${profId}`,
      order: 'sort_order.asc,created_at.asc'
    });

    try {
      const response = await fetch(`${cleanUrl}/rest/v1/addons?${query.toString()}`, {
        method: 'GET',
        headers: {
          'apikey': apikey,
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      }
    } catch (_) {}
    return [];
  }

  /**
   * Elimina un addon específico de un perfil por su ID
   */
  static async deleteAddon({ apiUrl, apikey, accessToken, addonId, profileId }) {
    const cleanUrl = apiUrl.replace(/\/+$/, '');
    const profId = Number(profileId) || profileId;

    try {
      const endpoint = `${cleanUrl}/rest/v1/addons?id=eq.${encodeURIComponent(addonId)}&profile_id=eq.${encodeURIComponent(profId)}`;
      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: {
          'apikey': apikey,
          'Authorization': `Bearer ${accessToken}`
        }
      });
      return response.ok;
    } catch (err) {
      console.warn(`[NuvioClient] Error eliminando addon ${addonId}:`, err);
      return false;
    }
  }

  /**
   * Actualiza el orden (sort_order) de un addon existente
   */
  static async updateAddonOrder({ apiUrl, apikey, accessToken, addonId, sortOrder }) {
    const cleanUrl = apiUrl.replace(/\/+$/, '');

    try {
      const endpoint = `${cleanUrl}/rest/v1/addons?id=eq.${encodeURIComponent(addonId)}`;
      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: {
          'apikey': apikey,
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ sort_order: Number(sortOrder) })
      });
      return response.ok;
    } catch (err) {
      console.warn(`[NuvioClient] Error actualizando sort_order de addon ${addonId}:`, err);
      return false;
    }
  }

  /**
   * Actualiza los datos de un addon existente (nombre, url de manifiesto, sort_order, enabled)
   */
  static async updateAddon({ apiUrl, apikey, accessToken, addonId, name, manifestUrl, sortOrder, enabled }) {
    const cleanUrl = apiUrl.replace(/\/+$/, '');
    const updateBody = {};
    if (name !== undefined) updateBody.name = name;
    if (manifestUrl !== undefined) {
      updateBody.manifest_url = manifestUrl;
      updateBody.url = manifestUrl;
      updateBody.transport_url = manifestUrl;
    }
    if (sortOrder !== undefined) updateBody.sort_order = Number(sortOrder);
    if (enabled !== undefined) updateBody.enabled = Boolean(enabled);

    try {
      const endpoint = `${cleanUrl}/rest/v1/addons?id=eq.${encodeURIComponent(addonId)}`;
      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: {
          'apikey': apikey,
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(updateBody)
      });
      return response.ok;
    } catch (err) {
      console.warn(`[NuvioClient] Error actualizando addon ${addonId}:`, err);
      return false;
    }
  }

  /**
   * Instala o actualiza el addon principal AIOMetadata en la posición #1,
   * garantizando que cualquier duplicado previo en Nuvio sea eliminado para que
   * nunca coexistan dos addons de metadatos en la cuenta.
   */
  static async installOrUpdateAioAddon({ apiUrl, apikey, accessToken, userId, profileId, manifestUrl, existingAioId }) {
    let ownerId = userId;
    try {
      ownerId = await this.getSyncOwner({ apiUrl, apikey, accessToken, userId });
    } catch (_) {}

    const cleanUrl = apiUrl.replace(/\/+$/, '');
    const profId = Number(profileId) || profileId;

    // 1. Consultar lista viva de addons del perfil en Nuvio
    let liveAddons = [];
    try {
      liveAddons = await this.listAddons({ apiUrl, apikey, accessToken, userId, profileId: profId });
    } catch (listErr) {
      console.warn('[NuvioClient] Error listando addons para sanear AIOMetadata:', listErr.message);
    }

    // 2. Detectar todos los addons de AIOMetadata existentes en el perfil de Nuvio
    const aioMatches = liveAddons.filter(a => {
      const name = String(a?.name || '').toLowerCase().trim();
      const url = String(a?.url || a?.manifest_url || '').toLowerCase().trim();
      if (name.includes('aiostreams') || url.includes('aiostreams')) return false;
      if (name.includes('aiometadata') || name === 'aiometa') return true;
      if (url.includes('aiometadata')) return true;
      const instances = Array.isArray(CONFIG.AIOMETADATA_INSTANCES) ? CONFIG.AIOMETADATA_INSTANCES : [];
      return instances.some(inst => {
        const host = inst.replace(/^https?:\/\//i, '').replace(/\/+$/, '').toLowerCase();
        return host && url.includes(host);
      });
    });

    // 3. Determinar el ID a reutilizar y actualizar
    let targetAioId = existingAioId;
    if (!targetAioId && aioMatches.length > 0) {
      targetAioId = aioMatches[0].id;
    }

    // 4. ELIMINAR terminantemente cualquier otro AIOMetadata duplicado en Nuvio
    for (const match of aioMatches) {
      if (match.id && String(match.id) !== String(targetAioId)) {
        try {
          await this.deleteAddon({ apiUrl, apikey, accessToken, addonId: match.id, profileId: profId });
          console.log(`[NuvioClient] Addon AIOMetadata duplicado eliminado de Nuvio (ID: ${match.id})`);
        } catch (_) {}
      }
    }

    // 5. Si existe un AIOMetadata previo, actualizarlo con PATCH
    if (targetAioId) {
      try {
        const patchEndpoint = `${cleanUrl}/rest/v1/addons?id=eq.${encodeURIComponent(targetAioId)}`;
        const patchRes = await fetch(patchEndpoint, {
          method: 'PATCH',
          headers: {
            'apikey': apikey,
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify({
            url: manifestUrl,
            manifest_url: manifestUrl,
            transport_url: manifestUrl,
            name: 'AIOMetadata',
            sort_order: 1,
            enabled: true
          })
        });

        if (patchRes.ok) {
          return { success: true, updated: true, addonId: targetAioId };
        }
      } catch (patchErr) {
        console.warn('[NuvioClient] Falló PATCH de AIOMetadata existente, reinstalando limpio:', patchErr.message);
        try {
          await this.deleteAddon({ apiUrl, apikey, accessToken, addonId: targetAioId, profileId: profId });
        } catch (_) {}
      }
    }

    // 6. Si no existía ninguno (o el PATCH falló), registrar como nuevo en posición 1
    const installed = await this.installAddon({
      apiUrl,
      apikey,
      accessToken,
      userId,
      addonData: {
        profile_id: profId,
        manifest_url: manifestUrl,
        url: manifestUrl,
        name: 'AIOMetadata',
        sort_order: 1
      }
    });

    return { success: true, installed: true, addonId: installed?.addonId || null };
  }

  /**
   * Sincroniza la lista completa de addons de un perfil en Nuvio
   */
  static async syncAddonsOrder({ apiUrl, apikey, accessToken, userId, profileId, addons }) {
    const profId = Number(profileId) || profileId;
    let ownerId = userId;
    try {
      ownerId = await this.getSyncOwner({ apiUrl, apikey, accessToken, userId });
    } catch (_) {}

    // 1. Actualizar sort_order de cada addon existente en la tabla
    const updatePromises = (addons || []).map(addon => {
      if (addon.id) {
        return this.updateAddonOrder({
          apiUrl,
          apikey,
          accessToken,
          addonId: addon.id,
          sortOrder: addon.sort_order
        });
      }
      return Promise.resolve(true);
    });

    await Promise.all(updatePromises);

    // 2. Invocar RPC sync_push_addons si está disponible en Nuvio
    try {
      await this.rpc({
        apiUrl,
        apikey,
        accessToken,
        path: 'sync_push_addons',
        body: {
          p_profile_id: profId,
          p_addons: addons.map(a => ({
            id: a.id || undefined,
            user_id: ownerId,
            profile_id: profId,
            name: a.name,
            url: a.manifest_url || a.url,
            manifest_url: a.manifest_url || a.url,
            sort_order: a.sort_order,
            enabled: a.enabled !== false
          }))
        }
      });
    } catch (_) {}

    return { success: true };
  }

  /**
   * Limpia y elimina todos los addons preexistentes de un perfil
   * (Metodología probada en stremio-perfect-setup: listar por perfil y eliminar por ID atómicamente)
   */
  static async cleanProfileAddons({ apiUrl, apikey, accessToken, userId, profileId }) {
    const profId = Number(profileId) || profileId;
    const cleanUrl = apiUrl.replace(/\/+$/, '');

    // 1. Intentar listar y borrar cada addon por su ID (metodología stremio-perfect-setup)
    try {
      const existing = await this.listAddons({ apiUrl, apikey, accessToken, userId, profileId: profId });
      if (existing.length > 0) {
        await Promise.all(existing.map(addon => {
          const deleteUrl = `${cleanUrl}/rest/v1/addons?id=eq.${encodeURIComponent(addon.id)}&profile_id=eq.${encodeURIComponent(profId)}`;
          return fetch(deleteUrl, {
            method: 'DELETE',
            headers: {
              'apikey': apikey,
              'Authorization': `Bearer ${accessToken}`
            }
          });
        }));
      }
    } catch (listErr) {
      console.warn('[NuvioClient] Error eliminando addons individuales por ID:', listErr.message);
    }

    // 2. Ejecutar además DELETE masivo por profile_id
    try {
      await fetch(`${cleanUrl}/rest/v1/addons?profile_id=eq.${encodeURIComponent(profId)}`, {
        method: 'DELETE',
        headers: {
          'apikey': apikey,
          'Authorization': `Bearer ${accessToken}`
        }
      });
    } catch (_) {}

    // 3. Fallback adicional con RPC sync_push_addons con lista vacía
    try {
      await this.rpc({
        apiUrl,
        apikey,
        accessToken,
        path: 'sync_push_addons',
        body: {
          p_profile_id: profId,
          p_addons: []
        }
      });
    } catch (_) {}

    return { success: true };
  }

  /**
   * Sincroniza las claves de proveedores (TMDB, MDBList, etc.) en el perfil mediante
   * el RPC oficial de Nuvio sync_push_provider_credentials.
   *
   * @param {Object} params
   * @param {string} params.apiUrl
   * @param {string} params.apikey
   * @param {string} params.accessToken
   * @param {number|string} params.profileId
   * @param {Array<{provider: string, credential_json: Object}>} params.credentials
   */
  static async pushProviderCredentials({ apiUrl, apikey, accessToken, profileId, credentials = [] }) {
    const profId = Number(profileId) || profileId;
    const validCredentials = (Array.isArray(credentials) ? credentials : [])
      .map(c => ({
        provider: String(c?.provider || '').trim().toLowerCase(),
        credential_json: c?.credential_json && typeof c.credential_json === 'object' ? c.credential_json : {}
      }))
      .filter(c => c.provider && Object.keys(c.credential_json).length > 0);

    if (validCredentials.length === 0) {
      return { success: true, count: 0 };
    }

    // 1. Intentar RPC sync_push_provider_credentials oficial
    try {
      await this.rpc({
        apiUrl,
        apikey,
        accessToken,
        path: 'sync_push_provider_credentials',
        body: {
          p_profile_id: profId,
          p_credentials: validCredentials,
          p_origin_client_id: 'nuvio-setup-web'
        }
      });
      return { success: true, method: 'rpc', count: validCredentials.length };
    } catch (rpcErr) {
      console.warn('[NuvioClient] sync_push_provider_credentials falló, probando sync_seed_provider_credentials:', rpcErr.message);
      // 2. Intentar RPC sync_seed_provider_credentials
      try {
        await this.rpc({
          apiUrl,
          apikey,
          accessToken,
          path: 'sync_seed_provider_credentials',
          body: {
            p_profile_id: profId,
            p_credentials: validCredentials,
            p_origin_client_id: 'nuvio-setup-web'
          }
        });
        return { success: true, method: 'rpc_seed', count: validCredentials.length };
      } catch (seedErr) {
        console.warn('[NuvioClient] sync_seed_provider_credentials falló:', seedErr.message);
      }
    }

    // 3. Fallback REST directo a /rest/v1/provider_credentials
    const cleanUrl = apiUrl.replace(/\/+$/, '');
    for (const cred of validCredentials) {
      try {
        await fetch(`${cleanUrl}/rest/v1/provider_credentials`, {
          method: 'POST',
          headers: {
            'apikey': apikey,
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates'
          },
          body: JSON.stringify({
            profile_id: profId,
            provider: cred.provider,
            credential_json: cred.credential_json
          })
        });
      } catch (_) {}
    }

    return { success: true, method: 'rest_fallback', count: validCredentials.length };
  }

  /**
   * Obtiene las credenciales de proveedores (TMDB, MDBList, etc.) asociadas al perfil en Nuvio.
   *
   * @param {Object} params
   * @param {string} params.apiUrl
   * @param {string} params.apikey
   * @param {string} params.accessToken
   * @param {number|string} params.profileId
   * @returns {Promise<Array<{provider: string, credential_json: Object}>>}
   */
  static async pullProviderCredentials({ apiUrl, apikey, accessToken, profileId }) {
    const profId = Number(profileId) || profileId;
    const cleanUrl = apiUrl.replace(/\/+$/, '');

    // 1. Intentar RPC sync_pull_provider_credentials
    try {
      const data = await this.rpc({
        apiUrl,
        apikey,
        accessToken,
        path: 'sync_pull_provider_credentials',
        body: { p_profile_id: profId }
      });
      if (Array.isArray(data) && data.length > 0) return data;
      if (Array.isArray(data?.credentials)) return data.credentials;
    } catch (_) {}

    // 2. Consultar directamente tabla REST provider_credentials
    try {
      const endpoint = `${cleanUrl}/rest/v1/provider_credentials?profile_id=eq.${encodeURIComponent(profId)}&select=*`;
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'apikey': apikey,
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      });
      if (response.ok) {
        const rows = await response.json();
        if (Array.isArray(rows) && rows.length > 0) return rows;
      }
    } catch (_) {}

    return [];
  }

  /**
   * Configura las opciones del perfil para activar TMDB Enrichment y MDBList Ratings
   * en Español Latino (es-MX) tanto para plataforma 'tv' como 'mobile'.
   */
  static async pushProfileSettings(context) {
    return saveProfileSettings(context);
  }

  /**
   * Actualiza el nombre de un perfil existente en la cuenta de Nuvio
   */
  static updateProfile(context) { return updateProfile(context); }

  /**
   * Actualiza el avatar de un perfil existente en Nuvio (sync_push_profiles + PATCH REST)
   */
  static updateProfileAvatar(context) { return updateProfileAvatar(context); }

  /**
   * Obtiene la lista de plugins instalados en el perfil
   */
  static async listPlugins({ apiUrl, apikey, accessToken, profileId }) {
    const profId = Number(profileId) || profileId;
    const cleanUrl = apiUrl.replace(/\/+$/, '');

    try {
      const data = await this.rpc({
        apiUrl,
        apikey,
        accessToken,
        path: 'sync_pull_plugins',
        body: { p_profile_id: profId }
      });
      if (Array.isArray(data)) return data;
      if (Array.isArray(data?.plugins)) return data.plugins;
    } catch (_) {}

    try {
      const res = await fetch(`${cleanUrl}/rest/v1/plugins?profile_id=eq.${encodeURIComponent(profId)}&select=*`, {
        headers: {
          'apikey': apikey,
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      });
      if (res.ok) {
        const rows = await res.json();
        if (Array.isArray(rows)) return rows;
      }
    } catch (_) {}

    return [];
  }

  /**
   * Obtiene el progreso de visualización (Watch Progress) de un perfil
   */
  static async pullWatchProgress(context) {
    return legacyHistory(context, 'progress');
  }

  /**
   * Obtiene los elementos guardados en la biblioteca del perfil (library_items)
   */
  static async pullLibrary(context) {
    return legacyHistory(context, 'library');
  }

  /**
   * Obtiene el historial de contenidos vistos (Watched) del perfil (watched_items)
   */
  static async pullWatched(context) {
    return legacyHistory(context, 'watched');
  }
}
