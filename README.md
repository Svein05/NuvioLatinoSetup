<p align="center">
  <img src="assets/preview/incrustacion.png" alt="Nuvio Metadata Latino" width="100%" />
</p>

<p align="center">
  <a href="https://github.com/Svein05/NuvioLatinoSetup/releases"><img src="https://img.shields.io/badge/Version-v1.4.0-ffd479.svg?style=flat-square&labelColor=1a1b23" alt="Versión 1.4.0" /></a>
  <a href="https://github.com/Svein05/NuvioLatinoSetup/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square" alt="Licencia MIT" /></a>
  <img src="https://img.shields.io/badge/JavaScript-ES6%20Modules-yellow.svg?style=flat-square" alt="ES6 Modules" />
  <img src="https://img.shields.io/badge/TailwindCSS-CDN-38bdf8.svg?style=flat-square" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Architecture-100%25%20Static%20SPA-emerald.svg?style=flat-square" alt="Static SPA" />
  <a href="https://discord.gg/EubYtJVJEc"><img src="https://img.shields.io/badge/Discord-Comunidad%20Latina-5865F2.svg?style=flat-square&logo=discord&logoColor=white" alt="Discord" /></a>
</p>

---

## Descripción General

**Nuvio Metadata Latino Setup** es un entorno web diseñado para aprovisionar y estructurar colecciones multimedia en la plataforma **Nuvio**, integrando catálogos curados en español latino (`es-MX`) mediante la sincronización coordinada con **AIOMetadata**, **The Movie Database (TMDB)** y las llamadas a procedimiento remoto (RPC) de **Nuvio Cloud**.

El asistente permite configurar un perfil limpio, prescindiendo de configuraciones manuales propensas a errores de formato o saturación de interfaces en Smart TVs y dispositivos móviles.

---

## Arquitectura y Principios de Diseño

### Organización Visual sin Saturación (Ghost Mode)
La instalación estándar de catálogos masivos suele poblar la pantalla principal con docenas de filas redundantes. Este asistente aplica la arquitectura **Ghost Mode**:
- Los catálogos raíz de AIOMetadata se configuran de forma invisible para la pantalla de inicio (`showInHome: false`).
- La navegación principal queda administrada exclusivamente por **Colecciones Nativas** de Nuvio, organizadas en carruseles apaisados (`LANDSCAPE` 16:9) con carátulas optimizadas.

### Sistema de Diseño Latino y Rendimiento
- **Tipografía y Estilo:** Basado en Instrument Serif e Instrument Sans sobre una paleta oscura OLED con efecto de vidrio esmerilado (*glassmorphism*).
- **Cero Dependencias de Servidor:** Arquitectura Single Page Application (SPA) en JavaScript ES6 vanilla, compatible con despliegues estáticos y ejecución local sin compiladores intermedios.
- **Simulador Interactivo a 0 ms:** La previsualización de colecciones (Mini Nuvio) renderiza en tiempo real utilizando la caché en memoria del manifiesto local, eliminando llamadas de red innecesarias.

---

## Capacidades del Sistema

- **Flujo Secuencial en Seis Pasos:** Validación reactiva de credenciales y parámetros de configuración antes de permitir el avance a etapas posteriores.
- **Soporte Dual de Aprovisionamiento:**
  - **Modo Nuvio Cloud:** Autenticación directa y configuración automatizada del perfil en la nube de Nuvio mediante Supabase Auth y llamadas PostgREST.
  - **Modo Manual:** Generación y descarga directa de los archivos `NuvioCollections.json` y `MetadataLatino.json` para usuarios que prefieren no ingresar credenciales.
- **Gestión Avanzada de Perfiles:**
  - Creación, selección e inspección de perfiles con advertencias visuales de sobreescritura.
  - Control de cuota seguro limitado a un máximo de 6 perfiles por cuenta.
  - Purga automática de complementos predeterminados obsoletos (*nuvio catalog addon* y *opensubtitles*).
- **Sincronización de Proveedores y Metadatos:**
  - Integración obligatoria de **TMDB** para sinopsis, carátulas y reparto localizado en `es-MX`.
  - Integración de **MDBList** para calificaciones críticas globales (IMDb, Rotten Tomatoes, Metacritic y Trakt).
  - Compatibilidad opcional con claves de **RPDB**, **TheTVDB**, y motores de búsqueda semántica mediante **Google Gemini** u **OpenRouter**.
- **Motores de Carátulas Cinematográficas:**
  - Selección entre **AioMetadata** (nativo TMDB), **BetterPoster** (minimalista con logotipos en español) y **Poster+** (calificaciones ponderadas y estética de cine), con previsualización sincronizada en proporción 2:3.

---

## Flujo de Configuración en Seis Pasos

```
[ Paso 1: Autenticación Nuvio / Modo Manual ]
                      │
                      ▼
[ Paso 2: Selección o Creación de Perfil ] (Omitido en Modo Manual)
                      │
                      ▼
[ Paso 3: Organización Visual en Mini Nuvio ]
                      │
                      ▼
[ Paso 4: Configuración y Comprobación de API Keys ]
                      │
                      ▼
[ Paso 5: Preferencias de Perfil y Motor de Pósters ]
                      │
                      ▼
[ Paso 6: Clave Maestra e Inyección Automatizada ]
```

1. **Autenticación Nuvio:** Conexión con credenciales existentes, registro de nuevas cuentas o selección del modo sin cuenta.
2. **Selección de Perfil:** Selección del perfil objetivo o creación de uno nuevo para aislar la configuración.
3. **Organización en Mini Nuvio:** Reordenamiento de colecciones, activación de plataformas y categorías, y ajuste de catálogos mediante cápsulas interactivas.
4. **Validación de API Keys:** Comprobación en vivo de conectividad y validez de las claves de TMDB y MDBList antes de desbloquear el aprovisionamiento.
5. **Preferencias y Pósters:** Configuración de enriquecimiento de sinopsis, calificaciones en pantalla y selección del motor de carátulas preferido.
6. **Inyección Automatizada:** Asignación de contraseña de seguridad para AIOMetadata y ejecución del pipeline de inyección en la cuenta de Nuvio (o exportación de archivos JSON en modo manual).

---

## Proveedores de Metadatos e Integraciones

| Proveedor | Condición | Función Principal | Enlace Oficial |
| :--- | :---: | :--- | :--- |
| **TheMovieDatabase (TMDB)** | Obligatoria | Sinopsis oficiales en español latino, metadatos y carátulas. | [themoviedb.org](https://www.themoviedb.org/settings/api) |
| **MDBList** | Obligatoria | Puntuaciones críticas agregadas y soporte de motores de pósters. | [mdblist.com](https://mdblist.com/preferences/) |
| **RPDB (Rating Poster DB)** | Opcional | Incrustación de valoraciones numéricas en carátulas. | [ratingposterdb.com](https://ratingposterdb.com/) |
| **TheTVDB** | Opcional | Soporte extendido para series y fichas televisivas. | [thetvdb.com](https://thetvdb.com/dashboard/account/apikeys) |
| **Google Gemini** | Opcional | Consultas y búsqueda semántica con modelos de lenguaje. | [aistudio.google.com](https://aistudio.google.com/app/apikey) |
| **OpenRouter** | Opcional | Enrutamiento de modelos de inteligencia artificial complementarios. | [openrouter.ai](https://openrouter.ai/keys) |

---

## Despliegue y Ejecución

### Acceso Web Directo
La aplicación se encuentra desplegada como sitio estático sin requerimientos de instalación local:
- Enlace oficial: [https://svein05.github.io/NuvioLatinoSetup/](https://svein05.github.io/NuvioLatinoSetup/)

### Ejecución Local
Para ejecutar el proyecto en un entorno local:

1. Clonar el repositorio:
   ```bash
   git clone https://github.com/Svein05/NuvioLatinoSetup.git
   cd NuvioLatinoSetup
   ```

2. Servir los archivos mediante cualquier servidor HTTP estático:
   ```bash
   python -m http.server 8080
   ```
   O bien mediante Node.js:
   ```bash
   npx serve .
   ```
3. Acceder desde el navegador a `http://localhost:8080`.

---

## Estructura del Repositorio

```
NuvioLatinoSetup/
├── index.html                  # Portada y presentación general
├── configuration/
│   └── index.html              # Asistente de configuración en 6 pasos
├── documentation/
│   └── index.html              # Documentación técnica y guías de uso
├── assets/
│   ├── collections/            # Recursos gráficos locales de colecciones
│   ├── fonts/                  # Fuentes tipográficas Instrument Sans y Serif
│   ├── logo/                   # Identidad visual y logotipos
│   └── preview/                # Imágenes de muestra e incrustación
├── css/
│   └── styles.css              # Sistema de diseño, temas y utilidades
├── js/
│   ├── vendor/                 # Bibliotecas externas (SortableJS)
│   ├── aiometadata-client.js   # Comunicación con la API de AIOMetadata
│   ├── app.js                  # Controlador principal del asistente
│   ├── config.js               # Parámetros y constantes de versión
│   ├── injector.js             # Pipeline de aprovisionamiento de perfiles
│   ├── mini-nuvio.js           # Simulador visual interactivo
│   ├── nav-indicator.js        # Indicador deslizante de barra flotante
│   ├── nuvio-client.js         # Cliente para las APIs de Nuvio
│   ├── state.js                # Gestión reactiva del estado de la aplicación
│   └── version.js              # Sincronización de badges de versión
├── templates/
│   ├── MetadataLatino.json     # Plantilla base de catálogos AIOMetadata
│   └── NuvioCollections.json   # Definición de colecciones nativas de Nuvio
├── version.json                # Registro central de versión semántica
└── README.md                   # Documentación principal del repositorio
```

---

## Créditos y Referencias

- **Colección en Español Completa:** Reconocimiento a **DonPuercoTroll** por su curaduría de colecciones en español disponible en [Nuvio TV Community Collections](https://nuvio.tv/community-collections/colecci-n-en-espa-ol-completa-creada-por-donpuercotroll).
- **AIOMetadata Addon:** Repositorio de código abierto desarrollado por [cedya77](https://github.com/cedya77/aiometadata).
- **Canal de Soporte y Comunidad:** Canal oficial de discusión técnica y asistencia en [discord.gg/EubYtJVJEc](https://discord.gg/EubYtJVJEc).

---

## Licencia

Este proyecto se distribuye bajo los términos de la Licencia MIT. Para mayor información, consulte el archivo [LICENSE](LICENSE).
