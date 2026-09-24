<p align="center">
  <img src="https://nuvio.tv/assets/nuvio-app-logo-wordmark.webp" alt="Nuvio" width="220" />
</p>

<h1 align="center">Nuvio Metadata Latino Setup 🎬🇲🇽</h1>

<p align="center">
  <strong>Asistente automatizado de aprovisionamiento de colecciones nativas, metadatos enriquecidos y catálogos en español latino para Nuvio TV.</strong>
</p>

<p align="center">
  <a href="https://github.com/Svein05/NuvioLatinoSetup/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square" alt="Licencia MIT" /></a>
  <img src="https://img.shields.io/badge/JavaScript-ES6%20Modules-yellow.svg?style=flat-square" alt="ES6 Modules" />
  <img src="https://img.shields.io/badge/TailwindCSS-CDN-38bdf8.svg?style=flat-square" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Architecture-100%25%20Static%20SPA-emerald.svg?style=flat-square" alt="Static SPA" />
  <a href="https://discord.gg/EubYtJVJEc"><img src="https://img.shields.io/badge/Discord-Comunidad%20Latina-5865F2.svg?style=flat-square&logo=discord&logoColor=white" alt="Discord" /></a>
</p>

---

## 📌 Descripción General

**Nuvio Metadata Latino Setup** es una aplicación web interactiva de código abierto diseñada para simplificar y automatizar por completo la configuración de perfiles en **Nuvio**. A través de la integración directa con las APIs de **AIOMetadata**, **TheMovieDatabase (TMDB)** y los servicios en la nube de **Nuvio (Supabase RPCs)**, este asistente permite generar un entorno cinematográfico ordenado, optimizado y enfocado en la audiencia de habla hispana en Latinoamérica (`es-MX`).

### 🎯 El Problema que Resuelve
Por defecto, la instalación masiva de catálogos en reproductores multimedia suele saturar la pantalla de inicio con listas duplicadas, desordenadas y portadas genéricas. Este asistente implementa la estrategia **"Ghost Mode"**: todos los catálogos raíz de AIOMetadata se configuran de manera invisible para la pantalla principal (`showInHome: false`), mientras que la interfaz de inicio de Nuvio queda gobernada de forma limpia por **Colecciones Nativas** con carátulas estilizadas, carruseles temáticos en formato apaisado (`LANDSCAPE` 16:9) y previsualización interactiva.

---

## ✨ Características Principales

- **Flujo Guiado en 5 Etapas:** Navegación secuencial paso a paso con validaciones estrictas y control reactivo de estados.
- **Soporte Dual de Aprovisionamiento:**
  - **Modo Nuvio Cloud:** Conexión segura con tu cuenta de Nuvio para inyectar colecciones, configuraciones y addons de forma 100% automática mediante RPCs autenticadas.
  - **Modo Manual (Sin Cuenta):** Para usuarios que prefieren no ingresar credenciales; permite personalizar las colecciones y copiar o descargar los archivos JSON listos para importar.
- **Mini NUVIO (Simulador Visual Interactivo):**
  - Vista previa en vivo con carruseles horizontales que simulan exactamente la interfaz de Nuvio.
  - Integración en tiempo real con la **API v3 de TMDB** para renderizar pósters, títulos y sinopsis reales en español latino.
  - **Gestor CRUD de Catálogos:** Reordena posiciones (subir/bajar), renombra con títulos comerciales amigables, elimina catálogos no deseados o añade nuevos desde la biblioteca central de AIOMetadata.
  - Prioridad de recomendaciones dinámicas de **Trakt** en el carrusel de recomendados.
  - Todas las filas de géneros estructuradas de forma consistente en formato `LANDSCAPE`.
- **Enriquecimiento Nativo de Perfiles:**
  - Habilitación automática de **TMDB Enrichment** y **MDBList Ratings** con localización `es-MX`.
  - Configuración simultánea para plataformas `tv` (Smart TVs / Android TV) y `mobile`.
- **Limpieza Automática de Perfiles:**
  - Eliminación automática de addons por defecto ("nuvio catalog addon" y "opensubtitles") al configurar o crear un perfil, garantizando una biblioteca limpia.
- **100% Estático y Servidor Cero:**
  - Construido como una Single Page Application (SPA) en JavaScript ES6 vanilla sin dependencias de compilación ni backend propio.
  - Compatible de forma nativa para alojamiento en **GitHub Pages**.

---

## 🗺️ Flujo de los 5 Pasos del Asistente

```
[ Paso 1: Cuenta Nuvio / Modo Manual ]
                  │
                  ▼
[ Paso 2: Selección / Creación de Perfil ] (Omitido en Modo Manual)
                  │
                  ▼
[ Paso 3: Configuración y Validación de API Keys ]
                  │
                  ▼
[ Paso 4: Personalización Visual en Mini NUVIO ]
                  │
                  ▼
[ Paso 5: Seguridad de Addon e Inyección / Exportación JSON ]
```

1. **Paso 1 - Autenticación Nuvio:** Inicia sesión con tus credenciales de Nuvio, crea una cuenta nueva o selecciona el botón alternativo **Continuar sin cuenta (Modo Manual)**.
2. **Paso 2 - Selección de Perfil:** Elige el perfil de Nuvio en el que se aplicará la configuración o crea uno nuevo directamente desde el asistente. Incluye advertencias visuales de sobreescritura para perfiles existentes.
3. **Paso 3 - Claves API e Integraciones:** Ingresa tu TMDB API Key (obligatoria) y proveedores opcionales. Pulsa **Probar Claves API** para validar las credenciales en vivo contra los servidores oficiales antes de avanzar.
4. **Paso 4 - Colección (Mini NUVIO):** Explora y edita las secciones (Recomendados, Estrenos, Películas Populares, Series, Anime, Géneros y Plataformas de Streaming).
5. **Paso 5 - Inyección y Seguridad:** Define la contraseña maestra para proteger tu instancia de AIOMetadata y ejecuta la inyección automatizada en la nube de Nuvio (o copia los JSONs de Colecciones y Metadata en Modo Manual).

---

## 🔑 Proveedores de Metadatos Soportados

| Proveedor | Estado | Propósito | Enlace de Registro |
| :--- | :---: | :--- | :--- |
| **TheMovieDatabase (TMDB)** | **Obligatoria** | Metadatos en español latino, pósters, sinopsis y reparto. | [themoviedb.org](https://www.themoviedb.org/settings/api) |
| **TheTVDB** | Opcional | Identificación y carátulas de series de televisión. | [thetvdb.com](https://thetvdb.com/dashboard/account/apikeys) |
| **MDBList** | Opcional | Calificaciones críticas (IMDb, Rotten Tomatoes, Metacritic). | [mdblist.com](https://mdblist.com/preferences/) |
| **RPDB (Rating Poster DB)** | Opcional | Pósters cinematográficos con calificaciones incrustadas. | [ratingposterdb.com](https://ratingposterdb.com/) |
| **Fanart.tv** | Opcional | Logos en formato PNG transparente, fondos en HD y disco-arte. | [fanart.tv](https://fanart.tv/get-an-api-key/) |
| **Google Gemini** | Opcional | Motor de búsqueda semántica con Inteligencia Artificial. | [aistudio.google.com](https://aistudio.google.com/app/apikey) |
| **OpenRouter** | Opcional | Modelos alternativos para búsqueda con Inteligencia Artificial. | [openrouter.ai](https://openrouter.ai/keys) |

---

## 🚀 Guía de Inicio Rápido

### Opción A: Uso Directo en la Web (GitHub Pages)
Puedes utilizar el asistente sin instalar nada directamente desde la versión alojada en GitHub Pages:
👉 **[https://svein05.github.io/NuvioLatinoSetup/](https://svein05.github.io/NuvioLatinoSetup/)**

### Opción B: Ejecución Local
Si deseas clonar el repositorio y ejecutarlo en tu propio entorno:

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/Svein05/NuvioLatinoSetup.git
   cd NuvioLatinoSetup
   ```

2. **Iniciar el servidor local:**
   Puedes utilizar el script incluido en Python:
   ```bash
   python run.py
   ```
   *El servidor se iniciará en `http://localhost:8080` y abrirá automáticamente tu navegador predeterminado con recarga sin caché.*

   Alternativamente, puedes usar cualquier servidor estático (como `npx serve`, Live Server de VS Code, o `python -m http.server 8080`).

---

---

## 📂 Estructura del Repositorio y Arquitectura Multi-Página

El proyecto está organizado en páginas modulares siguiendo las mejores prácticas de la web moderna:

* **`/` (o `/home`):** Landing page y presentación visual de la herramienta (cero dependencias de carga pesada).
* **`/configuration/`:** Asistente interactivo guiado en 5 pasos con simulador visual Mini Nuvio y CRUD en tiempo real.
* **`/documentation/`:** Portal de documentación exhaustiva, tutoriales paso a paso y resolución de incidencias.

```
NuvioLatinoSetup/
├── index.html                  # Landing Page / Home de Presentación
├── home/
│   └── index.html              # Alias / Redirección canónica a /
├── configuration/
│   └── index.html              # Asistente de Configuración en 5 Pasos
├── documentation/
│   └── index.html              # Portal de Documentación y Guías
├── assets/
│   ├── collections/            # 100 imágenes locales optimizadas (carátulas, backdrops y logos)
│   ├── logo/                   # Logotipos de la aplicación
│   └── preview/                # Capturas de pantalla e incrustación para Discord
├── css/
│   └── styles.css              # Estilos personalizados, animaciones y soporte para glassmorphism
├── js/
│   ├── aiometadata-client.js   # Cliente HTTP para la API de AIOMetadata
│   ├── app.js                  # Controlador principal de la UI, modales y navegación
│   ├── config.js               # Constantes públicas y endpoints de servicios
│   ├── injector.js             # Orquestador del pipeline de aprovisionamiento en 5 fases
│   ├── mini-nuvio.js           # Componente del simulador visual y editor CRUD de colecciones
│   ├── nuvio-client.js         # Cliente para Supabase Nuvio RPCs
│   ├── state.js                # Gestor del estado reactivo global del asistente
│   └── tmdb-service.js         # Servicio de consultas en tiempo real a la API v3 de TMDB
├── scripts/
│   ├── download_assets.py      # Script de descarga y caché de recursos gráficos locales
│   ├── fix_genres_and_tags.py  # Normalizador de etiquetas y formato landscape
│   ├── merge_collections.py    # Generador y validador de colecciones consolidadas
│   └── merge_metadata.py       # Optimizador del catálogo de AIOMetadata
├── templates/
│   ├── MetadataLatino.json     # Plantilla maestra de AIOMetadata (356 catálogos etiquetados)
│   └── NuvioCollections.json   # Plantilla unificada de colecciones nativas Nuvio
├── run.py                      # Servidor HTTP local con soporte UTF-8 y auto-apertura
└── README.md                   # Documentación técnica del proyecto
```

---

## 🤝 Créditos y Comunidad

Este proyecto es impulsado por el esfuerzo conjunto de la comunidad latina de streaming:
- **Colección en Español Completa (DonPuercoTroll):** Especial agradecimiento a **DonPuercoTroll** por su curaduría comunitaria de colecciones en español. Puedes explorar su colección oficial en [Nuvio TV Community Collections](https://nuvio.tv/community-collections/colecci-n-en-espa-ol-completa-creada-por-donpuercotroll).
- **Discord Oficial:** Únete a nuestra comunidad para asistencia técnica y feedback en [discord.gg/EubYtJVJEc](https://discord.gg/EubYtJVJEc).
- **Addon Recomendado:** Te sugerimos complementar esta configuración con el addon **LAT-ADD**, especialmente optimizado para la comunidad latina.

---

## 📄 Licencia

Este proyecto está bajo la Licencia **MIT**. Consulta el archivo [LICENSE](LICENSE) para más detalles.

---

<p align="center">
  Hecho con ❤️ para la comunidad de streaming en Español Latino.
</p>

