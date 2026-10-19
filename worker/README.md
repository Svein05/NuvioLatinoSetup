# Worker

Fuentes versionadas del backend, separadas del build público de GitHub Pages.
La refactorización no despliega este código ni cambia el Worker actualmente activo.

## Contratos

- `POST /api/verify-auth`: `{ password, email }` → `{ success, role }`.
- `POST /api/save-staged-changes`: mismo contrato de lotes del publicador existente;
  devuelve `{ success, commit, count }` tras confirmar una actualización de referencia.
- `/https://host/ruta`: proxy de compatibilidad limitado a hosts HTTPS permitidos.

Los lotes admiten hasta 100 operaciones y un cuerpo de 25 MiB. Las imágenes nuevas
deben ser WebP, PNG o JPEG, hasta 6 MiB decodificados, con cabecera coherente con la
extensión. El editor actual convierte las subidas a WebP. Los SVG existentes pueden
renombrarse o eliminarse, pero no se admiten nuevas subidas SVG sin sanitización.
No se publican lotes parciales por renombrados que no pudieron leerse.

## Configuración privada

Usar el panel de Cloudflare o su herramienta oficial para configurar secretos:
`ADMIN_PASSWORD`, `MODDER_PASSWORD` y `GITHUB_TOKEN`. No guardarlos en este archivo,
`wrangler.jsonc`, JavaScript del navegador ni el repositorio.

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
