# Conexiones opcionales de AIOMetadata

El asistente delega la autorización de Trakt, Simkl, AniList y MyAnimeList a la
instancia Midnight de AIOMetadata. Las conexiones comprobadas activan por defecto
`simklWatchTracking`, `anilistWatchTracking` o `malWatchTracking`, según el servicio;
el usuario puede desactivar cada una. Al quitar una conexión se desactiva su flag.
Trakt conserva el seguimiento nativo de Nuvio y no recibe un flag ficticio.

En AIOMetadata 3.8.3, el mecanismo de subtítulos puede registrar vistos al solicitar
subtítulos. No equivale a confirmar una reproducción completada; la interfaz lo
explica junto al switch. El seguimiento por eventos depende de que el reproductor
los envíe. Conectar una cuenta no acredita compatibilidad de todos los clientes.

## Contrato de integración

- `/api/config` anuncia la disponibilidad de Trakt y Simkl.
- La autorización externa entrega un identificador opaco que el usuario copia.
- `POST /api/oauth/token/info` comprueba el proveedor y la identidad asociados.
- Las lecturas de listas usan `/api/trakt/proxy`, `/api/simkl/lists` y
  `/api/anilist/lists`. MyAnimeList utiliza sus categorías predefinidas.
- El adaptador solo envía identificadores a instancias previamente permitidas;
  no sigue redirecciones ni cambia de instancia tras vincular una cuenta.
- El archivo de configuración incluye los identificadores necesarios. No deben
  registrarse en logs, estadísticas o almacenamiento persistente del navegador.
- Antes de escribir en Nuvio, el manifiesto guardado debe contener los catálogos
  conectados seleccionados y activos. Una respuesta incompatible detiene la instalación.

Las rutas y recetas corresponden al [proyecto AIOMetadata](https://github.com/cedya77/aiometadata/tree/dev).
La compatibilidad depende de la versión y configuración de cada instancia.
La comprobación de identidad no sustituye una prueba real de autorización,
permisos y acceso a listas con cada proveedor.
