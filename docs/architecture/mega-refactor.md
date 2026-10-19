# Mega refactor

Rama: `codex/mega-refactor`, creada desde `develop` (`268df02`).
Contrato de arquitectura: [AGENTS.md](../../AGENTS.md).

## Objetivo y decisiones

Separar páginas, funcionalidades, coordinación e integraciones, conservando el
diseño y las URLs públicas. Mantener JavaScript y DOM nativo; añadir herramientas
reproducibles, pruebas de regresión y comprobaciones de arquitectura.

- Páginas bajo `src/pages/`; eliminar la página redundante `home/`.
- Funcionalidades con estado propio y una interfaz pública explícita.
- Workflows para aprovisionamiento y guardados que atraviesan varias funciones.
- Integraciones sin DOM ni acceso al estado privado de las pantallas.
- Worker versionado sin secretos y publicación inmediata de avatares.
- Conservar acceso compartido de colaboradores; no representa identidad individual.
- No publicar, fusionar ni modificar servicios reales como parte de la migración.

## Secuencia y criterios de cierre

1. Base: instrucciones, plan, lockfile, build multipágina, CI y pruebas.
2. Páginas: mover fuentes, conservar rutas y recursos; retirar `home/`.
3. Reglas: extraer identidad de addons, compilación y contratos puros con pruebas.
4. Transporte: errores verificables, cancelación y separación de adaptadores.
5. Perfiles: impedir respuestas obsoletas y aislar borradores y sesiones.
6. Guardados: informes por operación, fallos parciales y reintentos seguros.
7. Funcionalidades: extraer UI y casos de uso de los controladores heredados.
8. Worker: separar rutas, permisos, publicación, catálogo, Discord y Redis.
9. Recursos: compilar estilos y dependencias; revisar assets y catálogo remoto.
10. Cierre: pruebas completas, revisión visual y eliminación de puentes heredados.

Cada etapa termina con verificaciones pertinentes y un inventario actualizado.
La migración completa exige eliminar las dependencias activas hacia `js/` y `css/`.
Mover un módulo monolítico sin separar responsabilidades no completa su migración.

## Defectos que requieren regresiones

- Éxitos ficticios al guardar ajustes, nombres y orden de addons.
- Mezcla de historial o respuestas tardías de otro perfil.
- Eliminación basada en lecturas fallidas o verificación inconclusa.
- Formato incompatible entre cliente AIOStreams y Worker.
- Credenciales consideradas válidas cuando no pudo consultarse el proveedor.
- Secretos publicados en JavaScript y contraseñas guardadas en sesiones.
- Interpolación insegura de datos en HTML y handlers globales.
- Configuraciones AIOMetadata desvinculadas de su instancia propietaria.
- Comparaciones de URL que alteran rutas sensibles a mayúsculas.
- Controles del Worker y permisos incoherentes con el flujo de colaboradores.

## Puentes temporales y excepciones

El inventario `legacy-baseline.json` contiene límites de líneas físicas para las
fuentes heredadas activas. Se genera inicialmente desde el contenido anterior a
su migración y no debe ampliarse para acomodar nuevas funciones. Las fuentes
registradas pueden reducirse o desaparecer; las nuevas quedan sujetas a AGENTS.
La comprobación de arquitectura rechaza crecimiento sobre ese inventario.

Las cinco páginas HTML se componen mediante parciales de secciones y modales,
todos por debajo de 350 líneas. La expansión se hace en build y desarrollo,
con recarga al editar un parcial, detección de ciclos y rechazo de rutas externas.
Se comprobó igualdad exacta con el HTML anterior al extraerlos; se mantienen
temporalmente scripts y eventos inline heredados hasta migrar sus controladores.
No se justifican nuevos handlers inline. Las URLs de un parcial se interpretan
respecto a su página de entrada, ya que se inserta antes del procesamiento de Vite.

`js/` permanece como adaptador de compatibilidad y fuente heredada durante la
extracción; los módulos nuevos no pueden importarlo. Las páginas migradas pueden
referenciarlo mientras figuren en el inventario. No existe una segunda aplicación.

`assets/` permanece temporalmente en su ruta canónica porque el catálogo y el
publicador remoto usan rutas GitHub `assets/profile_icons/`. El build copia solo
esos recursos públicos a `dist/assets/`; cambiar su origen exige migrar también
el Worker y las URLs ya guardadas. No duplicar el catálogo en el repositorio.

`css/styles.css` se retiró tras separar sus 29 responsabilidades y verificar
la conservación exacta del contenido y la cascada (solo cambian rutas relativas
de fuentes y finales de línea). La composición está en `src/app/styles.css`;
los módulos están junto a páginas, funcionalidades y componentes compartidos.
Todos cumplen el máximo de 350 líneas. El CSS compilado conserva el mismo hash.
SortableJS sigue
como dependencia copiada en public/vendor. Tailwind se compila localmente con la
misma paleta y fuentes; Font Awesome conserva la versión 6.4.0 y se empaqueta localmente.
Se inspeccionaron clases dinámicas y las páginas de escritorio y móvil. Falta
cubrir visualmente los editores autenticados de badges, pósters y addons.

Los módulos de configuración `.local.js` se excluyen siempre del build. El antiguo
workflow que incorporaba secretos al frontend se retiró; el contador conserva sus
endpoints públicos. Discord y Redis todavía deben migrarse al Worker antes de
desplegar esta rama en producción: sin esa etapa, sus funciones no tendrán
configuración privada de producción. El Worker ya está versionado en `worker/`,
pero no está desplegado y esos dos endpoints privados siguen pendientes.

Tailwind 3 mantiene compatibilidad visual con el CDN anterior, pero npm audit
reporta avisos de desarrollo en sus dependencias (braces y postcss-selector-parser,
incluidas dependencias transitivas). No aplicar `audit fix --force`: propone una
migración a Tailwind 4 que requiere revisión visual propia. Estas herramientas
compilan fuentes locales y no se distribuyen como JavaScript al navegador.

## Avance de la primera etapa

- Rama e instrucciones creadas; plan e inventario de legado versionables.
- Páginas movidas, home retirado, plantillas públicas y build multipágina activos.
- Lint, tamaños, límites entre módulos, imports y ciclos comprobados automáticamente.
- Identidad de addons y datos de demostración de pósters extraídos a features.
- Transporte JSON y lectura de historial/guardado de ajustes extraídos a integrations.
- Corregido filtrado entre perfiles y éxitos ficticios de ajustes; cuenta conserva
  ajustes pendientes ante errores. Otros guardados heredados siguen pendientes.
- CI prepara comprobaciones y despliegue solo de dist; no se ejecutó ningún despliegue.
- Pendientes: Worker, sesiones, carreras de perfil, guardados parciales completos,
  división de controladores, parciales HTML y retirada del legado restante.

### Extracción del resumen de cuenta

Las reglas de historial pertenecen ahora al modelo de perfiles; la resolución
TMDB/Cinemeta está en integración sin DOM, y la vista de cuenta solo representa
las métricas y tarjetas recibidas. La composición captura el destino para ignorar
metadatos tardíos de otro perfil. Se conservan los conteos y respaldos existentes;
el respaldo de métricas heredado cuando todos los elementos están completados
sigue siendo deuda funcional explícita, no se redefine durante esta extracción.
Las tarjetas usan nodos y texto, validan protocolos y no interpolan datos externos
en HTML. Se añadieron pruebas de episodios, perfiles, fallos de metadatos,
resultados tardíos y títulos/URLs hostiles en navegador.

### Catálogo y reglas de badges

El catálogo de packs y los elementos de previews son datos declarativos JSON
en `features/badges/data/`, procedentes del catálogo existente y de los assets
de kingsizew ya acreditados en README. No contienen lógica ni efectos laterales.
La identidad de módulos, previews, colores, filtros de idioma y compilación pura
están separados. Se compararon 33 salidas con la implementación anterior antes
de conectarlas. Las adiciones personalizadas tienen un dueño de estado y los
consumidores reciben snapshots de la lista. La descarga vive en una integración
inyectada desde app; el módulo antiguo solo reexporta interfaces explícitas.
Una descarga fallida o inválida ya no se convierte en reglas vacías con apariencia
de éxito, ni el inyector declara finalización tras ese error. El respaldo por
proxy solo admite catálogos públicos GitHub Raw sin credenciales y no elude
errores HTTP 4xx ni cancelación. Esta corrección funcional tiene su propia regresión
y commit, separados de la extracción de reglas.

### Preparación de colecciones y metadatos

El estado heredado delega la selección/exportación de colecciones a su modelo,
y la preparación de AIOMetadata a un workflow que coordina interfaces de
collections, posters y metadata. Se compararon ocho combinaciones con el método
anterior (plantilla raíz/anidada y cuatro valores de motor), además de pruebas
de conservación de claves, opciones ajenas y ausencia de mutaciones del origen.
Las exportaciones de colecciones son snapshots independientes. La contraseña
predeterminada heredada todavía se suministra desde el puente de estado, no se
introdujo como regla nueva en los modelos; su retirada requiere la etapa de sesión.

### Backend versionado y validación de publicación

`worker/` contiene rutas, middleware, validación de lotes, cliente GitHub y servicio
de publicación con dependencias inyectadas. No importa código del navegador.
El archivo local ignorado `cloudflare-worker/worker.js` no se publica ni se elimina:
sirve como referencia del backend actualmente desplegado, que no se ha sustituido.
No se incorporaron secretos ni la cuenta personal predeterminada del código local.

Las pruebas simulan autenticación, restricciones configuradas, validación previa
a red, rutas, contenido, publicación de un árbol, renombrados fallidos y resultado
desconocido al actualizar la rama. El backend no repite escrituras ambiguas ni
omite renombrados fallidos para publicar el resto del lote como éxito.
Los cambios de límites, formatos y proxy están documentados en `worker/README.md`.
Conservar la configuración privada existente hasta verificar y desplegar la nueva
versión explícitamente; este trabajo no despliega ni modifica servicios reales.

### Navegación y odómetro compartidos

El odómetro, menú móvil, monitor de desborde e indicador de navegación viven en
`shared/ui/`. Los componentes exponen limpieza de eventos, observers y cuadros
de animación; son idempotentes por nodo y respetan movimiento reducido. El puente
del indicador libera sus recursos al ocultar la página y se reinicia al restaurarla
desde la caché del navegador. El contador conserva temporalmente su coordinación
heredada; no debe volver a absorber lógica de navegación o animación de dígitos.
Los recorridos prueban apertura/cierre por teclado, hover y movimiento reducido.

Las notificaciones y el control de visibilidad de contraseñas también son
componentes compartidos. Se mantienen las dos presentaciones de toast existentes,
pero los mensajes usan texto seguro y anuncian su estado accesible. Los controles
de contraseña usan un único listener delegado para incluir campos dinámicos sin
registrar eventos repetidos; el icono y la etiqueta describen la acción disponible.

### Autenticación y persistencia de sesiones Nuvio

Login/registro están en la integración Nuvio con transporte común, validación de
sesión y errores sin cuerpos sensibles. Un registro con resultado desconocido
no se repite. Se conservan el login posterior a un registro confirmado y los
contratos de navegación. Las sesiones de cuenta y asistente mantienen sus claves
de compatibilidad, pero se reescriben con campos permitidos y se limpian al expirar
cuando Nuvio proporciona vencimiento o el JWT permite leerlo. El asistente ya no
guarda ni restaura contraseñas Nuvio/AIOMetadata; tras recargar hay que volver a
introducir la contraseña de edición del addon cuando se necesite.
La sesión compartida de colaboradores todavía necesita un token emitido por el
Worker para retirar su contraseña persistida sin romper el cambio de página.

### Lectura y edición de perfiles

El cliente heredado delega lectura, creación, nombre, avatar y eliminación a
adaptadores Nuvio separados con mappers de identidad, validación y verificación
posterior. Se conservan los campos de avatar/herencia/fondo conocidos. No se
generan snapshots vacíos tras un fallo de lectura ni se prueban alternativas tras
una escritura incierta. El borrado deja de recorrer eliminaciones indiscriminadas.
Ver [contratos contrastados con el código oficial](nuvio-profiles.md).
Las regresiones cubren cuota, identidad, lecturas fallidas, escrituras ambiguas,
conservación y confirmación; los recorridos de cuenta prueban edición y error.

### Paso de autenticación del asistente

El paso auth ya tiene controlador y vista propios en `pages/configuration/steps/`.
Solo controla el estado visual y emite acciones; el workflow inyectado coordina
autenticación, lectura de perfiles y creación inicial. Una lectura fallida no
desencadena creación. Las entradas capturan credenciales para cada intento,
impiden envíos simultáneos y exponen cancelación/limpieza. Se retiró el submit
HTML inline. Los recorridos cubren registro, validación de confirmación, Enter,
cambio de pestañas, login, recarga y modo manual sin servicios externos reales.

## Validación y seguimiento

### Limpieza de entradas de desarrollo

Configuraciones agrupadas en `config/`, con rutas explícitas en npm y resolución
de recursos desde la raíz del repositorio. Retirados el servidor Python `run.py`,
su referencia en la pantalla, `requirements.txt` (apuntaba a un generador ausente),
`.nojekyll` (no formaba parte del artefacto publicado) y un `.gitkeep` redundante.
No se borraron herramientas personales ignoradas ni el Worker local desplegado.
Verificación: lint, arquitectura, 55 pruebas de lógica, build y 14 recorridos de
navegador sobre el build. Ningún servicio externo real se modificó.

- `npm ci`: instalación reproducible.
- `npm run check`: lint, límites y arquitectura, regresiones y build.
- `npm run test:e2e`: navegador contra build local, servicios externos simulados.
- `npm run test:e2e:dev`: recorridos de páginas contra desarrollo; la comprobación
  del artefacto publicable se ejecuta exclusivamente contra producción.
- Verificar `/`, `/configuration/`, `/account/`, `/documentation/` y `/modder/`.
- No utilizar cuentas, claves privadas ni endpoints de escritura reales en pruebas.
- No declarar completa una etapa por el mero hecho de que compile.

Las comprobaciones iniciales protegen el código nuevo y contienen el crecimiento
del legado. No demuestran que todos los defectos anteriores estén corregidos.

Verificación local de esta etapa: 39 pruebas unitarias/regresión, 11 comprobaciones
de navegador contra build y 10 contra desarrollo. Servicios externos simulados;
las pantallas autenticadas con datos reales y el despliegue quedan sin verificar.

## Corrección de compatibilidad del progreso

La primera extracción cambió una condición de main: una respuesta vacía del RPC
de progreso dejaba de consultar la tabla `watch_progress`. También eliminó la
lectura alternativa ante fallos transitorios o respuestas RPC sin una lista válida.
La pantalla heredada convertía el error en `[]` y mostraba «Sin reproducciones».

Se restauró la comprobación REST del progreso vacío y el respaldo de lecturas ante
incompatibilidad, fallos 5xx, red o formato. No se aplica a escrituras, cancelación,
401, 403, 429 ni errores de validación no reconocidos. Ambas respuestas se filtran
por el perfil solicitado; una respuesta de otro perfil nunca se reutiliza.

La coordinación de fuentes del resumen ahora pertenece a un workflow con cliente
inyectado. Mantiene las secciones cargadas cuando otra falla. Una fuente fallida
se representa con aviso y métrica «—», no como un historial vacío confirmado.
Se añadieron regresiones y recorridos autenticados con sesión y APIs ficticias.
La respuesta exacta de la sesión real de la captura no se inspeccionó.

### Causa confirmada del rechazo del RPC

La corrección anterior no solucionó el fallo mostrado por la cuenta del usuario.
El parámetro `p_since_last_watched` conservaba la fecha ISO heredada de main,
pero el servicio exige un `bigint`. Una consulta de lectura sin sesión, usando
solo la clave pública, confirmó HTTP 400 y código `22P02` con el texto ISO.
Con el cursor numérico `0`, la misma consulta pasó la validación de parámetros
y devolvió el rechazo de sesión esperado (403). No se utilizaron credenciales
del usuario ni se comprobó su historial autenticado real.

Main ocultaba este defecto consultando REST tras cualquier error del RPC.
La nueva integración detenía correctamente el respaldo ante un error de validación,
pero había conservado la petición inválida. Ahora envía el cursor numérico `0`.
Se mantiene la política de no eludir errores de permisos o validación.

La regresión nueva reprodujo el 400 antes del cambio y pasa con el parámetro
corregido. El navegador simulado también valida el cuerpo enviado, y cubre tanto
filas RPC directas como respaldo REST y fallo de lectura. Las pruebas anteriores
simulaban respuestas por URL sin comprobar el tipo del cursor y omitían este error.

## Configuración manual durante la migración

- Historial, progreso, perfiles y addons consultan Nuvio directamente. Esta
  corrección no requiere cambios de Cloudflare ni nuevas claves del usuario.
- Los pósters del resumen siguen usando la clave TMDB del perfil. Las capturas
  muestran que otras filas sí tienen metadatos; eso no demuestra que el progreso
  se haya leído correctamente.
- El contador local puede usar respaldo y caché de localhost si no tiene los
  endpoints públicos configurados en el entorno de GitHub Actions. No representa
  el número de contenidos del perfil ni demuestra pérdida de datos.
- Las sugerencias de Discord y el ranking global continúan pendientes de sus
  endpoints privados en el Worker. Sus configuraciones locales no se incorporan
  al bundle. No solucionar esto publicando el webhook ni el token Redis.
- Conservar por ahora el Worker desplegado. Cuando se complete su migración,
  habrá que desplegar el código compatible y configurar sus secretos; esa tarea
  no se ejecutó ni se exige al usuario para probar el historial local.
