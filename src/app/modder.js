import { CONFIG } from './config.js';
import {
  loadAvatarsCatalog,
  getCompiledAvatars,
  getStylesSummary,
  getFranchisesSummary,
  resolveAvatarCdnUrl,
  patchAvatarsAfterPublish,
} from './avatar-catalog.js';
import {
  getModderSession,
  clearModderSession,
  buildStagedItemsBreakdown,
  consolidateStagedOperations,
} from '../features/avatars/index.js';
import { createModderClient } from '../integrations/worker/modder-client.js';
import { convertToWebp } from '../shared/media/image-converter.js';
import { createModderController } from '../pages/modder/modder-controller.js';
import { showModderToast } from '../pages/modder/ui/modder-toast.js';
import { renderPublishBreakdown } from '../pages/modder/ui/publish-modal.js';
import {
  bindTabs,
  bindUploadInputs,
  bindBatchQueueActions,
  bindEditModalEvents,
  bindPublishModalEvents,
} from './modder-events.js';

export function createModderApp() {
  const session = getModderSession();
  const client = createModderClient({ baseUrl: CONFIG.WORKER_API_URL });

  const controller = createModderController({
    client,
    session,
    loadCatalog: loadAvatarsCatalog,
    getAvatars: getCompiledAvatars,
    getStyles: getStylesSummary,
    getFranchises: getFranchisesSummary,
    resolveCdnUrl: resolveAvatarCdnUrl,
    patchCatalog: patchAvatarsAfterPublish,
  });

  return { session, client, controller };
}

async function populateSelects() {
  await loadAvatarsCatalog();
  const styles = (getStylesSummary() || []).filter(s => s.id !== 'all');
  const franchises = (getFranchisesSummary() || []).filter(f => f.id !== 'all');

  const styleSelect = document.getElementById('selectStyle');
  if (styleSelect) {
    styleSelect.innerHTML = `<option value="">-- Selecciona un estilo --</option>${styles.map(s => `<option value="${s.id}">${s.name} (${s.count} avatares)</option>`).join('')}`;
  }
  const franchiseSelect = document.getElementById('selectFranchise');
  if (franchiseSelect) {
    franchiseSelect.innerHTML = `<option value="">-- Selecciona una franquicia / obra --</option>${franchises.map(f => `<option value="${f.id}">${f.name} (${f.count} avatares)</option>`).join('')}<option value="__NEW__">➕ Crear nueva franquicia...</option>`;
  }

  const manageStyleSelect = document.getElementById('manageStyleSelect');
  if (manageStyleSelect) {
    manageStyleSelect.innerHTML = `<option value="all">Todos los estilos (${getCompiledAvatars().length})</option>${styles.map(s => `<option value="${s.id}">${s.name} (${s.count})</option>`).join('')}`;
  }
}

function updateStep2Visibility(controller) {
  const step2 = document.getElementById('stepDropzoneCard');
  if (!step2) return;
  const styleSelected = Boolean(controller.modderState.selectedStyle);
  const inputNew = document.getElementById('inputNewFranchise');
  const franchiseSelected = controller.modderState.isNewFranchise
    ? Boolean(inputNew && inputNew.value.trim().length > 0)
    : Boolean(controller.modderState.selectedFranchise && controller.modderState.selectedFranchise !== '__NEW__');
  step2.classList.toggle('hidden', !(styleSelected && franchiseSelected));
}

async function handleIncomingFiles(controller, files) {
  const validFiles = Array.from(files || []).filter(f => /\.(jpe?g|png|webp|svg|bmp)$/i.test(f.name));
  for (const file of validFiles) {
    try {
      const converted = await convertToWebp(file, 0.90);
      const dotIdx = file.name.lastIndexOf('.');
      const rawBase = dotIdx !== -1 ? file.name.substring(0, dotIdx) : file.name;
      controller.modderState.filesQueue.push({
        id: `f_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        originalFile: file,
        base64: converted.base64,
        originalSize: file.size,
        webpSize: converted.webpSize,
        previewUrl: converted.previewUrl,
        originalName: file.name,
        fileName: `${rawBase}.webp`,
        characterName: rawBase,
      });
    } catch (err) {
      console.error(err);
    }
  }
  controller.renderQueue();
  controller.updateToolbar();
}

function bindNavigation(controller) {
  document.getElementById('btnLogoutModder')?.addEventListener('click', () => {
    clearModderSession();
    window.location.replace('../account/');
  });
  document.getElementById('btnBackToCollections')?.addEventListener('click', () => controller.closeDetail());

  document.getElementById('manageSearchInput')?.addEventListener('input', (e) => {
    controller.modderState.catalogFilters.query = e.target.value;
    controller.renderCatalog();
  });
  document.getElementById('detailSearchInput')?.addEventListener('input', (e) => {
    controller.modderState.detailSearchQuery = e.target.value;
    controller.renderCatalog();
  });
  document.getElementById('manageStyleSelect')?.addEventListener('change', (e) => {
    controller.modderState.catalogFilters.style = e.target.value;
    controller.modderState.activeCollection = null;
    controller.renderCatalog();
  });

  const refreshCatalog = async () => {
    await loadAvatarsCatalog(true);
    await populateSelects();
    controller.renderCatalog();
    showModderToast(`✓ Catálogo sincronizado con GitHub (${getCompiledAvatars().length} avatares).`, 'success');
  };
  document.getElementById('btnRefreshCatalog')?.addEventListener('click', refreshCatalog);
  document.getElementById('btnRefreshDetailCatalog')?.addEventListener('click', refreshCatalog);
}

export async function initModderPage() {
  const { session, client, controller } = createModderApp();
  if (!session?.token) {
    window.location.replace('../account/');
    return;
  }
  bindTabs(controller);
  bindUploadInputs(controller, () => updateStep2Visibility(controller));
  bindBatchQueueActions(controller, (files) => handleIncomingFiles(controller, files));
  bindEditModalEvents(controller);
  bindPublishModalEvents(controller, {
    client,
    getAvatars: getCompiledAvatars,
    patchCatalog: patchAvatarsAfterPublish,
    renderBreakdown: () => {
      const ops = consolidateStagedOperations({
        history: controller.stagedState.history,
        overrides: controller.stagedState.avatarOverrides,
        allAvatars: getCompiledAvatars(),
      });
      const items = buildStagedItemsBreakdown({
        history: controller.stagedState.history,
        overrides: controller.stagedState.avatarOverrides,
        allAvatars: getCompiledAvatars(),
        resolveCdnUrl: resolveAvatarCdnUrl,
      });
      renderPublishBreakdown(items, ops, (key) => controller.discardItem(key));
    },
  });
  bindNavigation(controller);

  await populateSelects();
  controller.renderCatalog();
  controller.updateToolbar();
}
