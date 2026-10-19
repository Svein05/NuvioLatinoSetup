<p align="center">
  <img src="assets/preview/incrustacion.png" alt="Nuvio Metadata Latino" width="100%" />
</p>

<p align="center">
  <a href="https://github.com/Svein05/NuvioLatinoSetup/releases"><img src="https://img.shields.io/badge/Version-v1.8.0-ffd479.svg?style=flat-square&labelColor=1a1b23" alt="Versión 1.8.0" /></a>
  <a href="https://github.com/Svein05/NuvioLatinoSetup/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square" alt="Licencia MIT" /></a>
  <img src="https://img.shields.io/badge/JavaScript-ES6%20Modules-yellow.svg?style=flat-square" alt="ES6 Modules" />
  <img src="https://img.shields.io/badge/TailwindCSS-Build-38bdf8.svg?style=flat-square" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Architecture-Static%20MPA-emerald.svg?style=flat-square" alt="Static MPA" />
  <a href="https://discord.gg/EubYtJVJEc"><img src="https://img.shields.io/badge/Discord-Comunidad%20Latina-5865F2.svg?style=flat-square&logo=discord&logoColor=white" alt="Discord" /></a>
</p>

---

## Descripción General

**Nuvio Metadata Latino Setup** es un entorno web diseñado para aprovisionar y estructurar colecciones multimedia en la plataforma **Nuvio**, integrando catálogos curados en español latino (`es-MX`) mediante la sincronización coordinada con **AIOMetadata**, **The Movie Database (TMDB)** y las llamadas a procedimiento remoto (RPC) de **Nuvio Cloud**.

El asistente permite configurar un perfil limpio, prescindiendo de configuraciones manuales propensas a errores de formato o saturación de interfaces en Smart TVs y dispositivos móviles.

---

## Star History

<a href="https://www.star-history.com/?repos=svein05%2Fnuviolatinosetup&type=date&releases=&legend=bottom-right">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/chart?repos=svein05/nuviolatinosetup&type=date&theme=dark&legend=bottom-right" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/chart?repos=svein05/nuviolatinosetup&type=date&legend=bottom-right" />
   <img alt="Star History Chart" src="https://api.star-history.com/chart?repos=svein05/nuviolatinosetup&type=date&legend=bottom-right" />
 </picture>
</a>

---

## Arquitectura y Principios de Diseño

### Organización Visual sin Saturación (Ghost Mode)
La instalación estándar de catálogos masivos suele poblar la pantalla principal con docenas de filas redundantes. Este asistente aplica la arquitectura **Ghost Mode**:
- Los catálogos raíz de AIOMetadata se configuran de forma invisible para la pantalla de inicio (`showInHome: false`).
- La navegación principal queda administrada exclusivamente por **Colecciones Nativas** de Nuvio, organizadas en carruseles apaisados (`LANDSCAPE` 16:9) con carátulas optimizadas.

### Sistema de Diseño Latino y Rendimiento
- **Tipografía y Estilo:** Basado en Instrument Serif e Instrument Sans sobre una paleta oscura OLED con efecto de vidrio esmerilado (*glassmorphism*).
- **Cero Dependencias de Servidor:** Aplicación multipágina en JavaScript ES6 vanilla, compilada con Vite para despliegue estático. Las integraciones privadas se trasladarán al Cloudflare Worker.
- **Simulador Interactivo a 0 ms:** La previsualización de colecciones (Mini Nuvio) renderiza en tiempo real utilizando la caché en memoria del manifiesto local, eliminando llamadas de red innecesarias.

---

## Capacidades del Sistema

- **Flujo Secuencial en Siete Pasos:** Validación reactiva de credenciales y parámetros de configuración antes de permitir el avance a etapas posteriores.
- **Soporte Dual de Aprovisionamiento:**
  - **Modo Nuvio Cloud:** Autenticación directa y configuración automatizada del perfil en la nube de Nuvio mediante Supabase Auth y llamadas PostgREST.
  - **Modo Manual:** Generación y descarga directa de los archivos `NuvioCollections.json` y `MetadataLatino.json` para usuarios que prefieren no ingresar credenciales.
- **Gestión Avanzada de Perfiles:**
  - Creación, selección e inspección de perfiles con advertencias visuales contextuales claras.
  - Control de cuota seguro limitado a un máximo de 6 perfiles por cuenta con modal para eliminar perfiles y liberar espacio.
  - Anclaje automático de **AIOMetadata** en posición #1 y preservación intacta de complementos de streaming preexistentes.
- **Sincronización de Proveedores y Metadatos:**
  - Integración obligatoria de **TMDB** para sinopsis, carátulas y reparto localizado en `es-MX`.
  - Integración de **MDBList** para calificaciones críticas globales (IMDb, Rotten Tomatoes, Metacritic y Trakt).
  - Compatibilidad opcional con claves de **RPDB**, **TheTVDB**, y motores de búsqueda semántica mediante **Google Gemini** u **OpenRouter**.
- **Motores de Carátulas Cinematográficas:**
  - Selección entre **AioMetadata** (nativo TMDB), **BetterPoster** (minimalista con logotipos en español) y **Poster+** (calificaciones ponderadas y estética de cine), con previsualización sincronizada en proporción 2:3.
- **Gestor Visual de Addons:**
  - Reordenamiento visual (▲ / ▼), adición mediante enlaces manifest URL y eliminación selectiva de addons de streaming (AIOStreams, ADD-LAT, Torbox, Torrentio, CineTorrent) manteniendo AIOMetadata anclado en la cabecera.
- **Pestaña y Gestor Integral de Cuenta y Perfil (/account):**
  - Panel autónomo para administrar perfiles en vivo de Nuvio sin reiniciar el asistente: métricas de sincronización en tiempo real, catálogo de avatares estilo Netflix optimizado al 100% en WebP (-85% en peso), módulo comunitario de sugerencias de avatares con despacho automatizado vía Discord Webhook y previsualización interactiva, gestor de addons con arrastre físico SortableJS FLIP y botón Deshacer (Undo) paso a paso, editor in-place de AIOMetadata vinculado y ajuste de credenciales TMDB/MDBList.

---

## Flujo de Configuración en Siete Pasos

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
[ Paso 6: Gestor de Addons del Perfil ]
                      │
                      ▼
[ Paso 7: Clave Maestra e Inyección Automatizada ]
```

1. **Autenticación Nuvio:** Conexión con credenciales existentes, registro de nuevas cuentas o selección del modo sin cuenta.
2. **Selección de Perfil:** Selección del perfil objetivo o creación de uno nuevo, con avisos informativos sobre la actualización o instalación de AIOMetadata.
3. **Organización en Mini Nuvio:** Reordenamiento de colecciones, activación de plataformas y categorías, y ajuste de catálogos mediante cápsulas interactivas.
4. **Validación de API Keys:** Comprobación en vivo de conectividad y validez de las claves de TMDB y MDBList antes de desbloquear el aprovisionamiento.
5. **Preferencias y Pósters:** Configuración de enriquecimiento de sinopsis, calificaciones en pantalla, personalización de Fusion Badges y motor de carátulas preferido.
6. **Gestor de Addons:** Organización de la prioridad de los addons del perfil, anclando AIOMetadata en #1 y permitiendo ordenar, agregar o eliminar addons de streaming.
7. **Inyección Automatizada:** Asignación de contraseña de seguridad para AIOMetadata y ejecución del pipeline de inyección respetuosa en la cuenta de Nuvio (o exportación de archivos JSON en modo manual).

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
- Enlace oficial: [https://guia.lat-add.com/](https://guia.lat-add.com/)

### Ejecución Local

Requiere Node.js 24 o posterior; CI utiliza Node.js 24.

```bash
npm ci
npm run dev
```

Abrir la dirección indicada por Vite (normalmente `http://127.0.0.1:5173`).

### Compilación y verificaciones

```bash
npm run check
npx playwright install chromium
npm run test:e2e
npm run preview
```

La salida publicable es exclusivamente `dist/`. No servir la raíz del repositorio:
contiene fuentes, configuraciones y archivos locales que no son públicos.

## Estructura del Repositorio

- `src/pages/`: portada y páginas; conserva las URLs públicas actuales.
- `src/features/`: funcionalidades con modelos, datos, UI y pruebas propias.
- `src/integrations/`: adaptadores HTTP y contratos externos.
- `src/app/`: configuración y composición.
- `src/shared/`: componentes e infraestructura genéricos.
- `public/`: plantillas y recursos públicos copiados al build.
- `scripts/`: comprobaciones versionadas de arquitectura y build.
- `config/`: configuración de Vite, CSS, lint y pruebas; los comandos npm indican sus rutas.
- `tests/`: regresiones heredadas y recorridos de navegador.
- `assets/`, `js/` y `css/`: fuentes heredadas en migración, con límites de crecimiento.

Consultar [AGENTS.md](AGENTS.md) y el [plan de migración](docs/architecture/mega-refactor.md)
antes de ampliar la arquitectura. El Worker, las sesiones y los controladores
monolíticos todavía requieren migración; esta rama no constituye su refactorización completa.

---

## Créditos y Referencias

- **Colección en Español Completa:** Reconocimiento a **DonPuercoTroll** por su curaduría de colecciones en español disponible en [Nuvio TV Community Collections](https://nuvio.tv/community-collections/colecci-n-en-espa-ol-completa-creada-por-donpuercotroll).
- **Fusion Badges & Stream Badges:** Paquetes visuales de distintivos de streams diseñados por [kingsizew](https://github.com/kingsizew/badges) (Tinted, Default Colored, Colored Outline, Solid, White, Mono White y Black) para Nuvio TV, Mobile y Desktop.
- **AIOMetadata Addon:** Repositorio de código abierto desarrollado por [cedya77](https://github.com/cedya77/aiometadata).
- **Canal de Soporte y Comunidad:** Canal oficial de discusión técnica y asistencia en [discord.gg/EubYtJVJEc](https://discord.gg/EubYtJVJEc).

---

## Licencia

Este proyecto se distribuye bajo los términos de la Licencia MIT. Para mayor información, consulte el archivo [LICENSE](LICENSE).
