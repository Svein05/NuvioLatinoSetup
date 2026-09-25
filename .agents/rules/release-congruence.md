# Regla de Proyecto: Congruencia Estricta de Releases, Código y Documentación

Cada vez que se prepare, mencione o publique un Release o cambio de versión en este repositorio:
1. **Inspección Manual Directa por el Agente**: Leer y contrastar personalmente con `view_file` todos los archivos relevantes (código, web, templates y documentación) cubriendo los 10 vectores del protocolo `release-congruence`.
2. **Prohibición de Scripts Desechables**: No crear ni depender de scripts ad-hoc de auditoría en el repositorio; el análisis debe ser realizado intelectual y manualmente por el asistente.
3. **Versionado Único**: La versión en `version.json`, `js/config.js`, `README.md`, `CHANGELOG.md` y los badges HTML de `index.html`, `configuration/index.html` y `documentation/index.html` deben ser 100% idénticas.
4. **Validación Pre-Merge**: No se permite proponer ni realizar ningún merge a `main` si existe la más mínima discrepancia entre lo que dice la documentación y lo que hace el código fuente real.
