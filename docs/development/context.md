# Contexto compartido y roadmap de Nuvio Setup

Fuente única de contexto del proyecto para contribuidores, Codex, Gemini y otras
IAs. Actualizar este archivo al cerrar una etapa; no crear resúmenes paralelos
por chat, checkpoints ni otros archivos de memoria dentro del repositorio.
No incluir credenciales, datos personales, conversaciones o registros de herramientas.
Los documentos de contratos técnicos y los tests no son archivos de memoria.

## Instrucción primordial de arquitectura

La versión pública tiene una sola fuente: version.json. La composición de
configuración importa su versión y las plantillas de cabecera/footer la insertan
al servir o compilar. Tras cambiarla, recompilar y publicar para producción.

**Migrar por responsabilidades y contratos observables, no por mover archivos ni
por recortar líneas. Conservar comportamiento, datos y diseño; probar antes y
después, separar UI, estado, reglas e integraciones y eliminar el legado solo
cuando ya no tenga consumidores. No declarar completa una migración parcial.**

## Metodología Git Flow obligatoria

<!-- git-flow:start -->
- `main`/`master` contiene producción estable. Nunca hacer commits de trabajo
  ni push directos a esas ramas. Un merge o despliegue a producción requiere
  aprobación explícita del usuario para esa acción.
- `develop` es integración. **Nunca fusionar a develop sin la orden o confirmación
  explícita del usuario**, aunque todas las pruebas automáticas pasen.
- Trabajar en subramas aisladas: `feature/<nombre>`, `bugfix/<nombre>` y
  `refactor/<nombre>` nacen de develop. `hotfix/<nombre>` puede nacer de main
  únicamente para una urgencia de producción solicitada explícitamente.
- Antes de crear una rama, comprobar estado y conservar cambios ajenos. Actualizar
  develop desde su remoto cuando exista y sea seguro; no asumir que hay remoto.
- Si ya hay una subrama autorizada para la tarea, continuar en ella. La migración
  actual sigue en `codex/mega-refactor`, creada desde develop; no renombrarla ni
  abrir ramas de reparación por cada ajuste.
- Crear commits atómicos y semánticos: `feat:`, `fix:`, `refactor:`, `test:`,
  `docs:` o `chore:`. No mezclar extracciones con cambios funcionales evitables.
- Ejecutar las comprobaciones disponibles y pedir la validación del usuario en
  su entorno real cuando corresponda. TV, dispositivos, credenciales y proveedores
  reales no quedan verificados por fixtures sintéticos.
- Resolver feedback y regresiones en la misma subrama mediante nuevos commits.
  No darla por cerrada ni fusionarla prematuramente para continuar en otra.
- Solo tras la autorización expresa, integrar mediante un merge que preserve
  la trazabilidad, normalmente `--no-ff`. Autorizar develop no autoriza main.
- Publicar con push únicamente con autorización para esa publicación y si existe
  un remoto configurado. No crear remotos ni interpretar la solicitud de refactor
  como autorización para publicar. Un push de main tras un merge autorizado
  requiere también permiso de publicación; no es un push directo de trabajo.
- No eliminar subramas locales/remotas salvo petición explícita del usuario.
  No reescribir ni forzar el historial para ocultar etapas o errores.
<!-- git-flow:end -->

## Estado real: por qué existe todavía js/

Arranque del asistente: comprobar readyState antes de esperar DOMContentLoaded.
Una importación tardía o recarga del módulo en desarrollo puede llegar después
del evento y dejar wizardView permanentemente inert sin registrar sus eventos.
La utilidad whenDocumentReady cubre ambos momentos de carga.

Rama de trabajo: `codex/mega-refactor`; base develop, commit `268df02`.
La refactorización está **parcialmente implementada**. La existencia de `src/`
no sustituye automáticamente los módulos antiguos: las páginas aún los importan.
Ejemplos comprobados:

- `src/pages/configuration/index.html` carga `js/app.js`.
- `src/pages/account/index.html` carga `js/account-manager.js`.
- `src/pages/modder/partials/script.html` importa `js/modder-uploader.js`.
- Contador, versión y estrellas de GitHub ya se componen desde src/app.

`app.js` todavía coordina perfiles, preferencias, badges, pósters, addons,
ejecución y renderizado del asistente. Solo algunas responsabilidades se han
extraído y conectado. Borrarlo o moverlo entero a src rompería la aplicación
o escondería la deuda sin resolverla. Las 3.702 líneas actuales no cumplen
el objetivo final; están acotadas temporalmente como legado, no aprobadas como diseño.

| Módulo activo | Líneas al registrar este roadmap | Destino de lo pendiente |
| --- | ---: | --- |
| `js/account-manager.js` | 4.163 | pages/account, workflows, features e integrations |
| `js/app.js` | 3.702 | pages/configuration/steps y composición app |
| `js/modder-uploader.js` | 2.209 | asset-manager, avatars, pages/modder e integración Worker |
| `js/mini-nuvio.js` | 1.299 | features/collections/ui |
| `js/state.js` | 675 | estado por feature y composición del asistente |

El inventario completo y los límites efectivos viven en
[`../architecture/legacy-baseline.json`](../architecture/legacy-baseline.json).
No aumentar esos límites; reducirlos después de cada extracción comprobada.
Los puentes pequeños que solo reexportan funciones tampoco justifican mantener
js/ para siempre: cambiar sus consumidores y retirarlos al completar la migración.

## Roadmap ejecutable y criterios de cierre

### Método de continuación: terminar archivos completos

- Por petición del usuario, elegir un archivo heredado y migrar todas sus
  responsabilidades antes de comenzar otro. Su tamaño no justifica solo moverlo.
- Fijar contratos con pruebas, trasladar responsabilidades a sus capas definitivas,
  actualizar todos los consumidores y comprobar que no quedan imports antiguos.
- Eliminar el archivo de js/ y su entrada en baseline; no dejar una reexportación
  de compatibilidad como sustituto de su cierre. Ajustar consumidores es parte
  de completar ese archivo, aunque estén todavía en el legado.
- Validar y guardar un commit revisable por archivo terminado. Las siguientes
  unidades se eligen según dependencias; los controladores grandes siguen
  pendientes hasta migrar todas sus responsabilidades.

### Archivos cerrados durante esta continuación

- `js/nuvio-client.js` eliminado: todas sus responsabilidades migradas a src/integrations/nuvio/:
  colecciones en collections.js, credenciales de proveedores en provider-credentials.js,
  lectura de ajustes en profile-settings-read.js, plugins en plugins.js, addons en
  addons-read.js, addons-write.js y addons-sync.js, ensamblados en client.js.
  Consumidores actualizados (account-manager, app y tests de regresión).
  63 suites de test pasando (565 tests en verde) con cobertura exhaustiva de RPC y REST fallbacks.
- `js/injector.js` eliminado: orquestación desacoplada en workflows/provision-profile.js
  dividida en pasos atómicos de única responsabilidad (< 60 líneas por función, max-depth <= 3):
  aiometadata-step, auth-step, settings-step, addons-step y collections-step.
  Descarga segura de blobs JSON en shared/ui/file-download.js y composición en app/provisioning.js.
  El código nuevo en src/ no importa nada de js/. Pruebas unitarias completas en vitest
  para cada paso, descargas y regresión de inyección.
- `js/avatar-suggestions.js` eliminado: validación y cooldown en features/avatars,
  modal dividido en vista/controlador/eventos, coordinación en workflows y
  cliente HTTP en integrations/worker, conectado por app/avatar-suggestions.js.
  Cuenta es su único punto de arranque; se retiró el segundo init del HTML.
- Conserva archivo/URL, preview, confirmación explícita, cooldown de 120 segundos,
  borrador URL al cerrar y reinicio del modo archivo. Escapa datos mediante nodos,
  valida HTTPS y límites, restaura foco/scroll, atrapa Tab y libera listeners,
  temporizadores y object URLs. Un envío activo bloquea cierre y edición.
- Los dos embeds Discord se compararon con el original; coinciden salvo la
  restricción explícita de menciones. El Worker arma el mensaje y mantiene el
  webhook privado; el navegador ya no carga ni consulta secretos locales.
- POST /api/avatars/suggestions verifica sesión Nuvio, limita/valida multipart,
  comprueba MIME/cabecera y reserva el envío en Redis. La reserva aplica espera
  por cuenta y deduplicación del requestId. Tras `wait=true` se exige un ID de
  mensaje. No hay reintentos automáticos; un resultado desconocido conserva el
  formulario y bloquea otro envío idéntico en esa instancia del workflow.
- La comprobación de fingerprint usa el contenido de archivo, no su nombre.
  Solo un envío confirmado activa el cooldown local. El Worker es la autoridad
  de deduplicación; Redis/Lua siguen probados con respuestas simuladas.
- Activación real PENDIENTE: configurar AVATAR_SUGGESTION_WEBHOOK_URL y los
  ajustes Redis/Nuvio ya indicados en worker/README.md, probar los servicios
  reales y autorizar el despliegue. No se tocó el Worker activo ni se enviaron
  mensajes de Discord reales. Sin estas rutas, el modal conserva los datos y
  muestra error; no anuncia envíos inexistentes.
- Cuatro recorridos verifican envío simulado URL/archivo, datos preservados ante
  fallo, foco/teclado y liberación de previews. El filtro de configuración privada
  del build ahora devuelve un módulo vacío sin exports heredados.
- `js/avatar-rank-client.js` eliminado: baseline, normalización y almacenamiento
  en features/avatars; coordinación en workflows/avatar-ranking.js; cliente HTTP
  en integrations/worker y composición en app/avatar-ranking.js. Cuenta consume
  las entradas nuevas. Dieciocho contratos de baseline/normalización coinciden
  con el original; conserva claves de caché y marcas de sesión.
- Redis ya no recibe peticiones ni lee credenciales desde el navegador. El Worker
  incorpora GET /api/avatars/ranking y POST /api/avatars/usage, verificación remota
  de la sesión Nuvio, validación de cuerpos y un comando EVAL con deduplicación
  por cuenta/avatar de 24 horas y límite de 100 votos por cuenta/día UTC.
  Mantiene avatar_ranks; las claves auxiliares usan hashes, no tokens/IDs en claro.
- Solo marca votos confirmados o duplicados; errores HTTP y resultados ambiguos
  no invalidan caché ni generan confirmaciones ficticias. El guardado de avatar
  solicita el voto después de verificar su persistencia en Nuvio, no antes.
- Despliegue y configuración del ranking siguen PENDIENTES: AVATAR_REDIS_URL,
  AVATAR_REDIS_TOKEN y NUVIO_PUBLIC_ANON_KEY se configuran en Cloudflare conforme
  a worker/README.md. No se tocaron secretos ni el Worker activo. Con las rutas
  antiguas o Redis no configurado, siguen funcionando caché y ocho avatares de
  respaldo. Las configuraciones Redis antiguas del navegador ya no se utilizan.
- Los tests verifican autenticación, límites de entrada, contrato EVAL, errores,
  aislamiento de claves y orden guardado/voto usando servicios simulados. La
  ejecución real del script Lua y sus límites necesitan probarse con Redis y
  Cloudflare antes de desplegar; no se declara esa validación real realizada.
- `js/avatars-data.js` eliminado: modelos, selectores y estado en features/avatars,
  transporte y URLs en integrations/github, carga en workflows/load-avatar-catalog.js
  y composición en app/avatar-catalog.js. Cuenta, asistente y publicador usan las
  entradas nuevas. Los formateadores puros se consumen por features/avatars/index.js.
- Treinta y ocho contratos comparados con el original: compilación, filtros,
  búsqueda y resúmenes sobre el manifiesto de 149 entradas y los 152 archivos
  versionados, incluidas las rutas relativas de cuenta. No se movieron imágenes.
- Conserva caché de sesión de 30 minutos, comprobación del SHA de main y respaldo
  por manifiesto remoto. Descarta árboles truncados; el respaldo usa la revisión
  elegida. Un refresh fallido conserva el catálogo y rechaza la operación para
  que el consumidor no anuncie una sincronización exitosa. El almacenamiento
  bloqueado no convierte una consulta correcta en catálogo vacío.
- Publicación confirmada actualiza el registro por ruta completa, sin confundir
  archivos homónimos de franquicias distintas; recalcula variaciones y conserva
  previews. Invalida caché y lecturas anteriores mediante revisión de estado.
  Los selectores devuelven copias, sin permitir mutar el catálogo propietario.
- Corrige la colisión entre archivos directos de estilo y su subcarpeta General;
  codifica delimitadores de nombres y rechaza protocolos/previews peligrosos.
  La UI extensa y sus interpolaciones restantes siguen pendientes al migrar
  account-manager/app/modder completos; esta etapa no los declara finalizados.
- Pruebas nuevas cubren modelos, publicación simulada, SHA/caché, errores,
  cancelación y concurrencia. Tres recorridos verifican búsqueda, caché bloqueada,
  refresh fallido y manifiesto de respaldo. No se publicaron assets reales.
- `js/aiostreams-client.js` eliminado: compilación pura en addons/model,
  validación de cinco proveedores en integrations/debrid, creación HTTP en
  integrations/aiostreams y selección del Worker en app/streaming-configuration.js.
  Cuenta, asistente e inyector consumen las nuevas entradas, sin puente de clase.
- Ocho contratos de éxito comparados con el original: dos compilaciones de la
  plantilla pública, cinco verificaciones Debrid y payload/resultado de creación.
  El modelo conserva ajustes ajenos, no modifica entradas y usa structuredClone.
- Un fallo de red o formato plausible nunca valida una clave. Estados invalid,
  unverifiable y unsupported distinguen rechazo, respuesta inconclusa y proveedor
  sin adaptador. Los otros cuatro proveedores de la UI siguen sin verificación
  implementada; ya no se presentan como verificados por longitud de clave.
- Creación realiza un solo POST mediante la ruta existente del Worker
  `/https://instancia/api/v1/user`; se retiraron proxies públicos, ruta local
  inexistente y reintentos ambiguos. No se desplegó ni modificó el Worker.
  El adaptador no inventa contraseñas: exige seis caracteres. Los valores
  predeterminados heredados de formularios/estado quedan pendientes al migrarlos.
- Cuenta y asistente representan nombre/plan del proveedor con nodos de texto.
  Tres recorridos cubren instalación simulada, conservación del formulario ante
  error de creación y proveedor inaccesible; ninguno escribe en servicios reales.
- Contrato de creación contrastado con el
  [router oficial de AIOStreams](https://github.com/Viren070/AIOStreams/blob/main/packages/server/src/routes/api/user.ts)
  y formato del token con su
  [utilidad de cifrado](https://github.com/Viren070/AIOStreams/blob/main/packages/core/src/utils/crypto.ts).
- `js/counter.js` eliminado: transporte en integrations/completions, coordinación
  en workflows/completions.js, caché y UI en features/completions, composición
  en app/completions.js. Todos los consumidores usan la entrada nueva.
- Conserva claves de caché y tokens, formatos, odómetro, menú y consulta cada
  25 segundos; pausa lecturas en pestañas ocultas y libera recursos al salir.
  Treinta comparaciones de formato coinciden con la implementación anterior.
- Corrige la actualización en vivo que comparaba contra una caché ya modificada,
  admite cero, tolera storage bloqueado y descarta lecturas anteriores a un registro.
- Un hit se envía a un solo proveedor; el respaldo de escritura solo se selecciona
  si el primario no está configurado. Timeout, red, 5xx o respuesta inválida tras
  el hit dejan resultado desconocido, sin otro hit ni confirmación inventada.
  El intento pendiente se recuerda durante la ventana existente de 45 minutos;
  estos marcadores locales no constituyen protección contra abuso en el servidor.
- Ya no suma uno localmente ante fallo ni muestra la celebración de incremento
  sin confirmación. Sin endpoint público de hit, conserva caché/estimación y
  devuelve estado unavailable. La configuración del usuario sigue completándose.
- Nuevas pruebas cubren contrato HTTP, conservación, concurrencia, cancelación,
  caché, polling y limpieza; tres recorridos verifican el contador en las cuatro
  páginas y su funcionamiento con almacenamiento bloqueado.
- `js/webhook-config.js` eliminado: era otra configuración vacía sin productor.
  Se retiró su rama inalcanzable. No se publicaron archivos locales privados;
  el envío mediante Worker se preparó después como se indica arriba; su
  configuración y activación real siguen pendientes.
- `js/avatar-rank-config.js` eliminado: era un objeto vacío sin productor en CI.
  Se retiró su rama inalcanzable; su cliente se migró después como se indica arriba.
- `js/counter-config.js` eliminado: configuración pública en app/completions-config.js,
  sustituida por el plugin de build con su lista explícita de variables permitidas.
- `js/version.js` eliminado: las cuatro páginas cargan app/site-version.js;
  shared/ui/version-badges.js representa etiquetas y enlaces con la misma configuración.
- `js/github-stars.js` eliminado: consulta HTTP en integrations/github, caché en
  workflows, representación en shared/ui y composición en app/repository-stars.js.
  Conserva caché de una hora y respaldo; indica datos estimados y tolera almacenamiento
  bloqueado. Cinco escenarios comparados con el original y dos recorridos de navegador.
- `js/badge-packs.js` eliminado: sus dos consumidores importan datos/reglas desde
  features/badges/index.js y el compilador conectado desde app/badge-compilation.js.
  No hay un nuevo archivo puente ni cambia el estado compartido del catálogo.
- `js/nav-indicator.js` eliminado: las cuatro páginas cargan src/app/navigation.js;
  indicador, eventos y limpieza siguen en los componentes compartidos existentes.
- `js/config.js` eliminado: todos sus consumidores importan la configuración
  pública existente en src/app/config.js. No se duplicaron constantes ni se
  cambió la configuración; se retiró el puente completo.
- `js/aiometadata-client.js` eliminado. Transporte y validación de respuestas en
  `integrations/aiometadata`; creación y comprobación de manifiesto en workflows;
  dependencias conectadas desde `app/metadata-configuration.js`.
- Los cuatro contratos de éxito se probaron contra el cliente anterior y después
  contra el nuevo. Las regresiones cubren payloads conservados, errores, timeout,
  cancelación, URLs, respuestas inválidas y resultado desconocido de escrituras.
- Cuenta e inyector usan las entradas nuevas. Cargas/actualizaciones existentes
  se dirigen a la instancia del manifiesto instalado, nunca a todo el pool.
  Creación solo cambia de instancia ante ruta explícitamente no disponible
  (404/405); no repite escrituras ambiguas. Fallar al leer un manifiesto se
  representa con advertencia, sin inventar una verificación exitosa.
- El adaptador no añade contraseñas predeterminadas. Los valores heredados del
  estado y los formularios siguen pendientes al migrar esos archivos completos.
- Contrato contrastado con [configApi.js de AIOMetadata](https://github.com/cedya77/aiometadata/blob/dev/addon/lib/configApi.js),
  sin copiar su implementación ni usar credenciales/servicios de escritura reales.
- Dos recorridos de cuenta verifican instancia, conservación de ajustes y error
  de guardado. Activan Guardar con teclado: la cabecera flotante heredada puede
  cubrir ese control en este viewport; su disposición visual queda pendiente.

### 1. Guardados e inyección — siguiente prioridad

- Extraer del cliente Nuvio transporte, DTOs y operaciones restantes de addons,
  colecciones, ajustes y credenciales a integrations/nuvio.
- Extraer aprovisionamiento a workflows, con adaptadores inyectados desde app.
- Conservar addons, claves y ajustes ajenos a la edición; no convertir una lectura
  fallida en lista vacía ni un resultado ambiguo en éxito.
- Snapshot y destino estables por guardado; resultados parciales por operación,
  pendientes conservados y reintentos que no repitan lo confirmado.
- Cierre: regresiones de conservación, error HTTP/red, verificación inconclusa,
  cambio de perfil y éxito parcial; recorrido de edición/guardado/recarga.

### 2. Cuenta y asistente

- Extraer editores y controladores por responsabilidad. Las entradas index.js
  solo conectan dependencias y arrancan la página, máximo 150 líneas.
- Terminar pasos de perfiles, preferencias, addons y ejecución; dividir borrador,
  datos confirmados y estado visual. No compartir el estado entero entre módulos.
- Retirar window.appController y eventos inline, liberar listeners y peticiones.
- Cierre: cambios de perfil fuera de orden, dirty real, guardados fallidos sin
  pérdida de edición, teclado/foco y recorridos visuales de editores autenticados.

### 3. Colecciones y avatares

- Extraer Mini Nuvio, sus componentes y modales a collections/ui. Sustituir handlers
  globales y gestionar suscripciones y Sortable al montar/desmontar.
- Normalización, búsqueda, caché y transporte GitHub del catálogo ya están
  separados. Migrar las vistas y controles restantes de los consumidores antiguos.
- Extraer carga/conversión, cola, edición y publicación de avatares.
- Cierre: ordenar, añadir, renombrar, borrar, cancelar y reabrir sin listeners
  duplicados; títulos/URLs externos tratados de forma segura; publicación simulada.

### 4. Worker y servicios auxiliares

- El Worker modular de worker/ ya tiene publicación validada, pero no está desplegado.
- Sustituir la contraseña de colaboradores persistida como token por una sesión
  emitida por el Worker; preservar el flujo account/modder.
- Ranking Redis y sugerencias Discord tienen rutas y clientes privados preparados;
  faltan pruebas con Redis/Discord/Cloudflare reales, configuración de secretos y
  despliegue autorizado. Nunca incorporar
  secretos a configuración pública o variables que acaben en bundles.
- Consultas y registro de completados ya están separados del odómetro genérico;
  los endpoints públicos externos siguen siendo opcionales. La deduplicación
  global requiere soporte del proveedor; no atribuirla a los marcadores locales.
  El adaptador AIOStreams ya está migrado y probado con servicios simulados;
  comprobar credenciales e instalación reales requiere feedback del usuario.
- Cierre: contratos cliente/backend probados sin servicios reales. Despliegue y
  configuración de secretos son una acción posterior que requiere autorización.

### 5. Retirada final del legado

- Verificar que ninguna página, import, plantilla o test activo necesite js/.
- Migrar consumidores y borrar puentes; retirar baseline al no quedar excepciones.
- Revisar assets/profile_icons con el publicador y URLs guardadas antes de moverlos.
- Ejecutar todos los checks y la revisión visual; recibir feedback del usuario
  en su entorno real. Solo entonces se puede considerar terminada la subrama.
- Completar etapas no autoriza merge, push ni despliegue.

## Lo ya extraído y sus restricciones

- CSS dividido en 29 hojas, HTML en parciales, configuraciones en config/ y build
  multipágina que conserva `/`, `/account/`, `/configuration/`, `/documentation/`,
  `/modder/`. El build genera dist/index.html; no servir la raíz del repositorio.
- Modelos de badges, colecciones, pósters y metadata; autenticación y sesión Nuvio
  sin contraseñas guardadas; CRUD de perfiles verificado; resumen de actividad.
- Pasos de autenticación y claves separados en vista, controlador y workflow;
  claves no verificables no se pintan como válidas. RPDB/TVDB siguen opcionales.
- Navegación, odómetro, avisos y mostrar contraseña compartidos. Arranque del wizard
  bloquea interacción con inert hasta cargar plantillas y registrar eventos.
- Cabecera y footer públicos tienen una sola plantilla en shared/ui/site-shell;
  el build calcula rutas relativas y estado activo. Modder conserva su cabecera
  propia porque ofrece otras acciones y no comparte el contrato de navegación.
- Mini Nuvio usa acciones inmutables para editar colecciones, pero su vista aún
  es heredada. No reintroducir escrituras directas desde ella.
- Progreso Nuvio: sync_pull_watch_progress usa cursor numérico 0, no fecha ISO
  (el servidor devuelve 22P02 ante ese tipo incorrecto). Mantener respaldo REST
  acotado y distinguir fallo de lectura de historial vacío. El usuario confirmó
  que «Actualmente viendo» funciona; no requiere cambiar el Worker.
- Contratos de perfiles documentados en
  [nuvio-profiles.md](../architecture/nuvio-profiles.md). Índice de perfil y UUID
  no son intercambiables; nunca usar sync_push_profiles para simular eliminaciones.
- assets/profile_icons conserva rutas canónicas GitHub usadas por catálogo y
  publicador. No duplicarlo en public para aparentar una migración completa.
- El Worker local ignorado cloudflare-worker/ es referencia del servicio desplegado;
  no borrarlo ni publicarlo sin revisar secretos y compatibilidad.

## Contratos del producto conservados del contexto anterior

- Sitio estático multipágina para aprovisionar Nuvio y AIOMetadata en español
  latino, idioma predeterminado es-MX. Usar JavaScript modular y CSS compilado;
  las antiguas referencias a SPA, Tailwind CDN y python run.py están obsoletas.
- Conservar modo con cuenta y exportación manual sin cuenta, límite de seis
  perfiles y configuración de las plataformas tv, mobile y desktop.
- Mantener aio-metadata como addonId canónico. AIOMetadata se coloca primero;
  conservar addons del usuario y eliminar solo los descartados explícitamente.
- Ghost Mode: los catálogos AIOMetadata usan showInHome: false; las colecciones
  nativas se fijan arriba por defecto, respetando preferencias guardadas.
- Las plantillas de public/templates deben mantener correspondencia entre
  referencias de colecciones y catálogos metadata, y el orden de sus cuatro
  secciones actuales. Comprobar referencias faltantes, duplicados y huérfanos
  antes de modificar o publicar esas plantillas; no asumir paridad sin medirla.
- Conservar los ajustes ajenos y los formatos oficiales de credenciales/settings
  por plataforma; no extrapolar un esquema de mobile a TV.
- Mantener Instrument Sans/Serif, paleta y diseño existentes; modales montados
  fuera de contenedores transformados cuando sea necesario para su centrado.
- version.json es la fuente de versión; conservar coherencia con UI, README,
  CHANGELOG y releases. La licencia MIT y los créditos existentes se mantienen.
- Para una publicación autorizada, comprobar los assets remotos: el publicador
  puede añadirlos a main fuera de esta subrama. Inspeccionar diferencias antes
  de integrar; esa comprobación no autoriza checkout, merge, push ni despliegue.
- No copiar los comandos Python ni la inyección de secretos en frontend del
  antiguo contexto: ya no describen las herramientas ni el contrato seguro actual.

## Repositorio abierto: qué conservar y qué ignorar

- Sí versionar fuentes, tests, lockfile, CI, configuración reproducible, Worker
  sin secretos y documentación útil para contribuidores. docs/ es documentación
  del desarrollo; src/pages/documentation es la guía pública de la web.
- scripts/ contiene herramientas necesarias para compilar y comprobar arquitectura.
  No ignorar toda la carpeta ni permitir solo una extensión por defecto.
- Herramientas personales: .local/ para nuevas; dos scripts personales existentes
  permanecen ignorados explícitamente. .env, .local.js, dependencias instaladas,
  cachés, resultados y exportaciones personales no pertenecen al repositorio.
- .gitignore no deja de versionar archivos ya seguidos y no evita por sí solo
  exponer archivos si alguien sirve la raíz. Publicar únicamente dist/.
- AGENTS.md y GEMINI.md en la raíz son entradas mínimas de descubrimiento,
  no copias de estas reglas. No moverlas a una subcarpeta inaccesible al arrancar.
- private: true en package.json evita publicar un paquete npm; no cambia MIT ni
  la visibilidad del proyecto. Mantener package.json y lockfile en la raíz.

## Verificación y actualización del contexto

Node.js 24 o posterior; CI utiliza 24. Comandos existentes:

```sh
npm ci
npm run check
npx playwright install chromium
npm run test:e2e
npm run test:e2e:dev
npm run dev
```

Último punto validado de esta actualización: 519 pruebas de lógica,
48 recorridos contra build y 47 contra desarrollo, todos pasando. Actualizar
estas cifras solo tras ejecutar los comandos. La diferencia es el test del
artefacto público, que no se aplica al servidor de desarrollo.
Las pruebas usan servicios simulados; no verifican cuentas ni despliegues reales.

En esta etapa se consolidaron los anteriores documentos de seguimiento y el
contexto local obsoleto en este archivo. Se comprobó que las ocho variantes
anteriores de cabecera/footer producen el mismo marcado relevante con dos
plantillas compartidas, añadiendo aria-current. Las pruebas de navegador verifican
los enlaces del footer, la pestaña actual y que el build no exponga el contexto,
las instrucciones ni configuraciones del repositorio. Las hojas CSS no se
modificaron en la extracción de AIOStreams; el compilado añade las clases
detectadas en los módulos nuevos y por ello cambia su hash.
Se verificaron las exclusiones de secretos, scripts personales y resultados;
design-reference se eliminó tras comprobar su ubicación y ausencia de enlaces.

La política Git Flow se instaló además en ~/.codex/AGENTS.md como preferencia
local del usuario para futuras sesiones de Codex. Esa configuración global no
se versiona ni se impone a los equipos de otros contribuidores. En este repositorio
AGENTS.md remite aquí y GEMINI.md importa este mismo contexto para Gemini CLI.

Después de cada etapa: describir aquí cambio, deuda restante y verificación;
mantener baseline, README y contratos coherentes. Usar commits para el historial
detallado, no acumular transcripciones de sesiones en este archivo.

## Contrato completo de arquitectura y mantenimiento

### 1. Estado del proyecto y alcance de los cambios

- La estructura siguiente es la arquitectura de destino acordada, parcialmente
  implementada. Consultar este context.md para el avance real.
  El código heredado en `js/` y el Worker local en `cloudflare-worker/` siguen
  en migración. Los estilos de `css/` ya se separaron en módulos dentro de `src/`.
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

### 2. Mapa de destino: dónde pertenece cada archivo

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
- Las herramientas reproducibles de `scripts/` y `worker/` están versionadas.
  El Worker heredado y las herramientas personales se ignoran explícitamente;
  nunca incorporar secretos al cambiar reglas de seguimiento.

### 3. Cómo decidir y dividir una funcionalidad

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

### 4. Dependencias permitidas y prohibidas

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

### 5. Límites de tamaño: obligatorios para código nuevo y extraído

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

### 6. Arquitectura interna y calidad del código

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

### 7. Red, errores, concurrencia y guardados

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

### 8. UI, recursos y ciclo de vida

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

### 9. Seguridad y configuración

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

### 10. Pruebas, herramientas y condiciones de entrega

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
