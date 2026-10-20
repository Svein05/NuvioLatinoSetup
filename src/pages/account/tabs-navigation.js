export function setupScrollableTabs(root = document) {
  const container = root.querySelector?.('.account-tabs-pill');
  if (!container || container.dataset?.scrollBound === 'true') return;
  if (container.dataset) container.dataset.scrollBound = 'true';

  container.addEventListener('wheel', (e) => {
    if (e.deltaY !== 0) {
      e.preventDefault();
      container.scrollLeft += e.deltaY;
    }
  }, { passive: false });

  let isDown = false;
  let startX = 0;
  let scrollLeft = 0;
  let hasMoved = false;

  container.addEventListener('mousedown', (e) => {
    isDown = true;
    hasMoved = false;
    startX = e.pageX - container.offsetLeft;
    scrollLeft = container.scrollLeft;
  });

  if (typeof window !== 'undefined') {
    window.addEventListener('mouseup', () => { isDown = false; });
  }

  container.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    const x = e.pageX - container.offsetLeft;
    const walk = x - startX;
    if (Math.abs(walk) > 4) {
      hasMoved = true;
      e.preventDefault();
      container.scrollLeft = scrollLeft - walk;
    }
  });

  container.querySelectorAll?.('.account-nav-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      if (hasMoved) {
        e.preventDefault();
        e.stopImmediatePropagation();
        hasMoved = false;
      }
    }, true);
  });
}

export function switchSection(sectionId, { root = document, state, onSectionActivated, updateUndoButton }) {
  if (state) state.activeSection = sectionId;

  let targetBtn = null;
  root.querySelectorAll?.('.account-nav-btn').forEach(btn => {
    const isAct = btn.dataset?.section === sectionId;
    btn.classList.toggle('is-active', isAct);
    if (isAct) targetBtn = btn;
  });

  if (targetBtn && typeof targetBtn.scrollIntoView === 'function') {
    targetBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }

  root.querySelectorAll?.('.account-section-pane').forEach(pane => {
    pane.classList.toggle('is-active', pane.id === `sectionPane-${sectionId}`);
  });

  onSectionActivated?.(sectionId);
  updateUndoButton?.();
}
