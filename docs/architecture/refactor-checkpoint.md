# Punto de comprobación de la refactorización

Rama: `codex/mega-refactor`. Estado: migración parcial, apta para pruebas locales.
El avance y las decisiones están en [mega-refactor.md](mega-refactor.md).

## Cambios separados y comprobados

- Estilos divididos por responsabilidad: 29 hojas; ninguna supera 350 líneas.
- Cinco páginas compuestas con parciales de hasta 350 líneas; mismas rutas públicas.
- Configuraciones agrupadas en `config/`; servidor Python antiguo retirado.
- Modelos de badges, pósters, metadata, exportación y edición de colecciones.
- Autenticación Nuvio y persistencia de sesión sin contraseñas de cuenta/addon.
- Lectura y edición de perfiles, y resumen de actividad con protección ante respuestas tardías.
- Pasos de autenticación y claves del asistente: vista, controlador y workflow.
- Arranque del asistente separado: controles inactivos hasta cargar plantillas
  y registrar eventos, con regresión de carga lenta.
- Componentes compartidos de navegación, odómetro, avisos y mostrar contraseña.
- Backend de avatares separado en rutas, validación, permisos y publicación GitHub.
  Está versionado; no se ha desplegado.

Cada extracción se guardó en un commit separado. Se contrastaron resultados con
las implementaciones anteriores y se añadieron regresiones para los contratos
que cambian: errores verificables, aislamiento de perfiles y claves no verificables.
Las pruebas usan fixtures sintéticos y servicios simulados.

## Qué queda pendiente

La presencia de `js/` es deuda activa, no una carpeta redundante que pueda borrarse.
El inventario [legacy-baseline.json](legacy-baseline.json) contiene su tamaño
máximo actual. Se redujeron sus topes al retirar responsabilidades; la comprobación
rechaza que vuelvan a crecer.

1. Guardados e inyección: extraer contratos y resultados parciales del cliente Nuvio,
   AIOMetadata y AIOStreams; conservar addons y ajustes ajenos al cambio y probar
   escrituras de resultado desconocido antes de cambiar los recorridos.
2. Cuenta: dividir el controlador, sus editores y sus listeners; comprobar cambios
   de perfil durante cargas/guardados y conservación de borradores pendientes.
3. Asistente: separar perfiles, preferencias, addons y ejecución; retirar
   `window.appController` y las conexiones de eventos heredadas.
4. Colecciones: extraer la vista Mini Nuvio y sus modales, sustituir eventos HTML
   inline y gestionar el ciclo de vida de Sortable y suscripciones.
5. Avatares y colaboradores: separar catálogo, carga de imágenes y publicación;
   sustituir la contraseña compartida persistida por una sesión emitida por el
   Worker, sin perder el flujo entre las páginas account/modder.
6. Worker y contadores: implementar endpoints privados de Discord/Redis y cerrar
   sus contratos con los clientes. Desplegar requiere una acción posterior expresa;
   no publicar las configuraciones locales privadas en el frontend.
7. Retirar puentes, revisar todos los editores visualmente y verificar que ninguna
   página activa dependa del legado antes de declarar finalizada la migración.

Los controladores de cuenta, asistente, publicación de avatares y Mini Nuvio aún
superan 1.000 líneas. No se trasladaron enteros a una carpeta nueva para aparentar
que ya cumplen la arquitectura. El CSS y HTML nuevos sí cumplen los límites.

## Archivos en la raíz y qué se versiona

Solo quedan ocho archivos versionados en la raíz:

| Archivo | Motivo |
| --- | --- |
| `.gitignore` | Excluir archivos locales, secretos, dependencias y resultados. |
| `AGENTS.md` | Contrato de contribución y arquitectura para asistentes. |
| `README.md` | Presentación, ejecución y desarrollo del proyecto abierto. |
| `LICENSE` | Licencia del código. |
| `CHANGELOG.md` | Historial público de cambios. |
| `package.json` | Dependencias y comandos npm, descubiertos desde la raíz. |
| `package-lock.json` | Instalación reproducible para contribuidores y CI. |
| `version.json` | Versión consultada por las páginas y por integraciones existentes. |

`private: true` en package.json evita publicar accidentalmente un paquete npm;
no cambia la licencia ni la visibilidad del repositorio.

Se versionan fuentes, pruebas, configuraciones, documentación y código del Worker.
No se versionan `.env`, configuraciones `.local.js`, `node_modules`, `dist`,
`test-results`, entornos Python ni archivos personales ignorados. El despliegue
del sitio publica únicamente `dist/`, donde el build genera el `index.html` raíz.

`assets/profile_icons/` conserva su ubicación canónica: el catálogo GitHub y el
publicador usan esas rutas y existen URLs ya guardadas. Cambiarla exige migrar esos
contratos. No hay una segunda copia del catálogo en el repositorio.

## Verificación local

```sh
npm ci
npm run check
npx playwright install chromium
npm run test:e2e
npm run test:e2e:dev
npm run dev
```

El punto actual supera 178 pruebas unitarias/integración, 29 recorridos contra
el build y 28 contra desarrollo. La diferencia corresponde a la prueba que verifica
que el artefacto público no exponga archivos privados del repositorio; no se aplica
al servidor de desarrollo. Las capturas de las páginas cubren escritorio y móvil.

Para probar con una sesión real: abrir Vite, comprobar «Actualmente viendo»,
editar y guardar un ajuste pequeño del perfil y recargar, recorrer el asistente
y revisar el editor de colecciones. Las pruebas automáticas no usan tu cuenta
ni garantizan todos los contratos de proveedores reales. El historial Nuvio no
requiere que modifiques o despliegues el Worker para esta comprobación local.
