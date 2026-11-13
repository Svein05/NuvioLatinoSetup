# Contratos de importación de Stremio

## Dos operaciones independientes

La migración a Nuvio continúa usando exclusivamente el lector de `client.js`.
No escribe en Stremio. La configuración directa de Stremio utiliza el adaptador
separado `configuration.js`: autentica, lee `addonCollectionGet` y únicamente al
ejecutar la configuración guarda `addonCollectionSet`. Biblioteca, vistos y
progreso no forman parte de esa escritura.

La colección de addons se guarda completa. El workflow compara la lectura inicial
con una lectura fresca y vuelve a comprobarla inmediatamente antes de guardar.
Conserva los descriptores de los addons existentes, incluidos sus flags, y los
addons protegidos no pueden quitarse desde el gestor. Las instancias anteriores
de AIOMetadata se sustituyen por la configuración preparada y mostrada en el resumen.
Estos controles detectan cambios concurrentes observados, pero no proporcionan una
transacción atómica frente a otros clientes de Stremio.

Tras guardar se relee la cuenta para verificar identidad, orden y catálogos. Un
resultado incierto permite comprobar el guardado anterior; nunca lo repite de
forma automática. Las credenciales y la sesión de Stremio se mantienen en memoria,
sin persistirlas en localStorage ni sessionStorage.

La selección inicial incluye 28 catálogos editables. Las recomendaciones de Trakt
se agregan primero si existe la conexión. En Stremio se publican filas visibles;
no se aplica Ghost Mode ni se envían colecciones o ajustes exclusivos de Nuvio.
Las preferencias locales de idioma y reproducción se explican por dispositivo,
sin afirmar que se hayan aplicado remotamente.

La contraseña reservada `NUVIO-DEMO-OK`, con un correo válido de ejemplo, permite
recorrer la interfaz sin conectar una cuenta. `NUVIO-DEMO-SLOW` simula demora;
los demás códigos reservados simulan fallo. Una cuenta o clave de demostración
bloquea el workflow de instalación y no incrementa estadísticas.

## Lectura para migración

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
