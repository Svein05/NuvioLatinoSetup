function drawerHeight(drawer) {
  const list = drawer.querySelector('#drawerStepList');
  if (!list) return drawer.scrollHeight;
  const style = getComputedStyle(list);
  const items = [...list.children];
  const listHeight = items.reduce((height, item) => height + item.getBoundingClientRect().height, 0)
    + Math.max(0, items.length - 1) * (parseFloat(style.rowGap) || 0)
    + (parseFloat(style.paddingTop) || 0) + (parseFloat(style.paddingBottom) || 0);
  return [...drawer.children].reduce((height, child) => height + (child === list ? listHeight : child.getBoundingClientRect().height), 0);
}

/** Let document scrolling handle tall menus; animate only the host's intrinsic minimum. */
export function createDrawerSize({ root, drawer, lifetime }) {
  const card = root.querySelector('#wizardView');
  if (!card || !drawer) return { setOpen() {} };
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  const original = card.style.minHeight;
  let open = false, animation, frame = 0;
  function resize() {
    frame = 0;
    if (!open && !animation && card.style.minHeight === original) return;
    const from = card.getBoundingClientRect().height;
    animation?.cancel(); animation = null;
    card.style.minHeight = original;
    const natural = card.getBoundingClientRect().height;
    const style = getComputedStyle(card);
    const border = (parseFloat(style.borderTopWidth) || 0) + (parseFloat(style.borderBottomWidth) || 0);
    const target = open ? Math.max(natural, Math.ceil(drawerHeight(drawer) + border)) : natural;
    card.style.minHeight = open ? target + 'px' : original;
    if (media.matches || !card.animate || Math.abs(target - from) < .5) return;
    const current = card.animate([{ minHeight: from + 'px' }, { minHeight: target + 'px' }],
      { duration: 350, easing: 'cubic-bezier(.215,.61,.355,1)' });
    animation = current;
    void current.finished.catch(() => {}).finally(() => { if (animation === current) animation = null; });
  }
  const schedule = () => { if (!frame) frame = requestAnimationFrame(resize); };
  const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(schedule) : null;
  for (const element of [...drawer.querySelectorAll('.drawer-step-item'), ...drawer.children,
    ...card.querySelectorAll('.step-content')]) {
    if (element.id !== 'drawerStepList') observer?.observe(element);
  }
  lifetime.on(window, 'resize', schedule);
  lifetime.on(media, 'change', schedule);
  lifetime.add(() => { cancelAnimationFrame(frame); animation?.cancel(); observer?.disconnect(); card.style.minHeight = original; });
  return { setOpen(value) { open = value; schedule(); } };
}
