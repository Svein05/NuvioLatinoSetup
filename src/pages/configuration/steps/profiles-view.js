function renderSingleProfileCard(p, idx, isSelected, canDelete) {
  const name = p.name || p.title || `Perfil ${idx + 1}`;
  const avatar = p.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name)}`;
  const cardBorder = isSelected
    ? 'border-2 border-[#ffd479] bg-white/[0.08] shadow-[0_0_20px_rgba(255,212,121,0.2)] transform -translate-y-0.5'
    : 'border border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.06] hover:-translate-y-0.5';

  const checkBadge = isSelected
    ? '<div class="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#ffd479] text-[#08090c] flex items-center justify-center text-[10px] shadow-md font-bold"><i class="fa-solid fa-check"></i></div>'
    : '<div class="absolute top-2 right-2 w-4 h-4 rounded-full border border-white/20 bg-white/[0.05] flex items-center justify-center text-[8px] text-transparent group-hover:border-white/40"><i class="fa-solid fa-check text-white/40"></i></div>';

  const deleteBtn = canDelete
    ? `<button type="button" class="btn-delete-profile absolute top-2 left-2 w-6 h-6 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/15 flex items-center justify-center transition-all opacity-70 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 z-10" data-profile-id="${p.id}" data-profile-name="${name}" title="Eliminar perfil"><i class="fa-solid fa-trash-can text-[10px]"></i></button>`
    : '';

  return `
    <div class="card-select-profile group relative cursor-pointer p-4 rounded-2xl flex flex-col items-center justify-center gap-2.5 transition-all duration-200 select-none min-h-[140px] w-48 sm:w-52 ${cardBorder}" data-profile-id="${p.id}" data-profile-name="${name}">
      ${checkBadge}
      ${deleteBtn}
      <div class="relative"><img src="${avatar}" alt="${name}" class="w-12 h-12 rounded-full object-cover transition-all ${isSelected ? 'ring-2 ring-[#ffd479] shadow-md scale-105' : 'ring-1 ring-white/20 group-hover:ring-white/40'}"></div>
      <div class="text-center w-full px-1">
        <div class="text-xs font-semibold truncate ${isSelected ? 'text-white' : 'text-white/70 group-hover:text-white'}">${name}</div>
        <div class="text-[10px] mt-0.5 ${isSelected ? 'text-[#ffd479] font-mono font-bold uppercase tracking-wider' : 'text-white/40 group-hover:text-white/60'}">${isSelected ? '✓ Seleccionado' : 'Click para elegir'}</div>
      </div>
    </div>
  `;
}

function renderNewProfileDottedCard(count) {
  return `
    <div id="cardNewProfile" class="group relative cursor-pointer p-4 rounded-2xl flex flex-col items-center justify-center gap-2.5 transition-all duration-200 select-none border-2 border-dashed border-white/20 hover:border-white/50 bg-white/[0.02] hover:bg-white/[0.06] hover:-translate-y-0.5 min-h-[140px] w-48 sm:w-52">
      <div class="w-12 h-12 rounded-full border border-white/25 bg-white/[0.06] flex items-center justify-center text-white/70 group-hover:text-white group-hover:border-white/60 group-hover:scale-105 transition-all shadow-[var(--brillo-vidrio)]">
        <i class="fa-solid fa-plus text-base"></i>
      </div>
      <div class="text-center w-full">
        <div class="text-xs font-semibold text-white/70 group-hover:text-white transition-colors">Nuevo Perfil</div>
        <div class="text-[10px] mt-0.5 text-white/40 group-hover:text-white/60 font-mono">${count}/6 perfiles</div>
      </div>
    </div>
  `;
}

export function renderProfilesList(container, { profiles = [], selectedProfileId = null, onSelect = () => {}, onPromptDelete = () => {}, onOpenNewModal = () => {} }) {
  if (!container) return;
  if (!profiles.length) {
    container.innerHTML = `
      <div class="w-full py-8 text-center bg-white/[0.03] border border-white/10 rounded-2xl p-6">
        <i class="fa-solid fa-user-circle text-4xl text-white/30 mb-2"></i>
        <p class="text-sm font-medium text-white/90">No se encontraron perfiles en tu cuenta de Nuvio</p>
        <p class="text-xs text-white/50 mt-1 mb-4">Crea tu primer perfil para comenzar a configurar tus colecciones.</p>
        <button type="button" id="btnCreateFirstProfile" class="lat-capsule-btn solid text-xs"><i class="fa-solid fa-plus"></i><span>Crear mi primer perfil</span></button>
      </div>
    `;
    container.querySelector('#btnCreateFirstProfile')?.addEventListener('click', onOpenNewModal);
    return;
  }

  let html = profiles.map((p, idx) => {
    const isSelected = String(selectedProfileId) === String(p.id) || (selectedProfileId === null && idx === 0);
    return renderSingleProfileCard(p, idx, isSelected, profiles.length > 1);
  }).join('');

  if (profiles.length < 6) html += renderNewProfileDottedCard(profiles.length);
  container.innerHTML = html;

  container.querySelectorAll('.card-select-profile').forEach(card => {
    card.addEventListener('click', () => onSelect(card.dataset.profileId, card.dataset.profileName));
  });
  container.querySelectorAll('.btn-delete-profile').forEach(btn => {
    btn.addEventListener('click', (e) => { e.stopPropagation(); onPromptDelete(btn.dataset.profileId, btn.dataset.profileName); });
  });
  container.querySelector('#cardNewProfile')?.addEventListener('click', onOpenNewModal);
}

export function renderProfileWarningUI({ isNew, hasAio, isAnalyzing, displayName }, root = globalThis.document) {
  if (!root?.getElementById) return;
  const container = root.getElementById('profileOverwriteWarning');
  const textEl = root.getElementById('profileWarningText');
  const iconEl = root.getElementById('profileWarningIcon');
  if (!container || !textEl) return;

  container.classList.remove('hidden');
  if (isAnalyzing) {
    textEl.innerHTML = `Analizando addons del perfil <strong class="text-white">"${displayName}"</strong>...`;
    return;
  }
  if (isNew) {
    textEl.innerHTML = `Perfil nuevo (<strong class="text-white">"${displayName}"</strong>): se aprovisionará con <strong class="text-[#ffd479]">AIOMetadata</strong> como addon principal (#1).`;
    if (iconEl) iconEl.className = 'fa-solid fa-sparkles text-[#ffd479] text-base shrink-0';
    return;
  }
  textEl.innerHTML = hasAio
    ? `Al seleccionar <strong class="text-white">"${displayName}"</strong>, se actualizará tu configuración de <strong class="text-[#ffd479]">AIOMetadata</strong> (#1) manteniendo tus addons.`
    : `Al seleccionar <strong class="text-white">"${displayName}"</strong>, se instalará <strong class="text-[#ffd479]">AIOMetadata</strong> (#1) manteniendo tus addons.`;
  if (iconEl) iconEl.className = hasAio ? 'fa-solid fa-rotate text-[#ffd479] text-base shrink-0' : 'fa-solid fa-circle-info text-[#ffd479] text-base shrink-0';
}
