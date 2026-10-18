# Instrucciones de arquitectura y mantenimiento

Estas instrucciones se aplican a todo el repositorio. Antes de editar, leer este
archivo y cualquier `AGENTS.md` más cercano al archivo afectado. Las instrucciones
explícitas del usuario prevalecen. Una regla local puede concretar estos límites,
pero no relajarlos silenciosamente.

## 1. Estado del proyecto y alcance de los cambios

- La estructura siguiente es la arquitectura de destino acordada, parcialmente
  implementada. Consultar `docs/architecture/mega-refactor.md` para el avance real.
  El código heredado en `js/`, `css/` y `cloudflare-worker/` sigue en migración.
- No considerar la presencia de código heredado como autorización para copiar
  sus patrones. No afirmar que las herramientas, comandos o pruebas propuestas
  ya existen: comprobarlo en el repositorio.
- Migrar por responsabilidades y conservar las funciones y el diseño existentes,
  salvo correcciones o cambios solicitados. No hacer una reescritura incidental.
- Separar movimientos y extracciones de las correcciones funcionales en cambios
  revisables. No preservar deliberadamente errores conocidos como contrato.
- No crear capas, paquetes, frameworks ni directorios para crecimiento hipotético.
- No publicar, fusionar, rotar secretos ni modificar servicios reales por el solo
  hecho de realizar una refactorización.

## 2. Mapa de destino: dónde pertenece cada archivo

```text
src/
  app/                   # Composición, bootstrap, configuración pública y versión
  pages/                 # HTML y controladores específicos de cada página
    index.html           # Portada; no crear home/
    index.js
    configuration/       # index.html, index.js y steps/
    account/             # index.html, index.js y sections/
    documentation/       # Guía pública para usuarios
    modder/              # Pantalla de colaboradores
  workflows/             # Procesos que coordinan varias funcionalidades
  features/              # Comportamiento organizado por función del producto
    auth/
    profiles/
    addons/
    collections/
    metadata/
    posters/
    badges/
    avatars/
    completions/
    asset-manager/
  integrations/          # Adaptadores de protocolos y servicios externos
    nuvio/
    aiometadata/
    aiostreams/
    worker/
  shared/                # Infraestructura y componentes sin reglas del producto
    ui/
    http/
    storage/
    styles/
public/
  assets/                # Fuentes, marca, previews, colecciones y avatares
  templates/             # Plantillas públicas exportables
worker/
  src/                   # Backend: routes/, middleware/, services/, integrations/
  tests/
  wrangler.jsonc
tests/e2e/               # Pruebas de recorridos completos de navegador
scripts/                 # Herramientas reproducibles de desarrollo
docs/                    # Arquitectura, decisiones y desarrollo; no guía pública
```

- No añadir `apps/web/`, `services/worker/` ni una segunda carpeta `js/` paralela
  dentro de `src/`. No devolver las páginas fuente a la raíz.
- La ubicación fuente no define las URLs públicas. Conservar `/`, `/account/`,
  `/configuration/`, `/documentation/` y `/modder/` mediante la compilación.
- Eliminar el directorio heredado `home/` durante la migración. Si se conserva
  compatibilidad con `/home/`, resolverla como redirección de salida, no como página.
- Antes de mover assets, revisar URLs guardadas, plantillas, catálogo GitHub y
  rutas autorizadas del publicador. No romper enlaces por reorganizar el disco.
- `scripts/` y el Worker heredado están actualmente ignorados por Git. Ajustar
  reglas de seguimiento durante su migración; no dar por versionado un archivo
  solo porque exista localmente. Nunca incorporar secretos al hacerlo.

## 3. Cómo decidir y dividir una funcionalidad

1. Si conecta controles de una pantalla, pertenece a `pages/`.
2. Si coordina varias funciones y sus resultados, pertenece a `workflows/`.
3. Si expresa reglas, estado o UI específica del producto, pertenece a `features/`.
4. Si conoce endpoints, cabeceras o formatos externos, pertenece a `integrations/`.
5. Si es genérico y no conoce el producto, puede pertenecer a `shared/`.
6. Si contiene credenciales privadas o autoridad de publicación, debe ejecutarse
   en el Worker, nunca en el navegador.

Una función compleja puede dividirse así, sin crear carpetas vacías:

```text
features/addons/
  model/                 # Reglas puras, normalización y transformaciones
  application/           # Casos de uso de esta función, con adaptadores inyectados
  state/                 # Estado, acciones, selectores y revisiones del borrador
  data/                  # Constantes y catálogos específicos, sin efectos laterales
  ui/                    # Renderizado y eventos propios de addons
  tests/                 # Pruebas unitarias e integración de esta función
  index.js               # Interfaz pública explícita
```

- Una función pequeña empieza con archivos directamente en su carpeta. Añadir
  subcarpetas cuando existan responsabilidades distintas, no por plantilla.
- Mantener juntos los datos y las reglas de una función. No crear un `data/`
  global que acumule todos los catálogos del producto.
- Crear una nueva función si tiene reglas o estado propios y una interfaz que
  pueda explicarse en una frase. Una pestaña nueva no exige una función nueva.
- Compartir componentes cuando tienen el mismo comportamiento y contrato, no
  solo un aspecto parecido. Una abstracción debe resolver duplicación concreta.
- No usar `utils.js`, `helpers.js`, `common.js`, `manager.js` o `service.js` como
  contenedores genéricos. Nombrar archivos por su responsabilidad concreta.
- Usar nombres de archivo en `kebab-case`. Los pasos se llaman `auth.js`,
  `profiles.js`, `collections.js`, `api-keys.js`, etc.; no codificar su número.

## 4. Dependencias permitidas y prohibidas

- `app/` conecta adaptadores, sesiones y páginas. No contiene reglas de negocio.
- `pages/` consume workflows, interfaces públicas de features y shared.
- `workflows/` coordina features y usa adaptadores inyectados desde app.
- `features/` consume shared y sus propios archivos. No importa otra feature:
  pasar datos explícitos o coordinar la interacción mediante un workflow.
- `integrations/` consume shared y normaliza los contratos externos. No importa
  app, pages, workflows, estado de features ni componentes de UI.
- `shared/` no importa ninguna de las capas anteriores.
- `model/` y `data/` no acceden al DOM, red, storage, temporizadores ni estado global.
- El código del navegador no importa código privado del Worker, ni viceversa.
- No introducir ciclos. Los consumidores de una feature importan su `index.js`;
  los archivos internos usan imports directos para evitar ciclos por ese índice.
- Exportar nombres explícitos. No crear cadenas de `export *` ni índices globales
  que carguen todas las funciones para utilizar una sola.
- Estas reglas deben incorporarse al análisis automatizado al introducir las
  herramientas. Mientras no exista esa comprobación, revisar los imports manualmente.

## 5. Límites de tamaño: obligatorios para código nuevo y extraído

Contar líneas físicas, incluidos comentarios y blancos. El objetivo guía el diseño;
el máximo es un límite de entrega, no una meta que haya que alcanzar.

| Unidad | Objetivo | Máximo |
| --- | --- | --- |
| Módulo JavaScript de producción | 80–200 líneas | 300 líneas |
| Entrada de página o bootstrap | 30–100 líneas | 150 líneas |
| Función o método, incluida su firma | 10–30 líneas | 60 líneas |
| HTML fuente o plantilla parcial | 100–250 líneas | 350 líneas |
| Hoja de estilos por responsabilidad | 100–250 líneas | 350 líneas |
| Archivo de pruebas | 100–300 líneas | 400 líneas |

- Máximo tres niveles de anidación de control dentro de una función. Preferir
  cláusulas de salida y funciones con nombres que expliquen su intención.
- Máximo cuatro parámetros posicionales; para más opciones usar un objeto con
  campos documentados. No pasar un estado entero para leer dos propiedades.
- Si un archivo supera el objetivo, evaluar sus responsabilidades antes de
  ampliarlo. Si supera el máximo, dividir antes de entregar.
- Dividir por conceptos: transporte, normalización, reglas, estado, vista y
  coordinación. Prohibido dividir en `part1.js`, clases parciales o fragmentos
  numerados que sigan dependiendo de las mismas variables compartidas.
- No comprimir líneas, eliminar comentarios útiles ni esconder código en cadenas
  para cumplir los límites. Las plantillas extensas se separan en componentes o
  parciales compatibles con la compilación.
- Excepciones: archivos generados, dependencias externas copiadas y catálogos
  declarativos sin lógica. Identificar origen/generador; no mezclar lógica para
  aprovechar una excepción. Los documentos no están sujetos a límites de código.
- Una excepción adicional requiere justificación concreta en `docs/architecture/`
  con ruta, motivo y alternativa descartada. No justificar por comodidad o plazo.
- Los módulos heredados quedan temporalmente exceptuados por tamaño. No aumentar
  su tamaño neto: extraer la responsabilidad afectada o hacer una corrección local
  sin crecimiento neto y registrar la deuda. No exigir reescribir todo para un fix.

## 6. Arquitectura interna y calidad del código

- Mantener JavaScript modular. No introducir React, Redux, TypeScript ni otro
  framework sin una decisión explícita. Usar JSDoc para contratos compartidos.
- Cada módulo tiene una responsabilidad explicable. Cada función tiene entradas,
  salidas y efectos identificables. Inyectar red, storage y reloj cuando se necesiten.
- Mantener las transformaciones puras: no modificar parámetros de entrada ni
  objetos obtenidos de caché. No usar JSON stringify/parse como clonación universal.
- Separar DTOs externos y modelos internos mediante mappers de la integración.
  Validar respuestas en la frontera; evitar repartir variantes de esquema por la UI.
- Distinguir identificadores de cuenta, índice de perfil, UUID de perfil y addon.
  No intercambiarlos ni recurrir a coerciones ambiguas para seleccionar destinos.
- Cada estado mutable tiene un dueño. Exponer acciones y selectores; no permitir
  escrituras cruzadas sobre objetos exportados ni crear un estado global universal.
- Separar datos confirmados, borrador editable y estado visual. `dirty` refleja la
  diferencia real y no se limpia hasta confirmar el guardado correspondiente.
- No añadir clases, repositorios o factories sin un contrato o ciclo de vida que
  los justifique. Preferir funciones y composición a jerarquías de herencia.
- Conservar comentarios que expliquen decisiones, compatibilidad o restricciones.
  No añadir comentarios que repitan literalmente el código.

## 7. Red, errores, concurrencia y guardados

- Centralizar transporte HTTP: comprobar estado, validar respuesta y definir
  timeout, cancelación y errores estructurados con operación y causa.
- No usar `catch {}`, `.catch(() => null)` ni valores de éxito como respaldo de un
  error relevante. Los fallos no críticos se reportan como advertencias explícitas.
- Una lista vacía válida es distinta de una lectura fallida. Nunca usar una lectura
  fallida para calcular eliminaciones, reemplazos o sincronizaciones completas.
- Distinguir éxito, fallo y resultado desconocido. No reintentar automáticamente
  escrituras ambiguas que puedan duplicar recursos.
- Los respaldos deben responder a incompatibilidades reconocidas. No recorrer
  endpoints o instancias indiscriminadamente ante un 401, 403 o error de validación.
- Cada carga de perfil captura destino y revisión. Cancelar la anterior e ignorar
  resultados obsoletos, incluso si el transporte no permite cancelar.
- Cada guardado usa un snapshot estable. No mezclar cambios posteriores ni el
  estado de otro perfil; proteger edición y cambio de destino durante la operación.
- Informar resultados parciales por operación. Conservar pendientes los fallos y
  permitir reintento sin repetir lo ya confirmado. No simular rollback distribuido.
- Verificar operaciones destructivas. No declarar éxito si no se pudo determinar
  el resultado. No continuar con eliminaciones alternativas tras confirmar éxito.
- Una clave con formato plausible no está validada. Sin respuesta del proveedor,
  el resultado es no verificable, nunca `valid: true`.
- Una configuración AIOMetadata existente se identifica por instancia y UUID.
  No enviar su contraseña a un pool de instancias para encontrarla por tanteo.

## 8. UI, recursos y ciclo de vida

- Las vistas representan estado y emiten acciones. No escriben directamente a
  servicios externos ni duplican reglas existentes en model/application.
- No usar `window.appController`, eventos HTML inline ni variables globales para
  comunicar módulos. Registrar eventos y proporcionar funciones de limpieza.
- Al desmontar, liberar listeners, suscripciones, observers, intervalos, peticiones
  y URLs de objetos. No registrar eventos duplicados en cada renderizado.
- Usar `textContent`, propiedades y nodos para datos externos. Reservar `innerHTML`
  para marcado controlado; nunca interpolar texto, URLs o errores sin tratamiento
  adecuado al contexto. Validar protocolos de enlaces e imágenes.
- Conservar foco, etiquetas, teclado y estados de carga/error. Los modales deben
  administrar foco y cierre; respetar movimiento reducido en animaciones.
- No normalizar a minúsculas rutas o parámetros de URLs. Separar identidad del
  recurso, URL visible y URL de transporte.
- Mini Nuvio pertenece a collections. El odómetro genérico puede estar en shared;
  registrar completados y consultar su contador pertenecen a completions.
- Las clases CSS dinámicas deben ser compatibles con el compilador. Usar mapas
  explícitos o variables CSS; comprobar que el build conserve los estilos.

## 9. Seguridad y configuración

- Nunca publicar webhooks, tokens Redis, PATs GitHub ni contraseñas en bundles,
  plantillas, logs o configuración pública. Variables de build no son secretos
  cuando su valor termina enviado al navegador.
- Mantener esas operaciones en el Worker y validar allí permisos, payloads, rutas,
  tipos, tamaños y límites de uso. CORS no sustituye autenticación ni autorización.
- No enviar credenciales por proxies públicos ni incluir valores sensibles en
  mensajes de error. No introducir contraseñas predeterminadas para nuevas cuentas.
- No persistir contraseñas de Nuvio, AIOMetadata o colaboradores. La sesión guarda
  solo campos necesarios; centralizar expiración, renovación y limpieza al salir.
- El acceso compartido de colaboradores no acredita identidad individual. No
  omitir validaciones configuradas ni atribuir seguridad al correo autodeclarado.
- Mantener ejemplos de configuración sin valores reales. Revisar archivos locales
  ignorados antes de incorporarlos al seguimiento o a un artefacto de despliegue.

## 10. Pruebas, herramientas y condiciones de entrega

- Antes de modificar comportamiento complejo, añadir pruebas de sus invariantes
  y regresiones. Probar contratos observables, no la distribución interna de archivos.
- Pruebas de features junto a la función; pruebas de adaptadores junto a la
  integración; pruebas del backend en worker/tests; recorridos en tests/e2e.
- Simular dependencias externas. Las pruebas no deben modificar cuentas, publicar
  assets, enviar sugerencias ni consumir credenciales de producción.
- Cubrir éxito, error HTTP, red caída, respuesta inválida, cancelación, resultados
  parciales y cambio de perfil fuera de orden cuando apliquen.
- Añadir casos de conservación de addons, claves y ajustes ajenos a la edición.
  Los fixtures deben ser sintéticos y no contener información personal o secretos.
- Al introducir herramientas, usar build multipágina, análisis de dependencias,
  comprobación de tamaños y pruebas en CI. Publicar solo la salida pública del build.
- Instalar dependencias mediante el gestor acordado y versionar el lockfile. No
  actualizar paquetes ni sustituir tecnologías incidentalmente.
- No inventar scripts npm: leer package.json y ejecutar los comandos existentes.
  Si falta una verificación, indicarlo; no declarar que está cubierta por CI.
- Antes de entregar: revisar diff, imports, tamaño, ausencia de secretos, contratos,
  rutas públicas y pruebas relevantes. Para cambios visuales, verificar navegador.
- Documentar cambios de límites y contratos en docs/architecture. Mantener README,
  guía pública y configuración de despliegue coherentes con el comportamiento real.
- Informar qué cambió, qué se verificó y qué limitaciones quedan. No declarar
  terminada una migración mientras existan entradas activas que dependan del legado.
