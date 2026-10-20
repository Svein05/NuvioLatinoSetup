# Worker

Fuentes versionadas del backend, separadas del build público de GitHub Pages.
La refactorización no despliega este código ni cambia el Worker actualmente activo.

## Contratos

- `POST /api/verify-auth`: `{ password, email }` → `{ success, role }`.
- `POST /api/save-staged-changes`: mismo contrato de lotes del publicador existente;
  devuelve `{ success, commit, count }` tras confirmar una actualización de referencia.
- `/https://host/ruta`: proxy de compatibilidad limitado a hosts HTTPS permitidos.
- `GET /api/avatars/ranking?limit=8`: `{ items: [{ key, score }] }`, límite 1–32.
- `POST /api/avatars/usage`: `{ key }` y sesión Nuvio en `Authorization: Bearer`;
  devuelve `{ status: "recorded" | "duplicate", score }`. Solo se solicita tras
  confirmar un guardado de avatar o creación de perfil.
- `POST /api/avatars/suggestions`: formulario multipart con `requestId` UUID,
  `mode`, `characterName`, `seriesName` y `file` o `url`, más sesión Nuvio en
  `Authorization: Bearer`. Devuelve `{ status: "sent" }` únicamente tras confirmar
  el mensaje de Discord o reconocer un envío ya confirmado con ese identificador.

Los lotes admiten hasta 100 operaciones y un cuerpo de 25 MiB. Las imágenes nuevas
deben ser WebP, PNG o JPEG, hasta 6 MiB decodificados, con cabecera coherente con la
extensión. El editor actual convierte las subidas a WebP. Los SVG existentes pueden
renombrarse o eliminarse, pero no se admiten nuevas subidas SVG sin sanitización.
No se publican lotes parciales por renombrados que no pudieron leerse.

## Configuración privada

Usar el panel de Cloudflare o su herramienta oficial para configurar secretos:
`ADMIN_PASSWORD`, `MODDER_PASSWORD` y `GITHUB_TOKEN`. No guardarlos en este archivo,
`wrangler.jsonc`, JavaScript del navegador ni el repositorio.

El ranking opcional requiere `AVATAR_REDIS_URL` (URL HTTPS del servicio Upstash),
`AVATAR_REDIS_TOKEN` (secreto privado con permisos de lectura, escritura y EVAL)
y `NUVIO_PUBLIC_ANON_KEY` (clave pública de Nuvio para verificar sesiones).
No se leen tokens Redis de localStorage ni archivos del frontend. El conjunto
ordenado conserva el nombre `avatar_ranks`, por lo que puede utilizar la base existente.
La sesión se verifica contra `https://api.nuvio.tv/auth/v1/user`; no se acepta un
ID autodeclarado ni una cuenta anónima.

Un script Lua agrupa deduplicación e incremento en una operación: un voto por
cuenta/avatar cada 24 horas, máximo 100 votos por cuenta y día UTC. Las claves
de deduplicación usan hashes; no contienen el token ni el ID de cuenta en claro.
Estas reglas requieren probarse con Redis real antes de desplegar: los tests
actuales verifican el contrato HTTP y EVAL con respuestas simuladas.
Contratos de referencia: [sesiones Supabase](https://supabase.com/docs/guides/auth/jwts),
[REST de Upstash](https://upstash.com/docs/redis/features/restapi) y
[EVAL](https://upstash.com/docs/redis/sdks/ts/commands/scripts/eval).

Las rutas y estos secretos todavía no se han desplegado. Con el Worker anterior
o sin configurar Redis, el navegador conserva caché y los ocho avatares de respaldo;
no simula un ranking remoto ni un voto confirmado. Si se configuraron tokens Redis
en el navegador con versiones anteriores, retirarlos de allí y rotarlos al habilitar
la integración privada. No copiar esos valores al repositorio ni al build público.

Las sugerencias requieren además `AVATAR_SUGGESTION_WEBHOOK_URL`, configurado como
secreto del Worker. Debe ser una URL de webhook de `https://discord.com/api/webhooks/…`
sin parámetros. El navegador no recibe esa URL ni construye payloads de Discord.
Se conservan PNG, WebP, JPEG y GIF de hasta 8 MiB, con comprobación de cabecera,
y enlaces HTTPS de hasta 2048 caracteres. Personaje y obra admiten 100 caracteres.
El cuerpo multipart se limita a 8 MiB más 16 KiB de cabeceras/campos.

La reserva Redis aplica una espera de 120 segundos por cuenta y recuerda el estado
del identificador durante 24 horas. Un envío pendiente/desconocido no se repite;
un rechazo definitivo permite reintento explícito con el mismo identificador.
Discord se invoca una sola vez con `wait=true`; se exige un ID de mensaje antes
de confirmar. Las menciones están desactivadas. No se descargan URLs de imágenes
desde el Worker; se incorporan al embed. Referencia:
[Execute Webhook](https://docs.discord.com/developers/resources/webhook#execute-webhook).

El envío privado de sugerencias tampoco está desplegado. Faltan pruebas reales
con Discord, Redis y Cloudflare y la autorización de despliegue. Los tests no
envían mensajes reales. La configuración antigua del webhook en localStorage o
archivos `.local.js` ya no se utiliza ni debe volver a publicarse en el frontend.

`MODDER_ACCOUNTS` admite un array JSON o lista de correos separados por comas.
Cuando existe, el correo es obligatorio y se comprueba en ambas rutas. Sin esa
restricción se usa acceso compartido mediante contraseña. Un correo autodeclarado
no demuestra identidad individual. No existe una cuenta personal predeterminada.

`GITHUB_OWNER`, `GITHUB_REPOSITORY` y `GITHUB_BRANCH` son configuración pública en
`wrangler.jsonc`. `PROXY_ALLOWED_HOSTS` permite concretar una lista de hosts HTTPS
separados por comas. El proxy no reenvía cookies ni contraseñas de colaboradores,
ni sigue redirecciones desde el servidor.

Los errores distinguen `failed` y `unknown`. Ante resultado desconocido al actualizar
la rama, verificar el repositorio antes de reintentar: el servidor no repite escrituras.

## Verificación

`npm test` incluye `worker/tests/` con red y credenciales ficticias. No publica commits
ni modifica servicios reales. El runtime de Cloudflare y un despliegue de prueba
siguen requiriendo comprobación antes de sustituir el Worker activo. Wrangler no es
una dependencia instalada del proyecto actualmente.
