# Conexiones opcionales de AIOMetadata

El asistente delega la autorización de Trakt, Simkl, AniList y MyAnimeList a la
instancia de AIOMetadata elegida. No implementa seguimiento de reproducción.

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
