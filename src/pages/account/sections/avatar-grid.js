/** Fill complete preview rows using the grid's actual computed column count. */
export function createAvatarGridLayout() {
  const cleanups = [];
  const clear = () => { cleanups.splice(0).forEach(dispose => dispose()); };
  function mount(grid, entries, markup) {
    let count = -1;
    const update = () => {
      const columns = getComputedStyle(grid).gridTemplateColumns.split(/\s+/).filter(value => value && value !== 'none').length || 8;
      const next = Math.min(entries.length, Math.ceil(8 / columns) * columns);
      if (count === next) return;
      if (next < count) {
        const focused = grid.contains(document.activeElement) && [...grid.children].indexOf(document.activeElement.closest('[data-avatar-path]')) >= next;
        [...grid.children].slice(next).forEach(card => card.remove());
        if (focused) grid.lastElementChild?.focus({ preventScroll: true });
      }
      else grid.insertAdjacentHTML('beforeend', entries.slice(Math.max(0, count), next).map(markup).join(''));
      count = next;
    };
    update();
    const observer = window.ResizeObserver ? new ResizeObserver(update) : null;
    observer?.observe(grid);
    cleanups.push(() => observer?.disconnect());
  }
  return { mount, clear, dispose: clear };
}
