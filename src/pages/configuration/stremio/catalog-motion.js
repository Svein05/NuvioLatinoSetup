/** Measure visible positions before rendering, then animate the new nodes into place. */
export function createCatalogMotion(view, lifetime) {
  const active = new Set();
  const cancel = () => { active.forEach(animation => animation.cancel()); active.clear(); };
  lifetime.add(cancel);
  return {
    capture(block) {
      const attribute = block ? 'data-block-key' : 'data-row-key';
      const positions = new Map([...view.querySelectorAll(`[${attribute}]`)].map(node => [node.getAttribute(attribute), node.getBoundingClientRect()]));
      cancel();
      return () => {
        if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        for (const node of view.querySelectorAll(`[${attribute}]`)) {
          const before = positions.get(node.getAttribute(attribute));
          const after = node.getBoundingClientRect();
          if (!before || !node.animate || before.top === after.top) continue;
          const animation = node.animate([
            { transform: `translate(${before.left - after.left}px,${before.top - after.top}px)` },
            { transform: 'translate(0,0)' },
          ], { duration: 320, easing: 'cubic-bezier(.215,.61,.355,1)' });
          active.add(animation);
          animation.finished.then(() => active.delete(animation), () => active.delete(animation));
        }
      };
    },
  };
}
