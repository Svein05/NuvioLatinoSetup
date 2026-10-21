function isTouchDevice(win = window) {
  return win.innerWidth < 768 || (win.matchMedia && win.matchMedia('(pointer: coarse)').matches && win.innerWidth < 1024);
}

export function initSectionsSortable({
  sectionsEl,
  onReorder,
  Sortable = globalThis.Sortable,
}) {
  if (!sectionsEl || typeof Sortable === 'undefined') return null;
  return new Sortable(sectionsEl, {
    handle: '.section-drag-handle',
    animation: 250,
    ghostClass: 'section-sortable-ghost',
    chosenClass: 'is-chosen',
    dragClass: 'is-dragging',
    filter: 'input, button, a, .no-drag',
    preventOnFilter: false,
    onEnd: (evt) => {
      if (evt.oldIndex !== evt.newIndex) {
        onReorder(evt.oldIndex, evt.newIndex);
      }
    },
  });
}

export function initFolderRailsSortables({
  collections = [],
  onReorder,
  doc = document,
  win = window,
  Sortable = globalThis.Sortable,
}) {
  if (typeof Sortable === 'undefined' || isTouchDevice(win)) return [];
  const instances = [];
  collections.forEach((sec) => {
    const railEl = doc.getElementById(`carouselRail_${sec.id}`);
    if (railEl) {
      const sortable = new Sortable(railEl, {
        direction: 'horizontal',
        animation: 250,
        filter: 'input, button, a, .no-drag',
        preventOnFilter: false,
        ghostClass: 'card-sortable-ghost',
        chosenClass: 'is-chosen',
        dragClass: 'is-dragging',
        onEnd: (evt) => {
          if (evt.oldIndex !== evt.newIndex) {
            onReorder(sec.id, evt.oldIndex, evt.newIndex);
          }
        },
      });
      instances.push(sortable);
    }
  });
  return instances;
}

export function destroySortables(instances = []) {
  instances.forEach((inst) => {
    try {
      inst?.destroy();
    } catch {
      // Ignored
    }
  });
}
