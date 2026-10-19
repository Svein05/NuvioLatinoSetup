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
configuración privada de producción. El Worker aún no se incorporó al repositorio.

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
