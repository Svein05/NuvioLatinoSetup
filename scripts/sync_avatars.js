/**
 * Sincronizador Automático de Catálogo de Avatares
 * Ecosistema Nuvio Metadata Latino & AIOMetadata
 * 
 * Uso: node scripts/sync_avatars.js
 * 
 * Lee el árbol de carpetas en `assets/profile_icons/` y actualiza automáticamente
 * el registro `RAW_AVATAR_REGISTRY` y `AVATAR_FRANCHISE_LABELS` en `js/avatars-data.js`.
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const ICONS_DIR = path.join(ROOT_DIR, 'assets', 'profile_icons');
const TARGET_FILE = path.join(ROOT_DIR, 'js', 'avatars-data.js');

const VALID_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.svg']);

function syncAvatars() {
  if (!fs.existsSync(ICONS_DIR)) {
    console.error(`[sync_avatars] Carpeta no encontrada: ${ICONS_DIR}`);
    process.exit(1);
  }

  const styles = fs.readdirSync(ICONS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory() && !d.name.startsWith('.'))
    .map(d => d.name)
    .sort();

  const registry = [];
  const foundFranchises = new Set();
  let totalFiles = 0;

  for (const style of styles) {
    const styleDir = path.join(ICONS_DIR, style);
    const franchises = fs.readdirSync(styleDir, { withFileTypes: true })
      .filter(d => d.isDirectory() && !d.name.startsWith('.'))
      .map(d => d.name)
      .sort();

    for (const franchise of franchises) {
      foundFranchises.add(franchise);
      const franchiseDir = path.join(styleDir, franchise);
      const files = fs.readdirSync(franchiseDir, { withFileTypes: true })
        .filter(f => f.isFile() && !f.name.startsWith('.') && !/desktop\.ini$/i.test(f.name))
        .map(f => f.name)
        .filter(name => VALID_EXTENSIONS.has(path.extname(name).toLowerCase()))
        .sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));

      if (files.length > 0) {
        totalFiles += files.length;
        registry.push({
          style,
          franchise,
          files
        });
      }
    }
  }

  console.log(`[sync_avatars] Escaneados ${totalFiles} archivos en ${registry.length} grupos (${styles.length} estilos, ${foundFranchises.size} obras).`);

  // Actualizar assets/profile_icons/manifest.json
  const manifestPath = path.join(ICONS_DIR, 'manifest.json');
  const manifestStyles = [];
  for (const style of styles) {
    const styleGroups = registry.filter(r => r.style === style);
    manifestStyles.push({
      style,
      franchises: styleGroups.map(g => ({
        franchise: g.franchise,
        files: g.files
      }))
    });
  }
  const manifestData = {
    updatedAt: new Date().toISOString(),
    styles: manifestStyles
  };
  fs.writeFileSync(manifestPath, JSON.stringify(manifestData, null, 2), 'utf-8');
  console.log(`[sync_avatars] ✓ ${manifestPath} actualizado.`);

  if (fs.existsSync(TARGET_FILE)) {
    let content = fs.readFileSync(TARGET_FILE, 'utf-8');

    // 1. Actualizar AVATAR_FRANCHISE_LABELS si existe en TARGET_FILE
    const franchiseMatch = content.match(/export const AVATAR_FRANCHISE_LABELS = {([\s\S]*?)};/);
    if (franchiseMatch) {
      const existingLabels = {};
      const lines = franchiseMatch[1].split('\n');
      for (const line of lines) {
        const m = line.match(/^\s*([A-Za-z0-9_]+)\s*:\s*['"](.*)['"]/);
        if (m) {
          existingLabels[m[1]] = m[2];
        }
      }

      existingLabels['all'] = existingLabels['all'] || 'Todas las obras';
      for (const f of foundFranchises) {
        if (!existingLabels[f]) {
          existingLabels[f] = f.replace(/([a-z])([A-Z])/g, '$1 $2').trim();
        }
      }

      const sortedKeys = Object.keys(existingLabels).sort((a, b) => {
        if (a === 'all') return -1;
        if (b === 'all') return 1;
        return a.localeCompare(b);
      });

      const newLabelsBlock = `export const AVATAR_FRANCHISE_LABELS = {\n` +
        sortedKeys.map(k => `  ${k}: '${existingLabels[k]}'`).join(',\n') +
        `\n};`;

      content = content.replace(/export const AVATAR_FRANCHISE_LABELS = {[\s\S]*?};/, newLabelsBlock);
    }

    // 2. Actualizar RAW_AVATAR_REGISTRY si existe en TARGET_FILE
    if (content.includes('export const RAW_AVATAR_REGISTRY =')) {
      const registryJsonFormatted = JSON.stringify(registry, null, 2)
        .replace(/"style":/g, 'style:')
        .replace(/"franchise":/g, 'franchise:')
        .replace(/"files":/g, 'files:')
        .replace(/"([^"]+)":/g, '$1:');

      const newRegistryBlock = `export const RAW_AVATAR_REGISTRY = ${registryJsonFormatted};`;
      content = content.replace(/export const RAW_AVATAR_REGISTRY = \[[\s\S]*?\];/, newRegistryBlock);
    }

    fs.writeFileSync(TARGET_FILE, content, 'utf-8');
    console.log(`[sync_avatars] ✓ ${TARGET_FILE} sincronizado con éxito.`);
  }
}

syncAvatars();
