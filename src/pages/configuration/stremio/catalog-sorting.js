/** Reuse the existing Sortable runtime; arrows remain available for keyboard input. */
export function mountCatalogSorting({ view, state, lifetime, changed }) {
  let instances = [];
  const clear = () => { instances.forEach(instance => instance.destroy()); instances = []; };
  lifetime.add(clear);
  const attach = (element, options) => {
    if (element && globalThis.Sortable) instances.push(new globalThis.Sortable(element, {
      animation: matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 180,
      ghostClass: 'stremio-sort-ghost', chosenClass: 'stremio-sort-chosen',
      delayOnTouchOnly: true, delay: 150, touchStartThreshold: 5,
      ...options,
    }));
  };
  return {
    clear,
    refresh() {
      clear();
      attach(view.querySelector('[data-stremio-rows]'), {
        draggable: '[data-block-key]', handle: '[data-drag-block]',
        onEnd: event => {
          if (event.oldIndex === event.newIndex) return;
          state.stremio.addonOrder = [...event.to.children].map(node => node.dataset.blockKey);
          changed();
        },
      });
      attach(view.querySelector('[data-sortable-rows]'), {
        draggable: '[data-row-key]', handle: '[data-drag-row]',
        onEnd: event => {
          if (event.oldIndex === event.newIndex) return;
          state.stremio.selected = [...event.to.children].map(node => node.dataset.rowKey);
          changed();
        },
      });
    },
  };
}
