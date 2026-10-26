# Cloudflare Worker

Código del backend, separado del build público de Vite. Guardar estos archivos en
Git no despliega el Worker. Los secretos se configuran en Cloudflare: nunca deben
incluirse en JavaScript del navegador, archivos del repositorio ni artefactos públicos.

## Rutas y contratos

| Ruta | Función |
| --- | --- |
| `POST /api/verify-auth` | Recibe `{ password, email }`; devuelve `{ success, role }` para el acceso de colaboradores. |
| `POST /api/save-staged-changes` | Publica un lote de avatares validado; devuelve `{ success, commit, count }` tras confirmar la actualización de la referencia Git. |
| `/https://host/path` | Proxy de compatibilidad limitado a hosts HTTPS permitidos. |
| `GET /api/avatars/ranking?limit=8` | Devuelve `items`, `totalUsage` y el entorno; el límite 1–32 solo afecta al top visible. |
| `POST /api/avatars/usage` | Recibe `{ key }` y una sesión Nuvio Bearer; confirma `recorded` o `duplicate` tras un guardado de avatar o creación de perfil confirmados. |
| `POST /api/avatars/suggestions` | Recibe un formulario autenticado; confirma `sent` tras la respuesta de Discord o un envío ya confirmado con ese identificador. |
| `GET /api/completions` | Lee el total confirmado de setups del entorno. |
| `POST /api/completions` | Registra una ejecución exitosa con `completionId` idempotente; mantiene compatibilidad temporal con `clientId`. |
| `GET /api/poster-feed`, `HEAD /api/poster-feed` | Lee la caché semanal de pósters en tendencia; las visitas no actualizan TMDB. |

[Métricas](METRICS.md) detalla respuestas, deduplicación, base condicional de 55
setups, aislamiento de entornos y orden de migración. [Fondo semanal](POSTER-FEED.md)
detalla KV, programación, caché e inicialización.

## Configuración privada

- Colaboradores: `ADMIN_PASSWORD`, `MODDER_PASSWORD`, `GITHUB_TOKEN`.
- Métricas y ranking: `AVATAR_REDIS_URL`, `AVATAR_REDIS_TOKEN` con permisos de lectura,
  escritura y EVAL. Las operaciones autenticadas también necesitan `NUVIO_PUBLIC_ANON_KEY`.
- Sugerencias: `AVATAR_SUGGESTION_WEBHOOK_URL`, webhook HTTPS de Discord sin parámetros.
  El navegador no recibe esta URL.
- Fondo: `TMDB_READ_ACCESS_TOKEN` y el binding KV descrito en su guía.

`MODDER_ACCOUNTS` acepta un array JSON o correos separados por comas. Si se configura,
ambas rutas de colaboradores comprueban el correo. Un correo autodeclarado junto a
una contraseña compartida no demuestra identidad individual; no existe una cuenta
personal predeterminada.

`GITHUB_OWNER`, `GITHUB_REPOSITORY` y `GITHUB_BRANCH` son configuración pública en
`wrangler.jsonc`. `PROXY_ALLOWED_HOSTS` permite concretar los hosts HTTPS admitidos.
El proxy no reenvía contraseñas de colaboradores ni cookies, ni sigue redirecciones.

## Publicación de avatares

Los lotes admiten 1–100 operaciones y un cuerpo de 25 MiB. Las imágenes nuevas deben
ser WebP, PNG o JPEG con cabecera coherente, hasta 8 MiB de base64 (aproximadamente
6 MiB decodificados). El editor convierte las subidas a WebP. Se pueden renombrar o
eliminar SVG existentes; las nuevas subidas SVG se rechazan sin sanitización.
Un renombrado ilegible no produce un lote parcial. Ante un resultado desconocido al
actualizar la rama, inspecciona el repositorio antes de reintentar: no se repiten
escrituras inciertas automáticamente.

El catálogo de colaboradores puede cambiar independientemente de las versiones de
la web. Conserva los archivos recibidos y actualiza el manifiesto incluido antes de
publicar el frontend. Los assets existentes no determinan los límites de nuevas subidas.

## Ranking y sugerencias

Las sesiones se verifican contra `https://api.nuvio.tv/auth/v1/user`; no basta con
un ID autodeclarado. El navegador no recibe credenciales de Redis. Lua agrupa la
deduplicación y el incremento: un uso por cuenta/avatar cada 24 horas y un máximo de
100 por cuenta y día UTC. Las claves usan hashes, no IDs o tokens en claro.

`totalUsage` suma todos los valores válidos antes de recortar el top. Representa
usos registrados, no personas únicas o perfiles actuales. Un almacenamiento vacío
confirmado devuelve cero; datos inválidos o sumas inseguras fallan sin devolver un
total parcial. La portada lee el ranking sin registrar usos.

Las sugerencias reciben `requestId` UUID, `mode`, `characterName`, `seriesName` e
imagen `file` o `url`. Admiten PNG, WebP, JPEG y GIF de hasta 8 MiB con comprobación
de cabecera, más 16 KiB para campos y cabeceras multipart. Los nombres admiten 100
caracteres y las URLs HTTPS, 2048. El Worker no descarga las imágenes enlazadas.

Redis reserva el identificador durante 24 horas y aplica una espera de 120 segundos
por cuenta. Los envíos pendientes o desconocidos no se repiten automáticamente; un
rechazo definitivo permite reintentar explícitamente con el mismo ID. Discord usa
`wait=true`, exige un ID de mensaje y desactiva las menciones.

## Verificación y publicación

`npm test` incluye `worker/tests/` con red y credenciales ficticias. No publica
commits, altera cifras reales ni envía mensajes a Discord. El despliegue y las
comprobaciones con proveedores y dispositivos reales son operaciones separadas.
Inspecciona la revisión desplegada y su configuración; este README no acredita qué
versión está activa. Wrangler no es una dependencia del proyecto.

Antes de retirar las inyecciones antiguas de GitHub, sigue la guía de métricas.
Eliminar un secreto de GitHub no revoca un token incluido en un build anterior:
las credenciales expuestas deben rotarse. No elimines la base ni reinicies un
contador activo durante esa limpieza.
