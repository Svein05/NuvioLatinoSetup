const focusable = 'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]';

/** Adapt existing dialogs without moving their ownership or changing their visual design. */
export function manageDialog(modal) {
  let open = false;
  let opener;
  let frame;
  const isOpen = () => !modal.classList.contains('hidden');
  const targets = () => [...modal.querySelectorAll(focusable)].filter(node => node.getClientRects().length);
  function synchronize() {
    const visible = isOpen();
    if (visible === open) return;
    open = visible;
    modal.setAttribute('aria-hidden', String(!open));
    if (open) {
      opener = modal.ownerDocument.activeElement;
      frame = requestAnimationFrame(() => { if (isOpen() && !modal.contains(modal.ownerDocument.activeElement)) (targets()[0] || modal).focus(); });
    } else {
      cancelAnimationFrame(frame);
      if (modal.contains(modal.ownerDocument.activeElement) && opener?.isConnected) opener.focus();
    }
  }
  const onKey = event => {
    if (!open) return;
    if (event.key === 'Escape' && modal.getAttribute('aria-busy') !== 'true') {
      event.preventDefault(); event.stopPropagation();
      const closeButton = modal.querySelector('button[id*="Close"],button[id*="Cancel"]');
      if (closeButton) closeButton.click();
      else modal.classList.add('hidden');
    }
    if (event.key !== 'Tab') return;
    const items = targets();
    const active = modal.ownerDocument.activeElement;
    if (!items.length) { event.preventDefault(); modal.focus(); }
    else if (event.shiftKey && active === items[0]) { event.preventDefault(); items.at(-1).focus(); }
    else if (!event.shiftKey && active === items.at(-1)) { event.preventDefault(); items[0].focus(); }
  };
  modal.setAttribute('role', 'dialog'); modal.setAttribute('aria-modal', 'true'); modal.tabIndex = -1;
  const observer = new MutationObserver(synchronize);
  observer.observe(modal, { attributes: true, attributeFilter: ['class'] });
  modal.addEventListener('keydown', onKey);
  synchronize();
  return () => { observer.disconnect(); cancelAnimationFrame(frame); modal.removeEventListener('keydown', onKey); };
}

export function managePageDialogs(root = document) {
  const disposers = [...root.querySelectorAll('.fixed[id]')]
    .filter(modal => /modal/i.test(modal.id) && !/suggestion/i.test(modal.id))
    .map(manageDialog);
  return () => disposers.forEach(dispose => dispose());
}
