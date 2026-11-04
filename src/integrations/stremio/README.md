# Contratos de importación de Stremio

La conexión usa exclusivamente lecturas de Stremio desde el navegador. Correo y
contraseña se envían a `https://api.strem.io/api/login`. La clave de sesión se usa
para `addonCollectionGet` y `datastoreGet` sobre `libraryItem`. El preflight público
permite CORS. Las credenciales y la instantánea no se guardan en almacenamiento.

La conversión acepta identificadores IMDb y episodios identificables. El formato
`WatchedField` se alinea con el orden de episodios de Cinemeta mediante su ancla.
Los tiempos de reproducción de ambos clientes están expresados en milisegundos.
La fecha del estado visto de Stremio se conserva como referencia compartida para
los episodios, porque la cuenta no contiene una fecha individual para cada uno.

El destino utiliza `sync_push_library` con la unión completa leída previamente,
`sync_push_watched_items` con `p_items` y `sync_push_watch_progress` con `p_entries`.
Las lecturas deben completarse antes de escribir. Un fallo o resultado incierto
obliga a releer el perfil antes del reintento. Los cambios simultáneos desde otra
aplicación siguen dependiendo de las garantías del servidor Nuvio.

Referencias verificadas en los repositorios oficiales el 4 de noviembre de 2026:

- https://github.com/Stremio/stremio-core/blob/development/src/types/api/request.rs
- https://github.com/Stremio/stremio-core/blob/development/src/types/library/library_item.rs
- https://github.com/Stremio/stremio-core/tree/development/stremio-watched-bitfield/src
- https://github.com/NuvioMedia/NuvioTVSmart/blob/main/js/core/profile/savedLibrarySyncService.js
- https://github.com/NuvioMedia/NuvioTVSmart/blob/main/js/core/profile/watchedItemsSyncService.js
- https://github.com/NuvioMedia/NuvioTVSmart/blob/main/js/core/profile/watchProgressSyncService.js
