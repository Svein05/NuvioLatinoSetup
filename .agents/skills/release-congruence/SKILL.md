---
name: release-congruence
description: >-
  Audits and enforces exhaustive 100% congruence between the codebase implementation,
  the web application interfaces, README.md, documentation pages, and GitHub releases.
  Use this skill whenever preparing, bumping, auditing, or publishing a new release,
  or when verifying that features claimed in documentation match actual code.
---

# Release Congruence & Deep Codebase Audit Skill

Este skill establece el protocolo riguroso e inquebrantable para contrastar **todo el código fuente real** con lo declarado en `README.md`, el portal de documentación (`documentation/index.html`), las vistas web (`index.html`, `configuration/index.html`) y el sistema de versionado (`version.json`, `CHANGELOG.md`).

## 🎯 Principio Rector: Cero Discrepancias
> **"Si una funcionalidad, paso, proveedor de API, límite o URL está escrito en la documentación o en la web, el código fuente debe implementarlo con total exactitud. Si algo cambia en el código, la documentación debe reflejarlo de inmediato antes de cualquier release."**

---

## 🔍 Matriz de Contraste Profundo (Code vs Web vs Docs)

Cada vez que se prepare un release, debes contrastar los siguientes 10 vectores:

### 1. Secuencia y Títulos de Pasos
* **Web Wizard (`configuration/index.html`):**
  - Paso 1: Conexión con Cuenta de Nuvio / Modo Manual (`#step-1`)
  - Paso 2: Selección o Creación de Perfil (`#step-2`)
  - Paso 3: Mini NUVIO Colecciones Interactivas (`#step-3`)
  - Paso 4: Claves API e Integraciones (`#step-4`)
  - Paso 5: Seguridad e Inyección Automatizada (`#step-5`)
* **README (`README.md`):** Sección *"🗺️ Flujo de los 5 Pasos del Asistente"* debe tener exactamente este orden (Paso 3 = Mini Nuvio, Paso 4 = Claves API).
* **Documentación (`documentation/index.html`):** Sección *"3. Guía del Asistente en 5 Pasos"* debe mantener títulos y descripciones congruentes.

### 2. Proveedores de API Soportados
* Contrastar los 7 proveedores declarados:
  1. `TheMovieDatabase (TMDB)`: Obligatoria (`#keyTmdb`, `state.apiKeys.tmdb`)
  2. `MDBList`: Opcional pero recomendado (`#keyMdblist`, `state.apiKeys.mdblist`)
  3. `RPDB`: Opcional (`#keyRpdb`, `state.apiKeys.rpdb`)
  4. `TheTVDB`: Opcional (`#keyTvdb`, `state.apiKeys.tvdb`)
  5. `Fanart.tv`: Opcional (`#keyFanart`, `state.apiKeys.fanart`)
  6. `Google Gemini`: Opcional (`#keyGemini`, `state.apiKeys.gemini`)
  7. `OpenRouter`: Opcional (`#keyOpenrouter`, `state.apiKeys.openrouter`)

### 3. Ghost Mode de AIOMetadata
* `templates/MetadataLatino.json`: El 100% de los catálogos en `catalogs` raíz y en `config.catalogs` deben tener `"showInHome": false`.
* Ningún catálogo debe saturar el Home de Nuvio.

### 4. Carátulas HD Limpias
* `templates/MetadataLatino.json`: `customPosterUrlPattern` debe ser cadena vacía `""`.
* `js/state.js`: `posterRatingProvider` debe estar inicializado en `"none"`.

### 5. Límite de Seguridad de Perfiles
* `js/nuvio-client.js`: Límite estricto de máximo 6 perfiles permitidos en Nuvio (`>= 6`), con alertas preventivas al usuario si intenta excederlo.

### 6. Enriquecimiento Oficial y Sincronización
* `js/nuvio-client.js`: Métodos `sync_push_provider_credentials`, `tmdb_settings` y `mdblist_settings` para TV y Mobile sincronizados reactivamente.

### 7. Modo Manual sin Cuenta
* `configuration/index.html` y `js/app.js`: Botones `#btnCopyCollectionsJson` y `#btnCopyAioConfig` activos, con copia al portapapeles y validación de contraseña mínima de 4 caracteres.

### 8. Recursos Gráficos Físicos
* `templates/NuvioCollections.json`: Todas las URLs locales de `assets/collections/*.png` deben existir físicamente en el repositorio.

### 9. Sincronización Estricta de Versión
* `version.json`: `"version": "X.Y.Z"` (Fuente de la verdad)
* `js/config.js`: `VERSION: "X.Y.Z"`
* `js/version.js`: Inyección dinámica en elementos `.app-version-badge`
* `README.md`: Badge `Version-vX.Y.Z`
* `CHANGELOG.md`: Sección `## [X.Y.Z] - AAAA-MM-DD`
* `LICENSE`: Licencia MIT oficial atribuida a Svein (`Svein05`).

### 10. Enlaces Canónicos Unificados
* Discord Oficial: `https://discord.gg/EubYtJVJEc`
* Repositorio GitHub: `https://github.com/Svein05/NuvioLatinoSetup`
* GitHub Pages: `https://svein05.github.io/NuvioLatinoSetup/`

---

## 🛠️ Herramientas de Auditoría Automatizada

Antes de aprobar o empacar cualquier release, ejecuta obligatoriamente:

```bash
python scripts/deep_audit_congruence.py
```

El script validará automáticamente los 10 vectores y debe retornar:
```text
🏆 RESULTADO: CONGRUENCIA TOTAL Y ABSOLUTA (100%)
   Todas las características declaradas en README y la web coinciden
   con la implementación real del código fuente.
```

Si el resultado muestra cualquier `❌`, el proceso de release queda bloqueado hasta que el código o la documentación sean corregidos.

---

## 🚀 Flujo de Publicación de Release

1. **Desarrollo:** Trabajar en rama `feature/` o `bugfix/` derivada de `develop`.
2. **Ejecutar auditoría:** `python scripts/deep_audit_congruence.py`.
3. **Bump de versión:** `python scripts/release.py <minor|patch|major>`.
4. **Merge a develop:** `git checkout develop && git merge --no-ff <rama>`.
5. **Aprobación del usuario:** Solicitar confirmación explícita antes de tocar `main`.
6. **Merge a main y Tag:**
   ```bash
   git checkout main
   git merge --no-ff develop -m "merge: release vX.Y.Z"
   git tag -a vX.Y.Z -m "Release vX.Y.Z"
   ```
7. **Publicación:** `git push origin main --tags` activa el workflow automatizado de GitHub Actions.
