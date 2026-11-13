import { manageDialog } from '../../../shared/ui/dialog-accessibility.js';

export function mountCatalogRename({ root, lifetime, state, changed }) {
  const modal = root.createElement('div');
  modal.className = 'popup-overlay fixed inset-0 z-[120] hidden items-center justify-center p-4';
  modal.innerHTML = '<form class="popup-panel stremio-rename"><header class="popup-title">Editar nombre<button type="button" data-cancel aria-label="Cerrar"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button></header><label for="stremioCatalogName">Nombre del catálogo</label><input id="stremioCatalogName" class="lat-field" maxlength="100" required><footer><button type="button" data-cancel class="lat-capsule-btn glass">Cancelar</button><button type="submit" class="lat-capsule-btn solid">Guardar</button></footer></form>';
  root.body.append(modal);
  lifetime.add(manageDialog(modal)); lifetime.add(() => modal.remove());
  let key;
  let opener;
  const input = modal.querySelector('input');
  const close = () => { modal.classList.add('hidden'); modal.classList.remove('flex'); opener?.focus({ preventScroll: true }); };
  lifetime.on(modal, 'click', event => { if (event.target === modal || event.target.closest('[data-cancel]')) close(); });
  lifetime.on(modal.querySelector('form'), 'submit', event => {
    event.preventDefault();
    const value = input.value.trim();
    if (!value) { input.focus(); return; }
    state.stremio.names ??= {}; state.stremio.names[key] = value;
    close(); changed();
    [...root.querySelectorAll('[data-row-edit]')].find(node => node.dataset.rowEdit === key)?.focus({ preventScroll: true });
  });
  return { open(catalogKey, name) {
    key = catalogKey; opener = root.activeElement; input.value = name;
    modal.classList.remove('hidden'); modal.classList.add('flex'); input.focus(); input.select();
  } };
}
