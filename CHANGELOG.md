# Historial de cambios

Los cambios destacados del proyecto se documentan en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/)
y este proyecto se adhiere a [Semantic Versioning](https://semver.org/lang/es/).

---

## [1.9.0] - 2026-10-25

### Añadido

- Cuatro capítulos animados en la portada, una presentación de Cuenta con carátulas
  reales y avatares del ranking, y preguntas frecuentes con apertura y cierre fluidos.
- Fondo compartido entre Inicio, Asistente y Cuenta con películas y series en tendencia
  de TMDB, caché semanal y soporte de movimiento reducido.
- Métricas de setups completos y usos de avatares gestionadas por el Worker, con datos
  separados entre producción y pruebas. Cada ejecución exitosa se registra una vez;
  una estrella verde celebra la confirmación y actualiza el total del servidor.
- Indicadores de carga en Cuenta, progreso de inicio de sesión, errores de acceso dentro
  del formulario y enlaces para configurar los addons que lo permiten.
- Enlace de apoyo en Ko-fi y etiqueta de verificación de Google Search Console.
- Video tutorial de TMDB junto a «Obtener», con capítulos, control de velocidad y
  pantalla completa; índice adaptable y carga del video únicamente al abrirlo.

### Cambiado

- Código reorganizado por páginas, flujos de aplicación, funcionalidades,
  integraciones e infraestructura compartida, conservando las rutas públicas.
- Integraciones privadas de Redis, publicación y sugerencias trasladadas al Worker;
  el build del navegador ya no inserta credenciales de Redis ni Discord.
- Campos del asistente simplificados a TMDB/MDBList, conservando la configuración
  interna de RPDB. La ejecución automática destaca y las descargas se agrupan en
  «Archivos de Configuración».
- Packs de badges desplegables debajo de los pósters, que se contraen al elegir uno.
- Addons y navegación adaptables al espacio disponible; avatares que completan filas,
  desplegables animados e índice de pasos que amplía su contenedor exterior.
- Botones principales de la portada más grandes y cómodos de pulsar.
- Assets de colaboradores sincronizados desde main remoto y catálogo incluido actualizado,
  con un generador reproducible y comprobación de cobertura de todas las imágenes.

### Corregido

- Difuminado del vidrio en el build, recortes de badges y ranking de avatares al filtrar
  por estilo. Se conservan los avatares nativos y se usan iconos de persona o rompecabezas
  cuando una imagen no está disponible.
- Registros duplicados o inciertos de setups, uso de avatar al crear perfiles y destino
  de la estrella en el menú compacto. Se retiró el popup de éxito anterior.
- Barras de progreso contenidas en las carátulas, sombra del título en móvil y continuidad
  del fondo y los carruseles durante su ciclo de animación.
- Documentación actualizada con campos, archivos exportados, uso de datos y servicios
  reales, sin promesas de latencia cero. Roadmap público depurado de trabajo completado.

La configuración completa de indexación y analítica, la rotación de credenciales de
producción y la confirmación en teléfonos físicos siguen siendo tareas independientes.
Estas notas describen la versión preparada; no confirman su publicación o despliegue.

## [1.8.0] - 2026-10-18

### ✨ Añadido
- **Portal de Colaboradores y Modders de Assets (`/modder/`):**
  - Nuevo panel web exclusivo para colaboradores autorizados mediante token seguro verificado en Cloudflare Worker.
  - **Conversión Universal a WebP en el Cliente:** Conversión automática mediante Canvas HTML5 de cualquier formato de imagen (PNG, JPEG, SVG, BMP) a WebP de alta fidelidad (0.90) con cálculo y optimización de peso en tiempo real.
  - **Subida por Lote con Cola Visual:** Admite arrastrar y soltar múltiples imágenes, asignación interactiva de nombres de archivo y destino con validación instantánea contra colisiones en la misma carpeta (`profile_icons/<Estilo>/<Obra>/`).
  - **Gestor Visual de Catálogo Existente:** Explorador de colecciones y catálogo por obras, con modal de edición rápida para renombrado de personajes o reemplazo de imágenes WebP en vivo.
  - **Pila de Cambios Pendientes (Staging Stack) y Desglose Interactivo:**
    - Modal de confirmación "Guardar Cambios" con desglose pormenorizado de cada operación pendiente (miniaturas de 38x38 px, badges semánticos de acción: nuevo archivo, renombrado, reemplazo WebP o eliminación, ruta de carpeta y peso).
    - Descarte y eliminación individual quirúrgica de cambios pendientes sin perder el resto de operaciones acumuladas.
    - Sincronización atómica directa contra la rama `main` de GitHub vía Worker con commit único descriptivo y `[skip ci]`.
- **Auto-Actualización y Sincronización Remota de Avatares en `/account`:**
  - Revalidación ultraligera por SHA de commit contra GitHub Trees API (`~200 bytes`, timeout protector de 3.5s). Si se detecta un commit nuevo en `main`, invalida la caché en segundo plano y descarga el árbol fresco.
  - Botón circular de refresco manual (`#btnRefreshAvatarsCatalog`) junto a los filtros de estilo para forzar la sincronización en vivo.
  - Refresco forzado automático al iniciar sesión en el formulario de `/account`.

### ⚡ Rendimiento, Caché y Seguridad
- **Resolución Directa desde `raw.githubusercontent.com`:**
  - Migración definitiva desde jsDelivr hacia GitHub Raw para todas las imágenes y recursos de avatares, eliminando el desfase de caché Edge de 24 horas en ramas móviles (`@main`).
  - Incorporación de parámetro cache-buster determinista por SHA de commit (`?v=${commitSha}`) para refresco instantáneo en todos los navegadores.
  - Supresión completa de dependencias y crawlers locales (`crawlLocalAvatars`), asegurando arquitectura 100% cloud-native conectada a GitHub.

---

## [1.7.0] - 2026-10-17

### ✨ Añadido
- **Módulo de Sugerencias Comunitarias de Avatares (Discord Webhook):**
  - Sistema interactivo integrado en el panel de cuenta (`/account`), en el modal de catálogo por franquicia y en el selector de avatares para nuevos perfiles.
  - Soporte dual de subida: carga directa de archivos de imagen desde el dispositivo (con soporte de arrastrar y soltar hasta 8 MB) o ingreso de enlace directo (URL web).
  - Previsualización circular reactiva a escala real con actualización instantánea de metadatos (nombre del personaje y obra/franquicia).
  - Modal de confirmación con previsualización destacada antes del envío definitivo.
  - Despacho directo a canal privado de Discord mediante webhook oficial con Rich Embeds dorados (`#ffd479`), campos ordenados y visualización de imagen en tamaño completo.
  - Persistencia inteligente de formulario (conservación de datos y modo URL tras cerrar el modal; purga segura en modo archivo por privacidad) y limitador de frecuencia (*rate limit*) para prevenir envíos accidentales consecutivos.
  - Integración del pipeline de despliegue en GitHub Actions con inyección segura de secretos para producción.

### ⚡ Rendimiento y Optimización
- **Conversión Integral de Recursos a Formato WebP (-85% en peso):**
  - Migración y recompresión de más de 145 activos gráficos (avatares oficiales, logotipos e iconografía) de JPEG y PNG hacia el formato moderno WebP de alta fidelidad con preservación del canal alfa y transparencias.
  - Reducción masiva de más de 138 MB del tamaño del repositorio, acelerando significativamente los tiempos de carga, respuesta y consumo de datos en la web y dispositivos móviles.
  - Actualización completa del catálogo de avatares (`manifest.json`) hacia las nuevas extensiones `.webp`.

### 🔧 Modificado y Perfeccionado
- **Estabilidad y Fluidez de la Barra de Navegación:**
  - Sincronización mediante `requestAnimationFrame` del indicador flotante deslizante en la barra superior.
  - Desacoplamiento de las cápsulas laterales de botones y contador para suprimir micro-oscilaciones (*jitter*) y saltos de layout durante el hover.
  - Contención estricta de desbordamiento en el contenedor de navegación para una transición fluida y visualmente impecable.

---

## [1.6.0] - 2026-10-15

### ✨ Añadido
- **Nuevo Panel de Cuenta y Perfil (`/account`):**
  - Permite gestionar tu cuenta de Nuvio directamente desde la web sin necesidad de volver a pasar por todo el asistente de configuración.
  - **Resumen de Perfil:** Visualiza tus estadísticas principales (Plugins, Addons instalados, progreso de reproducción, biblioteca y visualizaciones).
  - **Catálogo de Avatares estilo Netflix:** Elige tu foto de perfil entre decenas de personajes organizados por series y animes (incluyendo la nueva colección de Soul Eater, One Piece, Naruto, Dragon Ball y X-Men '97) o añade tu propia imagen con enlace directo.
  - **Gestor Visual de Addons:** Organiza tus complementos arrastrándolos de forma fluida y suave en pantalla, sube o baja su prioridad, edita sus datos, actívalos o desactívalos, y elimínalos con confirmación de seguridad.
  - **Botón Deshacer paso a paso:** Permite revertir fácilmente cualquier cambio, reordenación o eliminación de addons si te equivocas antes de guardar.
  - **Plantilla de AIOStreams con Servicios Debrid:** Agrega o reconfigura fácilmente la plantilla recomendada de AIOStreams con tus proveedores Debrid preferidos.
  - **Personalización de Carátulas:** Ajusta el estilo de tus pósters (TMDB, BetterPoster o PostersPlus) y tus claves de API directamente desde tu perfil.
  - **Gestión de Perfiles:** Cambia de perfil en cualquier momento o crea nuevos perfiles para tu familia.
- **Contador de Estrellas de GitHub:**
  - Nueva cápsula en la barra de navegación que muestra las estrellas de la comunidad en tiempo real.

---

## [1.5.0] - 2026-10-04

### ✨ Añadido
- **Flujo Secuencial en 7 Pasos y Gestor de Addons de Perfil (Paso 6):**
  - Incorporación del Paso 6 dedicado a la inspección, ordenamiento, adición y remoción de complementos instalados en el perfil de Nuvio.
  - Anclaje inmutable de **AIOMetadata** en la posición #1 para garantizar la prioridad absoluta de las colecciones y metadatos en español latino.
  - Soporte de reordenamiento visual de complementos mediante controles directos (▲ / ▼) y compatibilidad para agregar complementos externos mediante su URL de manifiesto.
  - Reemplazo atómico de versiones previas de AIOMetadata en el perfil, evitando duplicaciones al reconfigurar.
- **Integración Asistida de AIOStreams con Plantilla Latina y Servicios Debrid:**
  - Asistente guiado para la integración de **AIOStreams** con plantilla curada (`templates/Aiostream.json`) y streams latinos priorizados.
  - Modal interactivo de configuración de API Keys para proveedores Debrid priorizando Torbox, AllDebrid, Real-Debrid, Premiumize y Debrid-Link.
  - Generación automatizada y cifrada del manifiesto final en el Paso 7 utilizando la misma Clave Maestra del usuario (`js/aiostreams-client.js`).
- **Anclaje Rápido de Colecciones (Pin to Top) en Mini Nuvio:**
  - Botón de fijado instantáneo en las tarjetas de colecciones del Paso 3, permitiendo elevar cualquier catálogo al inicio de su sección con un solo clic.
- **Odómetro Digital y Contador en Vivo de Setups Completados:**
  - Pastilla interactiva en la barra superior con animación de rodillo numérico para visualizar en tiempo real la cantidad de configuraciones completadas (`js/counter.js`).
  - Menú flotante compacto en dispositivos móviles con acceso a métricas y enlaces comunitarios.
- **Integración Completa de Paquetes Fusion Badges (kingsizew):**
  - Módulo de personalización de distintivos de streaming con previsualización inmediata de carátulas y créditos oficiales.

---

## [1.4.0] - 2026-10-02

### ✨ Añadido
- **Sistema de Diseño Latino y Tipografía Editorial:**
  - Rediseño estético integral fundamentado en *Instrument Serif* e *Instrument Sans* sobre una atmósfera OLED con paneles de cristal esmerilado (*glassmorphism*).
  - Barra de navegación flotante minimalista con indicador deslizante interactivo y dinámico (`js/nav-indicator.js`).
- **Fondo Cinemático Dinámico con Desvanecimiento Continuo:**
  - Collage panorámico de alta resolución con pósters oficiales en español latino distribuidos en patrón escalonado de ladrillo.
  - Efecto dinámico de desvanecimiento progresivo y desenfoque por scroll (*smooth-step*) que transiciona hacia un fondo oscuro sutil al navegar hacia las secciones inferiores.
- **Rediseño del Gestor de Perfiles (Paso 2):**
  - Cuadrícula centrada y simétrica (3 columnas x 2 filas) adaptativa para hasta 6 perfiles.
  - Tarjeta interactiva para la creación de perfiles con desenfoque modal delimitado estrictamente al área de pasos del asistente (*scoped blur*), preservando la barra de navegación superior.
- **Generador de Banner de Incrustación para Discord:**
  - Generación automatizada de la tarjeta oficial de previsualización `assets/preview/incrustacion.png` con título centrado y fondo dinámico de cartelera.

### 🐛 Corregido
- **Armonización Visual y Eliminación de Parpadeos (Flicker):**
  - Supresión de interferencias dinámicas y destellos en los botones del Paso 6 y carruseles de selección.
  - Reorganización centrada de los botones de descarga de respaldos JSON directamente bajo la clave maestra.
  - Reemplazo del ícono de enriquecimiento en el resumen de configuración por `fa-wand-magic-sparkles` compatible con Font Awesome Free.
  - Homogeneización de los 4 pilares informativos de la portada con íconos amarillos dorados (`#ffd479`) y cajas de cristal idénticas.

---

## [1.3.0] - 2026-09-30

### ✨ Añadido
- **Catálogos de Clásicos del Anime en Descubre:**
  - Incorporación de dos nuevos catálogos curados en la sección Anime > Descubre:
    - 📺 **Series Clásicas del Anime:** Consumo oficial vía `mdblist.133742` (hachiso33/classic-anime-shows) enlazado con la carpeta `folder-anime-descubre`.
    - 🎬 **Películas Clásicas del Anime:** Consumo oficial vía `mdblist.133743` (hachiso33/classic-anime-movies) enlazado con la carpeta `folder-anime-descubre`.
  - Integración completa en `templates/MetadataLatino.json` y `templates/NuvioCollections.json` con paridad 1:1.

### 🐛 Corregido
- **Saneamiento y Purga Total de Tags en AIOMetadata (`config.tags`):**
  - Eliminación de 23 tags residuales con 0 catálogos (plataformas como Peacock, Shudder, Rakuten Viki, ViX; países; décadas; sagas y subgéneros no utilizados).
  - Corrección de 6 tags desincronizados que provocaban filtros vacíos en la web de AIOMetadata:
    - `Estrenos` ➔ `Estreno` (5 catálogos)
    - `Recomendaciones` ➔ `Recomendados` (6 catálogos)
    - `Populares` ➔ `Popular` (4 catálogos)
    - `Paramount` ➔ `Paramount+` (6 catálogos)
    - `Musica & Biopic` ➔ `Conciertos & Biopic` (4 catálogos)
    - `Studio` ➔ `Estudios` (7 catálogos)
  - Incorporación del tag faltante `Novedades` (`green`) y actualización de contadores de catálogos (`totalCatalogs` y `enabledCatalogs`) a **148**.
- **Corrección de Estudios de Anime (Series vs Películas):**
  - Eliminación de 5 catálogos redundantes clasificados erróneamente como `movie` que apuntaban al mismo ID de series de MDBList (Studio MAPPA, Toei Animation, Ufotable, Madhouse y WIT Studio), suprimiendo pestañas duplicadas en el cliente Nuvio y dejando 7 estudios limpios con paridad 1:1.
- **Desactivación de Filtros de Pre-estrenos Digitales:**
  - Desactivación por defecto de `hideUnreleasedDigital`, `hideUnreleasedDigitalSearch`, `hideUnreleasedShows` y `hideUnreleasedShowsSearch` en `MetadataLatino.json` para garantizar que las listas de películas anticipadas y cartelera muestren sus títulos sin bloqueos artificiales.
- **Migración a Lista Pública para Películas Anticipadas:**
  - Sustitución de la lista de películas anticipadas por la lista comunitaria pública `mdblist.60883` (*shavedbroom/most-anticipated-upcoming-movies*), asegurando carga inmediata y estable de 127 títulos esperados.

---

## [1.2.0] - 2026-09-28

### ✨ Añadido
- **Carrusel Sincronizado de Demostración de Pósters (Paso 5):**
  - Catálogo de 30 títulos emblemáticos clasificados en Anime, Películas y Series populares para previsualización 2:3 vertical.
  - Barajado aleatorio continuo con algoritmo Fisher-Yates (`posterDeck`) que previene repeticiones inmediatas y cicla suavemente todas las opciones.
  - Sistema de precarga estricta al 100% en memoria con `Promise.all` (`preloadImage`): si alguno de los 3 proveedores (`AioMetadata`, `BetterPoster`, `Poster+`) demora o falla, el título se omite automáticamente buscando el siguiente hasta garantizar 3 carátulas cargadas al 100% antes de realizar la transición (crossfade simultáneo de 300 ms sin cuadros blancos ni saltos visuales).
- **Profesionalización de la Autenticación y Registro Nuvio (Paso 1):**
  - Soporte nativo para envío de formularios mediante la tecla `Enter` en campos de correo y contraseña.
  - Campo de confirmación obligatoria de contraseña en la pestaña *Crear Cuenta* con validación reactiva en tiempo real (indicadores dinámicos verde esmeralda `fa-circle-check` si coinciden o rojo suave `fa-circle-xmark` si difieren).
  - Botones interactivos de alternancia de visibilidad de contraseña (ojo) en ambos campos.
  - Manejo amigable y claro de excepciones de verificación por correo electrónico de Supabase Auth.
- **Rediseño Limpio y Simétrico de Tarjetas de Selección de Pósters:**
  - Títulos de fuente reubicados en la cabecera superior en blanco negrita limpio (`AioMetadata`, `BetterPoster`, `Poster+`), eliminando etiquetas de colores y textos descriptivos inferiores redundantes.
  - Actualización de plantilla de Poster+ con `logo_language=es-mx&logo_priority=native,english,original,neutral,text` para priorizar logos latinos en títulos de anime sin forzar fuentes en inglés.
- **Paridad 1:1 Absoluta entre Colecciones y Addon:**
  - Reestructuración jerárquica modular y secuencial de `templates/MetadataLatino.json` eliminando catálogos huérfanos o no referenciados y garantizando coincidencia biyectiva con `templates/NuvioCollections.json`.

### 🐛 Corregido
- **Corrección de Discrepancias de Identificadores en Carátulas:**
  - Corrección de `tmdbId` de *Cowboy Bebop* de `40075` (que apuntaba a *Gravity Falls*) a su ID oficial `30991` con póster de respaldo verificado.
  - Corrección de `tmdbId` de *Severance* de `93740` (que apuntaba a *Foundation*) a su ID oficial `95396`.
  - Corrección de `tmdbId` de *The Wire* de `32973` (ID inexistente en endpoints de series de TMDB) a su ID oficial `1438`.
- **Restauración de Iconos Font Awesome:**
  - Sustitución de `fa-sparkles` (icono Font Awesome PRO) por `fa-wand-magic-sparkles` en la tarjeta de TMDB Enrichment del Paso 5, garantizando renderizado nítido en Font Awesome Free.
- **Actualización de Documentación:**
  - Alineación completa del flujo en 6 etapas en `README.md` y `documentation/index.html`.

## [1.1.1] - 2026-09-27

### 🐛 Corregido
- **Migración Integral de Imágenes a Assets Locales en GitHub Pages:**
  - Sustitución de 54 URLs obsoletas de `i.postimg.cc` en `templates/NuvioCollections.json` por enlaces directos a la CDN de GitHub Pages (`https://svein05.github.io/NuvioLatinoSetup/assets/collections/...`), resolviendo el error de imágenes caídas al navegar en modo incógnito o en clientes de TV/móvil.
  - Las secciones **"Ahora en Nuvio"** (Recomendados, Estreno, Tendencia, Ranking, Popular) y **"Géneros"** (13 carpetas temáticas) ahora cargan de inmediato desde los activos físicos del repositorio sin dependencias de servicios externos de terceros.
  - Eliminación del enlace roto a `Perfil-Terceario.png`, fijando `backdropImageUrl: null` a nivel de colección para permitir el renderizado cinematográfico nativo del cliente Nuvio.
  - Eliminación de `assets/collections/url_mapping.json` como archivo huérfano obsoleto para mantener el repositorio limpio y sin código muerto.

## [1.1.0] - 2026-09-25

### ✨ Añadido
- **Mini NUVIO (Simulador Visual Interactivo):**
  - Carruseles temáticos fluidos con renderizado en tiempo real mediante la API v3 de TMDB en español latino (`es-MX`).
  - Reordenación animada con SortableJS, soporte de gestos táctiles, botones de movimiento rápido (al cielo ⏫ y al fondo ⏬).
  - Todas las carátulas y tarjetas de géneros estandarizadas en proporción apaisada `LANDSCAPE` 16:9 con imágenes locales de carga instantánea (0 ms).
  - Gestor CRUD completo de catálogos dentro de colecciones: subir/bajar, renombrar con títulos comerciales latinos, eliminar o añadir desde la biblioteca de AIOMetadata.
  - Integración y detección automática de recomendaciones de **Trakt** en el carrusel de inicio.
- **Enriquecimiento Oficial de Perfiles (TV y Mobile):**
  - Sincronización de credenciales oficiales mediante el RPC `sync_push_provider_credentials` para TMDB y MDBList.
  - Activación canónica del blob de ajustes (`sync_push_profile_settings_blob`) con esquemas versionados para ambas plataformas (`tv` y `mobile`), habilitando idioma `es-MX`, trailers, créditos, sinopsis y colecciones.
  - Activación de notas críticas de MDBList (IMDb, Rotten Tomatoes, Metacritic, Trakt) condicionada a la provisión de API key.
- **Validación en Vivo de Claves API:**
  - Probador interactivo de conexiones para TMDB, MDBList y RPDB (`t0-free-rpdb` o personalizada) con badges de visto bueno verde `✓ Válida` o alertas de error en tiempo real.
  - Los badges se muestran de manera exclusiva tras la validación, manteniendo la interfaz limpia y sin recuadros redundantes.
- **Protección y Gestión de Perfiles Nuvio:**
  - Banner de advertencia reactivo al seleccionar perfiles preexistentes de la cuenta para alertar sobre la sobreescritura de addons y colecciones.
  - Exclusión automática de la alerta para perfiles recién creados durante la sesión.
  - Límite estricto de seguridad de 6 perfiles por cuenta para evitar errores `P0001` de la API de Nuvio.
  - Limpieza atómica de addons por defecto ("nuvio catalog addon" y "opensubtitles") garantizando una biblioteca sin conflictos.
- **Modo Manual (Sin Cuenta):**
  - Posibilidad de utilizar el asistente y personalizar colecciones sin requerir credenciales de Nuvio, con botones de copiado y descarga de JSONs reactivos a la contraseña maestra.
- **Ecosistema de Código Abierto Profesional:**
  - Archivo oficial de Licencia MIT (`LICENSE`) garantizando libre uso con atribución de autoría a Svein (`Svein05`).
  - Sincronización de versión centralizada (`version.json`, `js/config.js` y enlaces en barra superior a Releases).
  - Workflow automatizado de GitHub Actions (`.github/workflows/release.yml`) para creación de releases al publicar tags.
  - Script asistido de lanzamientos en Python (`scripts/release.py`) y skill de auditoría de congruencia (`.agents/skills/release-audit-and-consistency/SKILL.md`).

### 🔧 Modificado
- **Carátulas Limpias en HD:** Eliminación completa de patrones forzados de puntuaciones en carátulas (`customPosterUrlPattern: ""` y `posterRatingProvider: "none"`), asegurando imágenes cinematográficas limpias sin sellos superpuestos.
- **Diseño Simétrico de Claves API:** Etiqueta distintiva `(Recomendado)` en MDBList y unificación de todos los enlaces a simplemente `Obtener ↗` con blindaje `whitespace-nowrap` y `shrink-0`.
- **Corrección de Documentación:** Reordenación del flujo del asistente en `README.md` alineándolo con el orden real de la aplicación (Paso 3: Colecciones / Paso 4: Claves API).

---

## [1.0.0] - 2026-09-20

### 🚀 Lanzamiento Inicial
- Asistente web para la configuración automatizada de metadatos en español latino (`es-MX`) en Nuvio mediante AIOMetadata.
- Modo "Ghost" para evitar catálogos raíz desordenados en la pantalla de inicio.
- Inyección de plantillas de colecciones y configuración básica de addons.
