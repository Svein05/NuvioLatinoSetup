---
name: release-consistency
description: Audit and enforce strict congruence between codebase implementation, web interface, README.md, documentation, and versioning whenever preparing or publishing a release.
---

# Release Consistency & Congruence Protocol (Nuvio Setup)

Este skill define el protocolo obligatorio que el asistente debe seguir cada vez que se prepare, incremente o publique un nuevo **Release** o versión del proyecto.

## 🎯 Principio Fundamental
**"Lo que dice la documentación debe coincidir con total exactitud con lo que hace y muestra la aplicación web en vivo."**
Nunca se debe publicar un release con discrepancias de pasos, números de versión desfasados o características obsoletas en `README.md`.

---

## 📋 Checklist de Auditoría Pre-Release

Antes de proponer o ejecutar cualquier versión:

### 1. Auditoría del Flujo de Pasos (Web vs README vs Docs)
- [ ] Verificar el orden exacto de los pasos en [`configuration/index.html`](file:///c:/Users/Elias/Documents/GitHub/NuvioSetup/configuration/index.html):
  - **Paso 1:** Cuenta Nuvio / Modo Manual
  - **Paso 2:** Selección / Creación de Perfil (Omitido en Modo Manual)
  - **Paso 3:** Personalización Visual en Mini NUVIO (Colecciones)
  - **Paso 4:** Claves API (TMDB, MDBList, RPDB, TheTVDB, Fanart.tv, Gemini)
  - **Paso 5:** Seguridad de Addon e Inyección / Exportación JSON
- [ ] Verificar que [`README.md`](file:///c:/Users/Elias/Documents/GitHub/NuvioSetup/README.md) y [`documentation/index.html`](file:///c:/Users/Elias/Documents/GitHub/NuvioSetup/documentation/index.html) describan exactamente este mismo orden.

### 2. Sincronización de Versión Única
- [ ] [`version.json`](file:///c:/Users/Elias/Documents/GitHub/NuvioSetup/version.json): `"version": "X.Y.Z"`
- [ ] [`js/config.js`](file:///c:/Users/Elias/Documents/GitHub/NuvioSetup/js/config.js): `VERSION: "X.Y.Z"`
- [ ] Badges en cabeceras de [`index.html`](file:///c:/Users/Elias/Documents/GitHub/NuvioSetup/index.html), [`configuration/index.html`](file:///c:/Users/Elias/Documents/GitHub/NuvioSetup/configuration/index.html) y [`documentation/index.html`](file:///c:/Users/Elias/Documents/GitHub/NuvioSetup/documentation/index.html) deben reflejar `vX.Y.Z` y enlazar a GitHub Releases.
- [ ] Badge en [`README.md`](file:///c:/Users/Elias/Documents/GitHub/NuvioSetup/README.md): `Version-vX.Y.Z`.
- [ ] Tag en Git: `vX.Y.Z`.

### 3. Registro de Cambios (`CHANGELOG.md`)
- [ ] Debe existir una sección `## [X.Y.Z] - AAAA-MM-DD`.
- [ ] Los cambios deben estar redactados para el usuario final y clasificados en:
  - `### ✨ Añadido`
  - `### 🔧 Modificado`
  - `### 🐛 Corregido`

### 4. Licencia y Atribución
- [ ] El archivo `LICENSE` debe existir (MIT License) con copyright a `Svein (Svein05)`.

---

## 🛠️ Ejecución de la Verificación Automática

Siempre ejecuta el script de auditoría antes de sellar el release:
```bash
python scripts/audit_release.py
```
Si el script arroja cualquier `❌ ERROR`, la publicación debe detenerse de inmediato y corregirse la inconsistencia antes de hacer cualquier commit o tag.

---

## 🚀 Flujo para Crear un Release
1. Desde la rama `develop`, finalizar y probar los cambios.
2. Ejecutar el asistente de release:
   ```bash
   python scripts/release.py <X.Y.Z | patch | minor | major>
   ```
3. Merge `--no-ff` a `main` (con confirmación del usuario).
4. Sellar el tag:
   ```bash
   git tag -a vX.Y.Z -m "Release vX.Y.Z"
   ```
5. Al hacer `git push origin main --tags`, GitHub Actions ejecutará `.github/workflows/release.yml` y creará el Release oficial automáticamente.
