<p align="center"><img src="assets/preview/incrustacion.png" alt="Nuvio Metadata Latino" width="100%" /></p>

# Nuvio Latino Setup

Organiza tus colecciones de Nuvio y configura AIOMetadata en español latino (`es-MX`).
Abre el [asistente web](https://guia.lat-add.com/) o consulta la
[guía de uso](https://guia.lat-add.com/documentation/).

## Qué puedes hacer

- Completar un asistente de siete pasos: conexión o modo manual, perfil,
  colecciones, claves API, apariencia, addons y configuración final.
- Organizar colecciones nativas con carátulas panorámicas. El «Ghost Mode» oculta
  las filas de inicio de los catálogos de AIOMetadata para dar protagonismo a tus colecciones.
- Elegir entre AioMetadata, BetterPoster y Poster+, y personalizar los badges de streams.
- Configurar automáticamente el perfil elegido o descargar
  `NuvioCollections_Latino.json` y `AIOMetadata_Latino.json` para importarlos manualmente.
- Crear y elegir perfiles dentro del límite de seis de Nuvio. Los identificadores
  de sus avatares internos se conservan aunque una imagen no pueda mostrarse.
- Consultar actividad, cambiar avatares, gestionar addons y editar preferencias
  desde Cuenta. Los addons permiten ordenar, editar, eliminar y abrir su configuración
  cuando el proveedor la ofrece.
- Explorar una portada animada con los pasos del asistente, una presentación de
  Cuenta, preguntas frecuentes y dos métricas: setups completos y avatares configurados.
- Disfrutar de un fondo compartido entre Inicio, Asistente y Cuenta con películas
  y series en tendencia de TMDB, actualizado semanalmente desde una caché compartida.
- Colaborar con el catálogo de avatares mediante el panel de colaboradores autorizado.

Las presentaciones de la portada son ilustrativas: no modifican perfiles ni aumentan
contadores. La disponibilidad y el rendimiento dependen del dispositivo, la red y
los servicios utilizados. El total de avatares cuenta usos registrados según sus
reglas de deduplicación; no representa personas únicas.

## Antes de comenzar

Necesitas las claves API de **TMDB y MDBList**; el asistente incluye los enlaces
para obtenerlas y valida ambas antes de continuar. La contraseña maestra del addon
AIOMetadata debe tener al menos seis caracteres.

Junto a «Obtener» de TMDB y MDBList encontrarás sus videos tutoriales con capítulos, pausa,
velocidad ajustable y pantalla completa para seguir el proceso desde el asistente.

Puedes iniciar sesión con Nuvio para configurar un perfil o usar el modo manual
sin conectar tu cuenta. El asistente coloca AIOMetadata primero en el orden de addons;
Cuenta también permite reorganizarlos explícitamente.

## Cómo se utilizan los servicios

El inicio de sesión envía tus credenciales directamente a `api.nuvio.tv` mediante
HTTPS. El navegador utiliza la sesión resultante para gestionar tu perfil.
El Worker verifica esa sesión cuando registras usos de avatares o envías sugerencias.
Las operaciones de metadatos y validación de claves utilizan sus respectivos proveedores.
El modo manual evita el inicio de sesión en Nuvio, pero sigue utilizando claves y
servicios de metadatos.

El frontend es una web estática multipágina compilada con Vite y JavaScript modular.
Un Cloudflare Worker independiente gestiona integraciones privadas, estadísticas,
el fondo semanal y la publicación de avatares. Las credenciales de Redis, GitHub,
TMDB del fondo y Discord permanecen en el Worker, fuera del código del navegador.

Producción tiene estadísticas separadas de local y testing. Cada ejecución exitosa
recibe un identificador: reintentar su registro no cuenta otro setup. Si falla el
contador, no se muestra un incremento ficticio. Consulta los contratos de
[métricas](worker/METRICS.md), [Worker](worker/README.md) y [fondo semanal](worker/POSTER-FEED.md).

## Ejecutar el proyecto

Requiere Node.js 24 o posterior; CI utiliza Node.js 24.

```sh
npm ci
npm run dev
```

Abre la dirección que indique Vite, normalmente `http://127.0.0.1:5173`.
Para compilar y revisar el resultado:

```sh
npm run build
npm run preview
```

Publica únicamente `dist/`, nunca la raíz del repositorio. GitHub Pages despliega
el frontend desde `main`; el entorno de testing y el Worker se publican por separado.
La versión pública procede de `version.json`. Los cambios están en [CHANGELOG.md](CHANGELOG.md).
Las mejoras previstas están en el [roadmap de la Wiki](https://github.com/Svein05/NuvioLatinoSetup/wiki/Roadmap).

## Buscadores y estadísticas de visitas

El build de producción genera `robots.txt` y `sitemap.xml`, títulos y descripciones
por página, URLs canónicas, metadatos para compartir y datos estructurados del sitio.
Inicio y Documentación pueden indexarse; Cuenta, Colaboradores y el asistente usan
`noindex`. La página 404 ofrece enlaces para continuar navegando.

El workflow de GitHub Pages establece explícitamente `SITE_ENV=production`.
Los builds normales, local y testing usan `noindex` y no generan un sitemap indexable.
Para revisar un build de producción en PowerShell:

```powershell
$env:SITE_ENV = 'production'
npm run build
Remove-Item Env:SITE_ENV
npm run preview
```

Cloudflare Web Analytics se carga únicamente en Inicio y Documentación del dominio
de producción, evita duplicar un beacon existente y omite URLs con parámetros o
fragmentos. No añadimos datos de formularios, sesiones, claves ni perfiles a la
analítica. Los contadores de setups y avatares son independientes de las visitas.

Tras publicar, verifica `https://guia.lat-add.com/` como propiedad de prefijo de URL
en Google Search Console mediante la etiqueta HTML incluida. Envía
`https://guia.lat-add.com/sitemap.xml` y revisa Inicio y Documentación con Inspección
de URLs. Estas medidas facilitan el rastreo, pero no garantizan indexación ni posición.
Comprueba también que el dominio entregue el sitemap y que Cloudflare conserve su
referencia en `robots.txt`; las reglas del dominio pueden modificar la respuesta.

## Comprobaciones

```sh
npm run check
npx playwright install chromium
npm run test:e2e
npm run test:e2e:dev
```

`check` ejecuta lint, reglas de arquitectura, pruebas lógicas y build. Los recorridos
de navegador usan respuestas simuladas: no acreditan credenciales reales, disponibilidad
de proveedores ni el comportamiento de un teléfono físico. Las pruebas del Worker
no publican avatares ni envían mensajes reales.

## Organización del código

| Carpeta | Responsabilidad |
| --- | --- |
| `src/app/` | Entradas y composición de dependencias y estilos |
| `src/pages/` | Controladores, vistas y parciales HTML de cada página |
| `src/workflows/` | Operaciones que coordinan funcionalidades e integraciones |
| `src/features/` | Modelos, datos, servicios de aplicación e interfaces del producto |
| `src/integrations/` | Adaptadores HTTP y contratos con servicios externos |
| `src/shared/` | Infraestructura y componentes compartidos |
| `assets/` | Recursos canónicos, incluido el catálogo de avatares |
| `public/` | Plantillas y archivos públicos que se copian al build |
| `worker/` | Backend, configuración y contratos sin secretos |
| `scripts/`, `config/`, `tests/` | Herramientas, configuración y comprobaciones |

Los parciales `@include` se ensamblan al compilar. Se conservan las rutas `/`,
`/configuration/`, `/account/`, `/documentation/` y `/modder/`.
Los modelos no acceden al DOM, la red ni el almacenamiento; reciben sus dependencias
mediante composición. Las reglas de arquitectura comprueban dependencias, ciclos,
complejidad y límites de tamaño.

Los colaboradores pueden actualizar los avatares de `main` independientemente de
una versión de la web. Al integrar esos cambios, conserva rutas y archivos originales.
Ejecuta `node scripts/generate-avatar-manifest.js` para actualizar el catálogo incluido;
su fecha procede de `version.json`. La actualización del catálogo remoto es independiente.

## Créditos

- [Nuvio](https://nuvio.tv/) y su comunidad.
- **DonPuercoTroll**, por la [colección en español](https://nuvio.tv/community-collections/colecci-n-en-espa-ol-completa-creada-por-donpuercotroll).
- [kingsizew](https://github.com/kingsizew/badges), por los paquetes de badges.
- [cedya77](https://github.com/cedya77/aiometadata), por AIOMetadata.
- **Holy** y los colaboradores de la colección de avatares.
- [TMDB](https://www.themoviedb.org/): este producto utiliza la API de TMDB, pero no está respaldado ni certificado por TMDB.
- [Comunidad latina y soporte](https://discord.gg/EubYtJVJEc).

## Historial de estrellas

<a href="https://www.star-history.com/?repos=svein05%2Fnuviolatinosetup&type=date&releases=&legend=bottom-right">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/chart?repos=svein05/nuviolatinosetup&type=date&theme=dark&legend=bottom-right" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/chart?repos=svein05/nuviolatinosetup&type=date&legend=bottom-right" />
   <img alt="Historial de estrellas" src="https://api.star-history.com/chart?repos=svein05/nuviolatinosetup&type=date&legend=bottom-right" />
 </picture>
</a>

## Licencia

[MIT](LICENSE), Svein05. Los proyectos y recursos de terceros conservan sus respectivos derechos.
