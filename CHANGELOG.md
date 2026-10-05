# Historial de Cambios (Changelog)

Todos los cambios notables en este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/)
y este proyecto se adhiere a [Semantic Versioning](https://semver.org/lang/es/).

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
