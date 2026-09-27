# Historial de Cambios (Changelog)

Todos los cambios notables en este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/)
y este proyecto se adhiere a [Semantic Versioning](https://semver.org/lang/es/).

---

## [1.1.1] - 2026-09-27

### 🐛 Corregido
- **Migración Integral de Imágenes a Assets Locales en GitHub Pages:**
  - Sustitución de 54 URLs obsoletas de `i.postimg.cc` en `templates/NuvioCollections.json` por enlaces directos a la CDN de GitHub Pages (`https://svein05.github.io/NuvioLatinoSetup/assets/collections/...`), resolviendo el error de imágenes caídas al navegar en modo incógnito o en clientes de TV/móvil.
  - Las secciones **"Ahora en Nuvio"** (Recomendados, Estreno, Tendencia, Ranking, Popular) y **"Géneros"** (13 carpetas temáticas) ahora cargan de inmediato desde los activos físicos del repositorio sin dependencias de servicios externos de terceros.
  - Eliminación del enlace roto a `Perfil-Terceario.png`, fijando `backdropImageUrl: null` a nivel de colección para permitir el renderizado cinematográfico nativo del cliente Nuvio.
  - Sanitización de rutas en `assets/collections/url_mapping.json` a nombres limpios en formato ASCII (`generos_*`), asegurando 100% de consistencia con los archivos físicos en disco.

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
