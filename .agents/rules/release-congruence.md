# Regla de Proyecto: Congruencia Estricta de Releases y Documentación

Cada vez que se prepare, mencione o publique un Release o cambio de versión en este repositorio:
1. **Verificación de Pasos**: Comprobar obligatoriamente que el orden y contenido de los 5 pasos descritos en `README.md` coincida exactamente con la implementación real en `configuration/index.html` (Paso 1: Cuenta / Paso 2: Perfil / Paso 3: Mini NUVIO Colecciones / Paso 4: Claves API / Paso 5: Inyección).
2. **Versionado Único**: La versión en `version.json`, `js/config.js`, `README.md`, `CHANGELOG.md` y los badges HTML de `index.html`, `configuration/index.html` y `documentation/index.html` deben ser 100% idénticas.
3. **Auditoría Automática**: Ejecutar `python scripts/audit_release.py` antes de cualquier tag o release para asegurar consistencia total.
