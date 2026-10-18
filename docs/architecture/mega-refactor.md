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

Las páginas HTML se trasladan primero conservando el marcado. Exceden 350 líneas
y mantienen scripts y eventos inline temporalmente: dividirlas y verificar el
renderizado requiere una etapa específica. No se justifican nuevos handlers inline.

`js/` permanece como adaptador de compatibilidad y fuente heredada durante la
extracción; los módulos nuevos no pueden importarlo. Las páginas migradas pueden
referenciarlo mientras figuren en el inventario. No existe una segunda aplicación.

`assets/` permanece temporalmente en su ruta canónica porque el catálogo y el
publicador remoto usan rutas GitHub `assets/profile_icons/`. El build copia solo
esos recursos públicos a `dist/assets/`; cambiar su origen exige migrar también
el Worker y las URLs ya guardadas. No duplicar el catálogo en el repositorio.

`css/styles.css` se conserva temporalmente como fuente heredada. SortableJS sigue
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
