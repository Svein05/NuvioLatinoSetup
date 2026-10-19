import { login, signup } from '../src/integrations/nuvio/authentication.js';
import { pushProfileSettings as saveProfileSettings } from '../src/integrations/nuvio/profile-settings.js';
import { legacyHistory } from '../src/integrations/nuvio/profile-history.js';
/**
 * Cliente de Integración con el Backend Supabase de Nuvio (api.nuvio.tv)
 * Maneja Autenticación, Procedimientos Almacenados (RPC), Addons y Colecciones.
 */
import { CONFIG } from './config.js';

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
        return list.map((p, idx) => {
          const profileIndex = Number(p.profile_index ?? p.profile_id ?? p.id ?? (idx + 1));
          const name = String(p.name || '').trim() || `Perfil ${profileIndex}`;
          return {
            id: profileIndex,
            profile_index: profileIndex,
            profile_id: p.profile_id != null ? Number(p.profile_id) : profileIndex,
            uuid: (typeof p.id === 'string' && p.id.includes('-')) ? p.id : (p.uuid || null),
            name: name,
            avatar_url: p.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name)}`,
            avatar_color_hex: p.avatar_color_hex || '#6366F1',
            avatar_id: p.avatar_id ?? null,
            uses_primary_addons: Boolean(p.uses_primary_addons),
            uses_primary_plugins: Boolean(p.uses_primary_plugins)
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
      return Array.isArray(profiles) ? profiles.map((p, idx) => {
        const profileIndex = Number(p.profile_index ?? p.profile_id ?? (idx + 1));
        const name = String(p.name || '').trim() || `Perfil ${profileIndex}`;
        return {
          id: profileIndex,
          profile_index: profileIndex,
          profile_id: p.profile_id != null ? Number(p.profile_id) : profileIndex,
          uuid: (typeof p.id === 'string' && p.id.includes('-')) ? p.id : (p.uuid || null),
          name: name,
          avatar_url: p.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(p.name || idx)}`,
          avatar_color_hex: p.avatar_color_hex || '#6366F1',
          avatar_id: p.avatar_id ?? null,
          uses_primary_addons: Boolean(p.uses_primary_addons),
          uses_primary_plugins: Boolean(p.uses_primary_plugins)
        };
      }) : [];
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

      if (existing.length >= 6) {
        throw new Error('Has alcanzado el límite máximo de 6 perfiles en Nuvio. Selecciona uno existente.');
      }

      const usedIndexes = new Set(existing.map(p => Number(p.profile_index || p.id)).filter(Number.isFinite));
      let newIndex = 1;
      while (usedIndexes.has(newIndex) && newIndex <= 6) {
        newIndex++;
      }

      if (newIndex > 6) {
        throw new Error('Todos los espacios de perfil (1 al 6) están ocupados en tu cuenta de Nuvio.');
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
        body: {
          p_profiles: allProfiles,
          p_client_max_profiles: 6,
          p_origin_client_id: 'nuvio-setup-web'
        }
      });

      // Limpiar addons por defecto (nuvio catalog addon y opensubtitles) para que el perfil inicie limpio
      try {
        await this.cleanProfileAddons({ apiUrl, apikey, accessToken, userId, profileId: newIndex });
      } catch (_) {}

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
      const createdProfile = Array.isArray(created) ? created[0] : created;

      // Limpiar addons por defecto también en el fallback
      try {
        const profId = createdProfile.profile_index ?? createdProfile.id;
        await this.cleanProfileAddons({ apiUrl, apikey, accessToken, userId, profileId: profId });
      } catch (_) {}

      return createdProfile;
    } catch (err) {
      console.error('[NuvioClient] Error creando perfil:', err);
      throw new Error(`Fallo al crear perfil en Nuvio: ${err.message}`);
    }
  }

  /**
   * Elimina un perfil de la cuenta de Nuvio mediante pipeline multi-vector:
   * 1. RPC sync_delete_profile_data (procedimiento oficial de Nuvio).
   * 2. Limpieza de addons y colecciones asociadas.
   * 3. DELETE directo en tabla PostgREST /rest/v1/profiles.
   * 4. Sincronización de perfiles restantes vía sync_push_profiles.
   * 5. Verificación fresca contra el backend de Nuvio.
   */
  static async deleteProfile({ apiUrl, apikey, accessToken, userId, profileId }) {
    const targetId = Number(profileId);
    const cleanUrl = apiUrl.replace(/\/+$/, '');

    // 1. Obtener lista actual de perfiles para identificar UUID y restantes
    let existing = [];
    try {
      existing = await this.getProfiles({ apiUrl, apikey, accessToken, userId });
    } catch (fetchErr) {
      console.warn('[NuvioClient] Error obteniendo perfiles previos a eliminación:', fetchErr);
    }

    const targetProfile = existing.find(p => Number(p.profile_index ?? p.id) === targetId);
    const targetUuid = targetProfile?.uuid || null;

    const remainingProfiles = existing
      .filter(p => Number(p.profile_index ?? p.id) !== targetId)
      .map(p => ({
        profile_index: Number(p.profile_index ?? p.id),
        name: p.name,
        avatar_color_hex: p.avatar_color_hex || '#6366F1',
        uses_primary_addons: Boolean(p.uses_primary_addons),
        uses_primary_plugins: Boolean(p.uses_primary_plugins),
        avatar_id: p.avatar_id ?? null,
        avatar_url: p.avatar_url
      }));

    // Resolver sync_owner de la cuenta
    let ownerId = userId;
    try {
      ownerId = await this.getSyncOwner({ apiUrl, apikey, accessToken, userId });
    } catch (_) {}

    // Vector 1: RPC oficial sync_delete_profile_data de Nuvio
    try {
      await this.rpc({
        apiUrl,
        apikey,
        accessToken,
        path: 'sync_delete_profile_data',
        body: {
          p_profile_id: targetId,
          p_origin_client_id: 'nuvio-setup-web'
        }
      });
      console.log(`[NuvioClient] sync_delete_profile_data ejecutado exitosamente para perfil ${targetId}`);
    } catch (rpcDelErr) {
      console.warn('[NuvioClient] sync_delete_profile_data no disponible o falló:', rpcDelErr.message);
    }

    // Vector 2: Limpieza de addons huérfanos del perfil
    try {
      await this.cleanProfileAddons({ apiUrl, apikey, accessToken, userId, profileId: targetId });
    } catch (addonErr) {
      console.warn('[NuvioClient] cleanProfileAddons durante eliminación falló:', addonErr.message);
    }

    // Vector 3: Limpieza de colecciones asociadas al perfil en /rest/v1/collections
    try {
      const colFilters = [
        `profile_id=eq.${encodeURIComponent(targetId)}`,
        `user_id=eq.${encodeURIComponent(ownerId)}&profile_id=eq.${encodeURIComponent(targetId)}`
      ];
      for (const filter of colFilters) {
        await fetch(`${cleanUrl}/rest/v1/collections?${filter}`, {
          method: 'DELETE',
          headers: {
            'apikey': apikey,
            'Authorization': `Bearer ${accessToken}`
          }
        }).catch(() => {});
      }
    } catch (_) {}

    // Vector 4: Eliminación directa en la tabla PostgREST /rest/v1/profiles
    const restDeleteAttempts = [];
    if (targetUuid) {
      restDeleteAttempts.push(`id=eq.${encodeURIComponent(targetUuid)}`);
    }
    restDeleteAttempts.push(`profile_index=eq.${encodeURIComponent(targetId)}`);
    restDeleteAttempts.push(`profile_id=eq.${encodeURIComponent(targetId)}`);
    if (ownerId) {
      restDeleteAttempts.push(`user_id=eq.${encodeURIComponent(ownerId)}&profile_index=eq.${encodeURIComponent(targetId)}`);
      restDeleteAttempts.push(`user_id=eq.${encodeURIComponent(ownerId)}&profile_id=eq.${encodeURIComponent(targetId)}`);
    }
    if (userId && userId !== ownerId) {
      restDeleteAttempts.push(`user_id=eq.${encodeURIComponent(userId)}&profile_index=eq.${encodeURIComponent(targetId)}`);
      restDeleteAttempts.push(`user_id=eq.${encodeURIComponent(userId)}&profile_id=eq.${encodeURIComponent(targetId)}`);
    }

    for (const filter of restDeleteAttempts) {
      try {
        await fetch(`${cleanUrl}/rest/v1/profiles?${filter}`, {
          method: 'DELETE',
          headers: {
            'apikey': apikey,
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json',
            'Prefer': 'return=representation'
          }
        });
      } catch (delErr) {
        console.warn(`[NuvioClient] DELETE /rest/v1/profiles?${filter} falló:`, delErr.message);
      }
    }

    // Vector 5: Sincronización oficial del array restante mediante sync_push_profiles
    try {
      await this.rpc({
        apiUrl,
        apikey,
        accessToken,
        path: 'sync_push_profiles',
        body: {
          p_profiles: remainingProfiles,
          p_client_max_profiles: 6,
          p_origin_client_id: 'nuvio-setup-web'
        }
      });
    } catch (pushErr) {
      console.warn('[NuvioClient] sync_push_profiles falló tras eliminar perfil:', pushErr.message);
    }

    // Vector 6: Verificación fresca en el backend de Nuvio
    let freshProfiles = remainingProfiles;
    try {
      freshProfiles = await this.getProfiles({ apiUrl, apikey, accessToken, userId });
      const stillPresent = freshProfiles.some(p => Number(p.profile_index ?? p.id) === targetId);
      if (stillPresent) {
        throw new Error(`El perfil ${targetId} aún figura en Nuvio tras la eliminación. Verifica que no sea el perfil principal o único de la cuenta.`);
      }
    } catch (verifyErr) {
      if (verifyErr.message?.includes('aún figura en Nuvio')) {
        throw verifyErr;
      }
      console.warn('[NuvioClient] No se pudo verificar perfiles post-eliminación:', verifyErr.message);
    }

    return {
      success: true,
      remainingProfiles: freshProfiles
    };
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
  static async updateProfile({ apiUrl, apikey, accessToken, userId, profileId, name }) {
    const profId = Number(profileId) || profileId;
    const cleanUrl = apiUrl.replace(/\/+$/, '');
    const cleanName = String(name || '').trim();

    if (!cleanName) {
      throw new Error('El nombre del perfil no puede estar vacío.');
    }

    // 1. Obtener lista viva de perfiles
    let existing = [];
    try {
      existing = await this.getProfiles({ apiUrl, apikey, accessToken, userId });
    } catch (_) {}

    const target = existing.find(p => Number(p.profile_index ?? p.id) === Number(profId));
    const targetUuid = target?.uuid || null;

    // Actualizar nombre en la lista para sync_push_profiles
    const updatedList = existing.map(p => {
      if (Number(p.profile_index ?? p.id) === Number(profId)) {
        return {
          profile_index: Number(p.profile_index ?? p.id),
          name: cleanName,
          avatar_color_hex: p.avatar_color_hex || '#6366F1',
          uses_primary_addons: Boolean(p.uses_primary_addons),
          uses_primary_plugins: Boolean(p.uses_primary_plugins),
          avatar_id: p.avatar_id ?? null,
          avatar_url: p.avatar_url
        };
      }
      return {
        profile_index: Number(p.profile_index ?? p.id),
        name: p.name,
        avatar_color_hex: p.avatar_color_hex || '#6366F1',
        uses_primary_addons: Boolean(p.uses_primary_addons),
        uses_primary_plugins: Boolean(p.uses_primary_plugins),
        avatar_id: p.avatar_id ?? null,
        avatar_url: p.avatar_url
      };
    });

    // Vector 1: RPC sync_push_profiles
    try {
      await this.rpc({
        apiUrl,
        apikey,
        accessToken,
        path: 'sync_push_profiles',
        body: {
          p_profiles: updatedList,
          p_client_max_profiles: 6,
          p_origin_client_id: 'nuvio-setup-web'
        }
      });
    } catch (rpcErr) {
      console.warn('[NuvioClient] sync_push_profiles al actualizar perfil falló:', rpcErr.message);
    }

    // Vector 2: PATCH en /rest/v1/profiles
    const patchFilters = [];
    if (targetUuid) patchFilters.push(`id=eq.${encodeURIComponent(targetUuid)}`);
    patchFilters.push(`profile_index=eq.${encodeURIComponent(profId)}`);
    patchFilters.push(`profile_id=eq.${encodeURIComponent(profId)}`);

    for (const filter of patchFilters) {
      try {
        await fetch(`${cleanUrl}/rest/v1/profiles?${filter}`, {
          method: 'PATCH',
          headers: {
            'apikey': apikey,
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify({ name: cleanName })
        });
      } catch (_) {}
    }

    return { success: true, name: cleanName };
  }

  /**
   * Actualiza el avatar de un perfil existente en Nuvio (sync_push_profiles + PATCH REST)
   */
  static async updateProfileAvatar({ apiUrl, apikey, accessToken, userId, profileId, avatarUrl }) {
    const profId = Number(profileId) || profileId;
    const cleanUrl = apiUrl.replace(/\/+$/, '');
    const cleanAvatar = String(avatarUrl || '').trim();

    if (!cleanAvatar) {
      throw new Error('La URL del avatar no puede estar vacía.');
    }

    // 1. Obtener lista viva de perfiles
    let existing = [];
    try {
      existing = await this.getProfiles({ apiUrl, apikey, accessToken, userId });
    } catch (_) {}

    const target = existing.find(p => Number(p.profile_index ?? p.id) === Number(profId));
    const targetUuid = target?.uuid || null;

    // Actualizar avatar en la lista para sync_push_profiles
    const updatedList = existing.map(p => {
      const isTarget = Number(p.profile_index ?? p.id) === Number(profId);
      return {
        profile_index: Number(p.profile_index ?? p.id),
        name: p.name,
        avatar_color_hex: p.avatar_color_hex || '#6366F1',
        uses_primary_addons: Boolean(p.uses_primary_addons),
        uses_primary_plugins: Boolean(p.uses_primary_plugins),
        avatar_id: p.avatar_id ?? null,
        avatar_url: isTarget ? cleanAvatar : p.avatar_url
      };
    });

    // Vector 1: RPC sync_push_profiles
    let rpcSuccess = false;
    let rpcErrorMsg = null;
    try {
      await this.rpc({
        apiUrl,
        apikey,
        accessToken,
        path: 'sync_push_profiles',
        body: {
          p_profiles: updatedList,
          p_client_max_profiles: 6,
          p_origin_client_id: 'nuvio-setup-web'
        }
      });
      rpcSuccess = true;
    } catch (rpcErr) {
      rpcErrorMsg = rpcErr.message;
      console.warn('[NuvioClient] sync_push_profiles al actualizar avatar falló:', rpcErr.message);
    }

    // Vector 2: PATCH en /rest/v1/profiles
    const patchFilters = [];
    if (targetUuid) patchFilters.push(`id=eq.${encodeURIComponent(targetUuid)}`);
    patchFilters.push(`profile_index=eq.${encodeURIComponent(profId)}`);
    patchFilters.push(`profile_id=eq.${encodeURIComponent(profId)}`);

    let patchSuccess = false;
    let patchErrorMsg = null;
    for (const filter of patchFilters) {
      try {
        const patchRes = await fetch(`${cleanUrl}/rest/v1/profiles?${filter}`, {
          method: 'PATCH',
          headers: {
            'apikey': apikey,
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify({ avatar_url: cleanAvatar })
        });
        if (patchRes.ok) {
          patchSuccess = true;
        } else {
          const errBody = await patchRes.text().catch(() => '');
          patchErrorMsg = `HTTP ${patchRes.status}: ${errBody}`;
        }
      } catch (patchErr) {
        patchErrorMsg = patchErr.message;
      }
    }

    if (!rpcSuccess && !patchSuccess) {
      throw new Error(`No se pudo actualizar el avatar en Nuvio: ${patchErrorMsg || rpcErrorMsg || 'Error de sincronización'}`);
    }

    return { success: true, avatar_url: cleanAvatar };
  }

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
