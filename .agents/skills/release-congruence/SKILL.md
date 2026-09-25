---
name: release-congruence
description: >-
  Audits and enforces exhaustive 100% congruence between the codebase implementation,
  the web application interfaces, README.md, documentation pages, and GitHub releases
  through direct, manual inspection by the agent. Use this skill whenever preparing,
  bumping, auditing, or publishing a new release.
---

# Release Congruence & Manual Inspection Protocol

Este skill define el protocolo obligatorio de **inspección manual y análisis cognitivo directo** que el asistente debe realizar personalmente cada vez que se prepare, incremente o publique un nuevo **Release** o versión del proyecto.

> [!CAUTION]
> **PROHIBICIÓN ESTRICTA DE SCRIPTS DE AUDITORÍA DESECHABLES:**
> NUNCA crees ni utilices scripts temporales de Python/Bash para intentar delegar la verificación mediante expresiones regulares o pattern-matching. Los scripts pueden generar falsos positivos, fallos silenciosos y ensucian el repositorio público con archivos poco profesionales.
> **TÚ, como asistente de ingeniería, debes leer directamente los archivos con `view_file` y contrastar cada punto con juicio crítico.**

---

## 🎯 Principio Fundamental
**"Lo que dice la documentación debe coincidir con total exactitud con lo que hace y muestra la aplicación web y con el código fuente real."**

Si una característica, proveedor, paso o URL cambia en el código, debes actualizar la documentación de inmediato. Si la documentación promete algo, el código debe implementarlo de forma verificable.

---

## 📋 Protocolo de Inspección Manual en 10 Puntos

Antes de proponer cualquier release o merge a `main`, abre y lee manualmente (`view_file`) los archivos indicados en cada punto:

### 1. Flujo de los 5 Pasos (Web vs README vs Docs)
* **Archivos a inspeccionar:**
  - `configuration/index.html` (buscar IDs `step-1`, `step-2`, `step-3`, `step-4`, `step-5`)
  - `README.md` (sección *"🗺️ Flujo de los 5 Pasos del Asistente"*)
  - `documentation/index.html` (sección *"3. Guía del Asistente en 5 Pasos"*)
* **Verificar manualmente:**
  - Paso 1: Cuenta Nuvio / Modo Manual
  - Paso 2: Selección / Creación de Perfil (Omitido en Modo Manual)
  - Paso 3: Mini NUVIO Colecciones Interactivas
  - Paso 4: Claves API e Integraciones (TMDB, MDBList, etc.)
  - Paso 5: Seguridad de Addon e Inyección / Modo Manual

### 2. Proveedores de API e Integraciones
* **Archivos a inspeccionar:**
  - `configuration/index.html` (inputs `#keyTmdb`, `#keyMdblist`, `#keyRpdb`, `#keyTvdb`, `#keyFanart`, `#keyGemini`, `#keyOpenrouter`)
  - `js/state.js` (objeto `apiKeys`)
  - `README.md` (tabla *"🔑 Proveedores de Metadatos Soportados"*)
* **Verificar manualmente:**
  - TMDB catalogado como **Obligatoria** para metadatos en español latino.
  - MDBList catalogado como **Recomendado** para calificaciones en TV y Mobile.
  - Enlaces de obtención y etiquetas congruentes sin redundancias.

### 3. Ghost Mode de AIOMetadata
* **Archivos a inspeccionar:**
  - `templates/MetadataLatino.json`
* **Verificar manualmente:**
  - Los catálogos en `catalogs` (tanto en la raíz como dentro del bloque `config`) deben tener `"showInHome": false` para evitar saturación de la pantalla principal de Nuvio.

### 4. Carátulas HD Limpias
* **Archivos a inspeccionar:**
  - `templates/MetadataLatino.json`
  - `js/state.js`
* **Verificar manualmente:**
  - `customPosterUrlPattern` debe ser cadena vacía `""` (sin overlays forzados de terceros).
  - `posterRatingProvider` debe estar inicializado en `"none"`.

### 5. Límite de Seguridad de Perfiles
* **Archivos a inspeccionar:**
  - `js/nuvio-client.js`
  - `js/app.js`
* **Verificar manualmente:**
  - Verificación del límite de seguridad (`profiles.length >= 6`) con toasts informativos de advertencia para no exceder los 6 perfiles permitidos en Nuvio.

### 6. Enriquecimiento TMDB y Ratings MDBList
* **Archivos a inspeccionar:**
  - `js/nuvio-client.js`
* **Verificar manualmente:**
  - Sincronización oficial de credenciales (`sync_push_provider_credentials`) y blobs de configuración para plataformas `tv` y `mobile` activando `tmdb_settings` y `mdblist_settings`.

### 7. Modo Manual sin Cuenta Nuvio
* **Archivos a inspeccionar:**
  - `configuration/index.html` (`#manualModeContainer`, `#btnCopyCollectionsJson`, `#btnCopyAioConfig`)
  - `js/app.js` (métodos de copia al portapapeles y validación de contraseña mínima de 4 caracteres)
* **Verificar manualmente:**
  - El botón de copiar metadata debe estar deshabilitado reactivamente hasta ingresar una contraseña válida.

### 8. Recursos Gráficos Físicos de Colecciones
* **Archivos a inspeccionar:**
  - `templates/NuvioCollections.json`
  - Carpeta `assets/collections/`
* **Verificar manualmente:**
  - Que los logos, backdrops y carátulas locales referenciados existan en el disco.

### 9. Versionado Semántico Unificado (SemVer)
* **Archivos a inspeccionar:**
  - `version.json` (única fuente de verdad: `"version": "X.Y.Z"`)
  - `js/config.js` (`VERSION: "X.Y.Z"`)
  - `js/version.js` (script dinámico que alimenta a `.app-version-badge`)
  - `index.html`, `configuration/index.html`, `documentation/index.html` (badges que muestran `vX.Y.Z` y enlazan a Releases)
  - `README.md` (badge de Shields.io `Version-vX.Y.Z`)
  - `CHANGELOG.md` (sección `## [X.Y.Z] - AAAA-MM-DD` con notas claras)
  - `LICENSE` (Licencia MIT oficial con créditos a `Svein (Svein05)`)

### 10. Enlaces Canónicos Unificados
* **Verificar manualmente:**
  - Discord: `https://discord.gg/EubYtJVJEc`
  - Repositorio GitHub: `https://github.com/Svein05/NuvioLatinoSetup`
  - GitHub Pages: `https://svein05.github.io/NuvioLatinoSetup/`

---

## 🚀 Flujo para Crear y Publicar un Release

1. **Trabajar en sub-rama:** `feature/` o `bugfix/` nacida de `develop`.
2. **Ejecutar la Inspección Manual en 10 Puntos:** Leer manualmente cada archivo y contrastar.
3. **Actualizar la versión:** Modificar manualmente `version.json`, `js/config.js`, `CHANGELOG.md`, `README.md` y los HTMLs.
4. **Merge a `develop`:** `git checkout develop && git merge --no-ff <rama>`.
5. **Solicitar autorización:** Esperar la aprobación explícita del usuario antes de tocar `main`.
6. **Merge a `main` y etiquetado:**
   ```bash
   git checkout main
   git merge --no-ff develop -m "merge: release vX.Y.Z into main"
   git tag -a vX.Y.Z -m "Release vX.Y.Z"
   ```
7. **Publicación:** `git push origin main --tags` (solo si el usuario lo solicita y existe remoto).
