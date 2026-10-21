export function renderToggleLabel(toggleEl, labelEl) {
  if (!labelEl) return;
  const active = Boolean(toggleEl?.checked);
  labelEl.textContent = active ? 'Activado' : 'Desactivado';
  labelEl.className = active
    ? 'text-[10px] font-mono font-bold text-[#ffd479] uppercase tracking-wider'
    : 'text-[10px] font-mono font-bold text-white/40 uppercase tracking-wider';
}

export function renderPosterCardsUI(root = document, currentEngine = 'default') {
  const cards = [
    { id: 'cardPosterDefault', engine: 'default' },
    { id: 'cardPosterBetter', engine: 'betterposter' },
    { id: 'cardPosterPlus', engine: 'postersplus' },
  ];

  cards.forEach(({ id, engine }) => {
    const el = root.querySelector ? root.querySelector(`#${id}`) : null;
    if (!el) return;
    const isSelected = currentEngine === engine;
    const checkIcon = el.querySelector('.card-check-icon');

    if (isSelected) {
      el.className = 'poster-option-card relative p-5 rounded-[24px] bg-white/[0.08] border-2 border-[#ffd479] shadow-[0_0_25px_rgba(255,212,121,0.2)] cursor-pointer transition-all flex flex-col justify-between gap-3 group';
      if (checkIcon) {
        checkIcon.className = 'w-5 h-5 rounded-full border-2 border-[#ffd479] bg-[#ffd479] flex items-center justify-center text-[10px] text-[#08090c] card-check-icon font-bold shadow-sm';
      }
    } else {
      el.className = 'poster-option-card relative p-5 rounded-[24px] bg-white/[0.03] border-2 border-white/[0.08] hover:border-white/20 cursor-pointer transition-all flex flex-col justify-between gap-3 group shadow-[var(--shadow-lift)]';
      if (checkIcon) {
        checkIcon.className = 'w-5 h-5 rounded-full border-2 border-white/20 bg-transparent flex items-center justify-center text-[10px] text-transparent card-check-icon';
      }
    }
  });
}
