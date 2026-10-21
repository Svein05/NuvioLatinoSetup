import { createLifetime } from '../../../shared/ui/lifetime.js';
import { getBadgePackById, getBadgePackUrl, getCanonicalModuleId, getBadgeModuleLabel, isSectionActive } from '../../../features/badges/index.js';
import { renderBadgeModulesUI, renderBadgesGrid, fitBadgesDynamically } from './badges-view.js';
import { importCustomBadgeFromSource } from './badges-import.js';

const DEFAULT_MODULES = ['gr', 'gq', 'gv', 'ga', 'gc', 'ge', 'glang', 'gsub', 'gst', 'gs', 'gms'];

function reorderModules(order, activeIds, id, delta) {
  const activeSet = new Set(activeIds);
  const activeOrdered = order.filter(x => isSectionActive(x, activeSet));
  const curIdx = activeOrdered.indexOf(id);
  const targetIdx = curIdx + delta;
  if (curIdx < 0 || targetIdx < 0 || targetIdx >= activeOrdered.length) return order;

  const targetId = activeOrdered[targetIdx];
  const nextOrder = [...order];
  const globalCur = nextOrder.indexOf(id);
  const globalTarget = nextOrder.indexOf(targetId);
  if (globalCur >= 0 && globalTarget >= 0) {
    nextOrder[globalCur] = targetId;
    nextOrder[globalTarget] = id;
  }
  return nextOrder;
}

function downloadJsonFile(filename, jsonStr) {
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function updateSelectedPack(state, packId) {
  state.preferences.selectedBadgePack = packId;
  const pack = getBadgePackById(packId);
  if (!pack?.sections) return;
  if (!state.preferences.badgeModulesOrder) state.preferences.badgeModulesOrder = [...DEFAULT_MODULES];
  pack.sections.forEach(sec => {
    const canon = getCanonicalModuleId(sec.id);
    if (!state.preferences.badgeModulesOrder.includes(sec.id) && !state.preferences.badgeModulesOrder.includes(canon)) {
      state.preferences.badgeModulesOrder.push(sec.id);
    }
  });
}

function updateToggledModule(state, id, isChecked) {
  if (!state.preferences.activeBadgeModules) state.preferences.activeBadgeModules = [...DEFAULT_MODULES];
  const canon = getCanonicalModuleId(id);
  if (isChecked) {
    if (!state.preferences.activeBadgeModules.includes(id)) state.preferences.activeBadgeModules.push(id);
    if (canon && canon !== id && !state.preferences.activeBadgeModules.includes(canon)) state.preferences.activeBadgeModules.push(canon);
  } else {
    state.preferences.activeBadgeModules = state.preferences.activeBadgeModules.filter(x => x !== id && getCanonicalModuleId(x) !== canon);
  }
}

async function performCustomBadgeImport({ root, state, actions, render }) {
  const srcInput = root.querySelector?.('#inputCustomBadgeSource');
  const nameInput = root.querySelector?.('#inputCustomBadgeName');
  const errBox = root.querySelector?.('#customBadgeError');
  const errText = root.querySelector?.('#customBadgeErrorText');
  if (errBox) errBox.classList.add('hidden');
  const source = (srcInput?.value || '').trim();
  if (!source) {
    if (errBox && errText) { errText.textContent = 'Ingresa una URL válida o pega el JSON.'; errBox.classList.remove('hidden'); }
    srcInput?.focus();
    return;
  }
  try {
    const pack = await importCustomBadgeFromSource(source, (nameInput?.value || '').trim());
    if (!state.preferences.activeBadgeModules) state.preferences.activeBadgeModules = [...DEFAULT_MODULES];
    if (!state.preferences.badgeModulesOrder) state.preferences.badgeModulesOrder = [...DEFAULT_MODULES];
    pack.sections.forEach(s => {
      if (!state.preferences.activeBadgeModules.includes(s.id)) state.preferences.activeBadgeModules.push(s.id);
      if (!state.preferences.badgeModulesOrder.includes(s.id)) state.preferences.badgeModulesOrder.push(s.id);
    });
    state.preferences.selectedBadgePack = pack.id;
    render();
    if (srcInput) srcInput.value = '';
    if (nameInput) nameInput.value = '';
    actions.notify?.(`¡Estilo "${pack.name}" importado y seleccionado con éxito!`, 'success');
  } catch (err) {
    if (errBox && errText) { errText.textContent = `Error al importar: ${err.message}`; errBox.classList.remove('hidden'); }
  }
}

function renderStepBadges(root, state, lifetime) {
  const prefs = state.preferences || {};
  const active = prefs.activeBadgeModules || DEFAULT_MODULES;
  const order = prefs.badgeModulesOrder || DEFAULT_MODULES;
  renderBadgeModulesUI(root, { activeIds: active, orderIds: order, selectedPackId: prefs.selectedBadgePack || 'tinted' });
  renderBadgesGrid(root, { selectedPackId: prefs.selectedBadgePack || 'tinted', activeIds: active, orderIds: order });
  lifetime.timeout(() => fitBadgesDynamically(root), 150);
}

export function mountBadgesStep({ state, actions, root = document } = {}) {
  const lifetime = createLifetime();
  let fitDebounce = null;
  const render = () => renderStepBadges(root, state, lifetime);

  const getCompiledJson = async (packId) => {
    const id = packId || state.preferences.selectedBadgePack || 'tinted';
    const active = state.preferences.activeBadgeModules || DEFAULT_MODULES;
    const order = state.preferences.badgeModulesOrder || DEFAULT_MODULES;
    const rules = await actions.compileBadgeRules(id, active, order);
    return JSON.stringify(rules, null, 2);
  };

  return {
    render,
    selectPack: (id) => { updateSelectedPack(state, id); render(); actions.onUpdate?.(); },
    toggleModule: (id, chk) => {
      updateToggledModule(state, id, chk);
      render();
      actions.onUpdate?.();
      actions.notify?.(chk ? `Módulo "${getBadgeModuleLabel(id)}" activado` : `Módulo "${getBadgeModuleLabel(id)}" desactivado`, 'info');
    },
    moveModule: (id, delta) => {
      const active = state.preferences.activeBadgeModules || DEFAULT_MODULES;
      state.preferences.badgeModulesOrder = reorderModules(state.preferences.badgeModulesOrder || DEFAULT_MODULES, active, id, delta);
      render();
    },
    copyJsonUrl: async (packId) => {
      const id = packId || state.preferences.selectedBadgePack || 'tinted';
      const pack = getBadgePackById(id);
      const text = pack.isCustom && !pack.rawV2 && pack.customJson ? JSON.stringify(pack.customJson, null, 2) : getBadgePackUrl(id);
      await navigator.clipboard.writeText(text);
      actions.notify?.(`✓ Datos de "${pack.name}" copiados al portapapeles`, 'success');
    },
    getCompiledJson,
    copyCompiledJson: async (packId) => {
      await navigator.clipboard.writeText(await getCompiledJson(packId));
      actions.notify?.('✓ JSON de Badges copiado con tu orden y módulos activos', 'success');
    },
    downloadCompiledJson: async (packId) => {
      const id = packId || state.preferences.selectedBadgePack || 'tinted';
      const pack = getBadgePackById(id);
      downloadJsonFile(`nuvio-badges-${(pack?.name || id).toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json`, await getCompiledJson(id));
      actions.notify?.(`✓ Archivo de badges ("${pack?.name || id}") descargado con éxito`, 'success');
    },
    handleImport: () => performCustomBadgeImport({ root, state, actions, render }),
    handleImgLoaded: () => {
      if (fitDebounce) clearTimeout(fitDebounce);
      fitDebounce = setTimeout(() => fitBadgesDynamically(root), 40);
    },
    fit: () => fitBadgesDynamically(root),
    dispose: () => lifetime.dispose(),
  };
}
