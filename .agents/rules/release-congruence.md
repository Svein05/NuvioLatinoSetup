# Regla de Proyecto: Congruencia Estricta de Releases, Código y Documentación

Cada vez que se prepare, mencione o publique un Release o cambio de versión en este repositorio:
1. **Contraste Integral de Código vs Documentación**: Comprobar obligatoriamente que TODO lo declarado en `README.md` y `documentation/index.html` (los 5 pasos, proveedores de metadatos, Ghost Mode, carátulas limpias, límite de 6 perfiles, modo manual y URLs oficiales) coincida al 100% con el código implementado.
2. **Versionado Único**: La versión en `version.json`, `js/config.js`, `README.md`, `CHANGELOG.md` y los badges HTML de `index.html`, `configuration/index.html` y `documentation/index.html` deben ser 100% idénticas.
3. **Auditoría Automática Obligatoria**: Ejecutar `python scripts/deep_audit_congruence.py` y `python scripts/audit_release.py` antes de cualquier tag o propuesta de merge a `main`. No se permite ningún release con discrepancias.
