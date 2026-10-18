/**
 * Cloudflare Worker: nuvio-proxy
 * 
 * Funcionalidades:
 * 1. Proxy CORS para AIOStreams, manifiestos y APIs de metadatos.
 * 2. Autenticación de colaboradores Modder y Admin (/api/verify-auth).
 * 3. Endpoint unificado de 1 solo commit en GitHub (/api/save-staged-changes)
 *    utilizando la API Git Data (Blobs, Trees, Commits, Refs).
 * 
 * Variables de Entorno requeridas en Cloudflare Dashboard (Settings > Variables):
 * - ADMIN_PASSWORD: Clave maestra de administrador.
 * - MODDER_PASSWORD: Clave de acceso para modders colaboradores.
 * - MODDER_ACCOUNTS: (Opcional) Array JSON o lista separada por comas de correos autorizados.
 * - GITHUB_TOKEN: Personal Access Token (PAT) de GitHub con permisos de escritura (repo o Contents).
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-admin-password',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const checkAuth = (pass, email = '') => {
      // 1. Validar Admin
      if (pass && pass === env.ADMIN_PASSWORD) return 'admin';

      // 2. Validar Modder
      if (pass && pass === env.MODDER_PASSWORD) {
        if (!email) return 'modder';
        const cleanEmail = email.trim().toLowerCase();

        let authorizedAccounts = ['holymolybaby00@gmail.com'];
        if (env.MODDER_ACCOUNTS) {
          try {
            const parsed = JSON.parse(env.MODDER_ACCOUNTS);
            if (Array.isArray(parsed)) authorizedAccounts = parsed.map(e => e.trim().toLowerCase());
          } catch (_) {
            authorizedAccounts = env.MODDER_ACCOUNTS.split(',').map(e => e.trim().toLowerCase());
          }
        }

        if (authorizedAccounts.includes(cleanEmail)) {
          return 'modder';
        }
      }
      return null;
    };

    // ========================================================
    // 1. ENDPOINT: VERIFICACIÓN SILENCIOSA (/api/verify-auth)
    // ========================================================
    if (url.pathname === '/api/verify-auth' && request.method === 'POST') {
      try {
        const { password, email } = await request.json();
        const role = checkAuth(password, email);
        if (!role) {
          return new Response(JSON.stringify({ error: 'Credenciales de Modder no válidas o correo no autorizado.' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        return new Response(JSON.stringify({ success: true, role }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // ========================================================
    // 2. ENDPOINT UNIFICADO: GUARDAR TODOS LOS CAMBIOS PENDIENTES
    //    EN 1 SOLO COMMIT ATÓMICO (POST /api/save-staged-changes)
    // ========================================================
    if (url.pathname === '/api/save-staged-changes' && request.method === 'POST') {
      try {
        const { password, email, skipCi = true, customCommitMessage = '', addedFiles = [], replacedFiles = [], renamedFiles = [], deletedFiles = [] } = await request.json();

        const role = checkAuth(password, email);
        if (!role) {
          return new Response(JSON.stringify({ error: 'No autorizado para publicar cambios en GitHub' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        if (!env.GITHUB_TOKEN) {
          return new Response(JSON.stringify({ error: 'GITHUB_TOKEN no está configurado en las variables del Worker.' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const owner = 'Svein05';
        const repo = 'NuvioLatinoSetup';
        const branch = 'main';
        const ghHeaders = {
          'Authorization': `Bearer ${env.GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'NuvioModderWorker/1.0'
        };

        // 1. Obtener el commit actual de main
        const refRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${branch}`, {
          headers: ghHeaders
        });
        if (!refRes.ok) {
          const errData = await refRes.text();
          throw new Error(`Error al obtener la referencia de la rama main en GitHub: ${errData.substring(0, 100)}`);
        }
        const refData = await refRes.json();
        const latestCommitSha = refData.object.sha;

        // 2. Obtener el Tree SHA base del commit actual
        const commitRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/commits/${latestCommitSha}`, {
          headers: ghHeaders
        });
        if (!commitRes.ok) throw new Error('Error al obtener el árbol base de Git.');
        const commitData = await commitRes.json();
        const baseTreeSha = commitData.tree.sha;

        // Validación de unicidad de rutas en el lote recibido
        const targetPaths = new Set();
        for (const f of addedFiles) {
          const lower = f.path.toLowerCase();
          if (targetPaths.has(lower)) {
            return new Response(JSON.stringify({ error: `Ruta duplicada detectada en el lote: ${f.path}` }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
          targetPaths.add(lower);
        }
        for (const rf of renamedFiles) {
          const lower = rf.newPath.toLowerCase();
          if (targetPaths.has(lower)) {
            return new Response(JSON.stringify({ error: `Conflicto de nombre: la ruta destino ya está asignada en el lote: ${rf.newPath}` }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
          targetPaths.add(lower);
        }

        const treeEntries = [];

        // 3. Crear Blobs para archivos añadidos y reemplazados
        const filesToBlob = [...addedFiles, ...replacedFiles];
        for (const f of filesToBlob) {
          const blobRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/blobs`, {
            method: 'POST',
            headers: { ...ghHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: f.base64,
              encoding: 'base64'
            })
          });
          if (!blobRes.ok) {
            const bErr = await blobRes.text();
            throw new Error(`Error al crear blob en Git para ${f.path}: ${bErr.substring(0, 100)}`);
          }
          const blobData = await blobRes.json();
          treeEntries.push({
            path: f.path,
            mode: '100644',
            type: 'blob',
            sha: blobData.sha
          });
        }

        // 4. Manejar archivos renombrados (con o sin reemplazo de imagen)
        for (const rf of renamedFiles) {
          let blobSha = null;
          if (rf.newBase64) {
            const bRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/blobs`, {
              method: 'POST',
              headers: { ...ghHeaders, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                content: rf.newBase64,
                encoding: 'base64'
              })
            });
            if (!bRes.ok) throw new Error(`Error al crear blob para renombrado ${rf.newPath}`);
            const bData = await bRes.json();
            blobSha = bData.sha;
          } else {
            // Obtener el sha del archivo original existente
            const oldFileRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${rf.oldPath}?ref=${branch}`, {
              headers: ghHeaders
            });
            if (oldFileRes.ok) {
              const oldData = await oldFileRes.json();
              blobSha = oldData.sha;
            }
          }

          if (blobSha) {
            treeEntries.push({
              path: rf.newPath,
              mode: '100644',
              type: 'blob',
              sha: blobSha
            });
            treeEntries.push({
              path: rf.oldPath,
              mode: '100644',
              type: 'blob',
              sha: null // sha null elimina el path antiguo en Git
            });
          }
        }

        // 5. Manejar archivos eliminados
        for (const delPath of deletedFiles) {
          treeEntries.push({
            path: delPath,
            mode: '100644',
            type: 'blob',
            sha: null
          });
        }

        if (treeEntries.length === 0) {
          return new Response(JSON.stringify({ error: 'No se detectaron operaciones válidas para registrar' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // 6. Crear el nuevo árbol Git consolidado
        const newTreeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees`, {
          method: 'POST',
          headers: { ...ghHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            base_tree: baseTreeSha,
            tree: treeEntries
          })
        });
        if (!newTreeRes.ok) {
          const treeErr = await newTreeRes.text();
          throw new Error(`Error al construir el nuevo árbol Git: ${treeErr.substring(0, 100)}`);
        }
        const newTreeData = await newTreeRes.json();

        // 7. Crear el commit atómico
        const totalOps = treeEntries.length;
        const baseMsg = customCommitMessage ? customCommitMessage.trim() : `feat(avatars): save modder changes (${totalOps} files staged)`;
        const ciSuffix = skipCi ? ' [skip ci]' : '';
        const commitMsg = `${baseMsg}${ciSuffix}`;
        const createCommitRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/commits`, {
          method: 'POST',
          headers: { ...ghHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: commitMsg,
            tree: newTreeData.sha,
            parents: [latestCommitSha]
          })
        });
        if (!createCommitRes.ok) {
          const comErr = await createCommitRes.text();
          throw new Error(`Error al generar el commit atómico en GitHub: ${comErr.substring(0, 100)}`);
        }
        const newCommitData = await createCommitRes.json();

        // 8. Actualizar la rama main al nuevo commit
        const updateRefRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${branch}`, {
          method: 'PATCH',
          headers: { ...ghHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sha: newCommitData.sha,
            force: false
          })
        });
        if (!updateRefRes.ok) {
          const refErr = await updateRefRes.text();
          throw new Error(`Error al actualizar la rama main en GitHub: ${refErr.substring(0, 100)}`);
        }

        return new Response(JSON.stringify({
          success: true,
          commit: `https://github.com/${owner}/${repo}/commit/${newCommitData.sha}`,
          count: totalOps
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // ========================================================
    // 3. PROXY CORS EXISTENTE (AIOSTREAMS & OTROS SERVICIOS)
    // ========================================================
    const targetUrl = request.url.replace(url.origin + '/', '');
    if (targetUrl.startsWith('http://') || targetUrl.startsWith('https://')) {
      try {
        const response = await fetch(targetUrl, {
          method: request.method,
          headers: request.headers,
          body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined
        });

        const newHeaders = new Headers(response.headers);
        newHeaders.set('Access-Control-Allow-Origin', '*');
        newHeaders.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        newHeaders.set('Access-Control-Allow-Headers', '*');

        return new Response(response.body, { status: response.status, headers: newHeaders });
      } catch (e) {
        return new Response(JSON.stringify({ error: `Proxy error: ${e.message}` }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    return new Response(JSON.stringify({ status: 'active', message: 'Nuvio Worker activo' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
};
