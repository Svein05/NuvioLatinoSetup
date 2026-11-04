import { createLifetime } from '../../shared/ui/lifetime.js';

export function setupScrollableTabs(root = document) {
  const container = root.querySelector?.('.account-tabs-pill');
  if (!container || container.dataset?.scrollBound === 'true') return;
  if (container.dataset) container.dataset.scrollBound = 'true';
  const lifetime = createLifetime();
  lifetime.add(() => { if (container.dataset) delete container.dataset.scrollBound; });

  lifetime.on(container, 'wheel', (e) => {
    const overflow = container.scrollWidth - container.clientWidth;
    const direction = e.deltaY > 0 ? container.scrollLeft < overflow - 1 : container.scrollLeft > 1;
    if (e.deltaY !== 0 && overflow > 1 && direction && !e.ctrlKey) {
      e.preventDefault();
      container.scrollLeft += e.deltaY;
    }
  }, { passive: false });

  let isDown = false;
  let startX = 0;
  let scrollLeft = 0;
  let hasMoved = false;

  lifetime.on(container, 'mousedown', (e) => {
    isDown = true;
    hasMoved = false;
    startX = e.pageX - container.offsetLeft;
    scrollLeft = container.scrollLeft;
  });

  if (typeof window !== 'undefined') {
    lifetime.on(window, 'mouseup', () => { isDown = false; });
  }

  lifetime.on(container, 'mousemove', (e) => {
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
    lifetime.on(btn, 'click', (e) => {
      if (hasMoved) {
        e.preventDefault();
        e.stopImmediatePropagation();
        hasMoved = false;
      }
    }, { capture: true });
  });
  return () => lifetime.dispose();
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
