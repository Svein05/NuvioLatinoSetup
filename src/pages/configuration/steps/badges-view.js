import { wizardAction } from '../commands.js';
import {
  listBadgePacks,
  getBadgePackById,
  BADGE_MODULE_DEFINITIONS,
  getBadgeModuleLabel,
  getPackSectionsOrdered,
  getCanonicalModuleId,
  isSectionActive,
} from '../../../features/badges/index.js';

function collectModuleDefinitions(selectedPackId) {
  const allModulesMap = new Map();
  BADGE_MODULE_DEFINITIONS.forEach(def => allModulesMap.set(def.id, def));
  const currentPack = getBadgePackById(selectedPackId || 'tinted');
  if (currentPack?.sections) {
    currentPack.sections.forEach(sec => {
      const canonId = getCanonicalModuleId(sec.id);
      if (!allModulesMap.has(canonId) && !allModulesMap.has(sec.id)) {
        allModulesMap.set(sec.id, { id: sec.id, labelEs: getBadgeModuleLabel(sec.id, sec.name), defaultActive: true });
      }
    });
  }
  return Array.from(allModulesMap.values());
}

export function renderBadgeModulesUI(root = document, { activeIds = [], orderIds = [], selectedPackId = 'tinted' } = {}) {
  const containerCheckboxes = root.querySelector ? root.querySelector('#badgeModulesCheckboxes') : null;
  const containerOrderBar = root.querySelector ? root.querySelector('#badgeModulesOrderBar') : null;
  const activeSet = new Set(activeIds);
  const moduleDefs = collectModuleDefinitions(selectedPackId);

  if (containerCheckboxes) {
    containerCheckboxes.innerHTML = moduleDefs.map(def => {
      const isChecked = isSectionActive(def.id, activeSet);
      return `
        <label class="badge-module-pill flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:border-white/20 cursor-pointer text-xs text-white/70 hover:text-white transition-all select-none">
          <input type="checkbox" ${isChecked ? 'checked' : ''} ${wizardAction('toggleBadgeModule', def.id)} data-wizard-event="change" class="sr-only">
          <div class="w-4 h-4 rounded-md border border-white/30 flex items-center justify-center transition-all check-indicator">
            <i class="fa-solid fa-check text-[10px] text-[#08090c] ${isChecked ? 'opacity-100' : 'opacity-0'} transition-opacity"></i>
          </div>
          <span class="font-medium">+ ${def.labelEs}</span>
        </label>
      `;
    }).join('');
  }

  if (containerOrderBar) {
    const activeOrdered = orderIds.filter(id => isSectionActive(id, activeSet));
    if (activeOrdered.length === 0) {
      containerOrderBar.innerHTML = `<span class="text-[11px] text-white/40 italic">Ningún módulo activado. Marca categorías arriba para incluirlas y ordenarlas.</span>`;
    } else {
      containerOrderBar.innerHTML = activeOrdered.map((id, idx) => {
        const isFirst = idx === 0;
        const isLast = idx === activeOrdered.length - 1;
        const label = getBadgeModuleLabel(id);
        return `
          <div class="badge-order-chip">
            <span class="font-mono text-[10px] text-[#ffd479]">${idx + 1}.</span>
            <span>${label}</span>
            <div class="flex items-center gap-1 ml-1">
              <button type="button" ${isFirst ? 'disabled' : ''} ${wizardAction('moveBadgeModule', id, -1)} class="badge-order-btn" title="Mover a la izquierda / antes">
                <i class="fa-solid fa-chevron-left"></i>
              </button>
              <button type="button" ${isLast ? 'disabled' : ''} ${wizardAction('moveBadgeModule', id, 1)} class="badge-order-btn" title="Mover a la derecha / después">
                <i class="fa-solid fa-chevron-right"></i>
              </button>
            </div>
          </div>
        `;
      }).join('');
    }
  }
}

function renderBadgeChip(b, secId) {
  const isFlag = secId === 'glang' || secId === 'gl' || secId === 'lang';
  const isSub = secId === 'gsub' || secId === 'sub';
  const imgClass = isFlag
    ? 'badge-flag-img h-3.5 max-h-[15px] w-[21px] object-contain block shrink-0'
    : (isSub ? 'badge-sub-img h-3.5 max-h-[15px] min-w-[28px] w-auto object-contain block shrink-0' : 'h-3.5 max-h-[15px] w-auto object-contain block shrink-0');
  const widthAttr = isFlag ? 'width="21"' : '';

  return `
    <span class="badge-chip inline-flex items-center justify-center px-2 py-1 rounded-md text-[10.5px] font-bold font-mono tracking-wide border shadow-sm transition-transform hover:scale-105 shrink-0"
          style="background-color: ${b.bg}; border-color: ${b.border}; color: ${b.text};"
          title="${b.name}">
      ${b.img ? `<img src="${b.img}" alt="${b.name}" ${widthAttr} height="14" class="${imgClass}" loading="eager" decoding="async" data-badge-image><span style="display:none;">${b.name}</span>` : `<span>${b.name}</span>`}
    </span>
  `;
}

function renderSectionBox(sec) {
  const titleEs = getBadgeModuleLabel(sec.id, sec.name).toUpperCase();
  const total = sec.total || sec.items?.length || 0;
  const badgesHtml = (sec.items || []).map(b => renderBadgeChip(b, sec.id)).join('');

  return `
    <div class="badge-section-box bg-black/50 border border-white/[0.06] rounded-xl p-2.5 flex flex-col justify-start gap-1.5 flex-1 min-w-[190px] sm:min-w-[210px]">
      <div class="flex items-center justify-between text-[10px] font-mono uppercase text-white/50 font-semibold shrink-0">
        <span class="truncate">${titleEs}</span>
        <span class="badge-hidden-counter text-[9px] text-[#ffd479] font-bold font-mono shrink-0 ml-1" data-total="${total}">${sec.hiddenCount > 0 ? `+${sec.hiddenCount}` : ''}</span>
      </div>
      <div class="badges-flow-container relative flex flex-wrap items-center gap-1.5 content-start">
        ${badgesHtml}
      </div>
    </div>
  `;
}

export function renderBadgesGrid(root = document, { selectedPackId = 'tinted', activeIds = [], orderIds = [] } = {}) {
  const container = root.querySelector ? root.querySelector('#badgesGrid') : null;
  if (!container) return;

  container.innerHTML = listBadgePacks().map(pack => {
    const isSelected = pack.id === selectedPackId;
    const borderClass = isSelected
      ? 'border-[#ffd479] bg-white/[0.07] shadow-[0_0_25px_rgba(255,212,121,0.22)]'
      : 'border-white/[0.08] bg-white/[0.02] hover:border-white/20';

    const checkIcon = isSelected
      ? `<div class="w-5 h-5 rounded-full border-2 border-[#ffd479] bg-[#ffd479] flex items-center justify-center text-[10px] text-[#08090c] font-bold shadow-sm"><i class="fa-solid fa-check"></i></div>`
      : `<div class="w-5 h-5 rounded-full border-2 border-white/20 bg-transparent flex items-center justify-center text-[10px] text-transparent"><i class="fa-solid fa-check"></i></div>`;

    const visibleSections = getPackSectionsOrdered(pack, activeIds, orderIds);
    const sectionsHtml = visibleSections.map(renderSectionBox).join('');

    return `
      <div ${wizardAction('selectBadgePack', pack.id)} class="badge-pack-card relative p-5 rounded-[24px] border-2 ${borderClass} cursor-pointer transition-all flex flex-col justify-between gap-3.5 group shadow-[var(--shadow-lift)]">
        <div class="space-y-3">
          <div class="flex items-start justify-between gap-3">
            <div>
              <div class="flex items-center gap-2">
                <h4 class="text-sm font-semibold text-white tracking-wide">${pack.name}</h4>
                ${isSelected ? '<span class="text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-[#ffd479]/20 text-[#ffd479] border border-[#ffd479]/30">Activo</span>' : ''}
                ${pack.isCustom ? '<span class="text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Personalizado</span>' : ''}
              </div>
              <div class="flex items-center gap-1.5 text-[11px] text-white/50 pt-0.5">
                <i class="fa-brands fa-github text-[#ffd479]"></i>
                <span>Hecho por ${pack.authorUrl && pack.authorUrl !== '#' ? `<a href="${pack.authorUrl}" target="_blank" rel="noopener noreferrer" data-wizard-stop class="text-[#ffd479] hover:underline font-medium">${pack.author}</a>` : `<span class="text-[#ffd479] font-medium">${pack.author}</span>`}</span>
              </div>
            </div>
            ${checkIcon}
          </div>
          <div class="flex flex-wrap gap-2 pt-0.5">
            ${sectionsHtml}
          </div>
        </div>
        <div class="pt-3 border-t border-white/[0.06] flex items-center justify-end gap-2 flex-wrap">
          ${pack.rawV2 ? `
            <button type="button" ${wizardAction('copyBadgeJsonUrl', pack.id)} class="py-1.5 px-2.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] text-white/50 hover:text-white/80 text-[11px] border border-white/[0.06] flex items-center justify-center gap-1.5 transition-all cursor-pointer" title="Copiar URL directa original">
              <i class="fa-solid fa-link text-[10px]"></i>
              <span>Enlace</span>
            </button>
          ` : ''}
          <button type="button" ${wizardAction('downloadCompiledBadgeJson', pack.id)} class="py-1.5 px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white/80 hover:text-white text-xs border border-white/[0.08] flex items-center justify-center gap-1.5 transition-all cursor-pointer" title="Descargar archivo JSON optimizado con tu orden y módulos activos">
            <i class="fa-solid fa-download text-[11px]"></i>
            <span>Descargar</span>
          </button>
          <button type="button" ${wizardAction('copyCompiledBadgeJson', pack.id)} class="py-1.5 px-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-white hover:text-white text-xs border border-white/[0.12] flex items-center justify-center gap-1.5 transition-all font-medium cursor-pointer" title="Copiar código JSON sanitizado con tu orden y módulos activos">
            <i class="fa-solid fa-copy text-[11px]"></i>
            <span>Copiar JSON</span>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

export function fitBadgesDynamically(root = document) {
  const boxes = root.querySelectorAll ? root.querySelectorAll('.badge-section-box') : [];
  if (!boxes.length) return;

  boxes.forEach(box => {
    const flow = box.querySelector('.badges-flow-container');
    const counterEl = box.querySelector('.badge-hidden-counter');
    if (!flow) return;
    const chips = Array.from(flow.querySelectorAll('.badge-chip'));
    if (!chips.length) return;

    chips.forEach(c => { c.style.display = ''; });
    const flowRect = flow.getBoundingClientRect();
    if (!flowRect || flowRect.width <= 0) return;

    const firstTop = chips[0].offsetTop;
    let secondTop = null;
    let reachedLimit = false;

    for (let i = 0; i < chips.length; i++) {
      const c = chips[i];
      if (reachedLimit) { c.style.display = 'none'; continue; }
      const top = c.offsetTop;
      if (top > firstTop + 4 && secondTop === null) secondTop = top;
      if ((secondTop !== null && top > secondTop + 4) || (c.getBoundingClientRect().right > flowRect.right + 2)) {
        reachedLimit = true;
        c.style.display = 'none';
      }
    }

    const hiddenInDom = chips.filter(c => c.style.display === 'none').length;
    const visibleCount = chips.length - hiddenInDom;
    const totalCount = counterEl ? (parseInt(counterEl.dataset.total, 10) || chips.length) : chips.length;
    const hiddenCount = hiddenInDom > 0 ? Math.max(hiddenInDom, totalCount - visibleCount) : 0;

    if (counterEl) {
      counterEl.innerText = hiddenCount > 0 ? `+${hiddenCount}` : '';
      counterEl.style.display = hiddenCount > 0 ? '' : 'none';
    }
  });
}
