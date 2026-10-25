import { escapeHtml } from '../../../shared/ui/safe-markup.js';
import { getAddonConfigureUrl } from './addons-manifest.js';

function button(index, action, label, { icon, disabled = false }) {
  return `<button type="button" class="btn-${action} lat-capsule-btn glass" data-index="${index}"
    title="${label}" aria-label="${label}" ${disabled ? 'disabled' : ''}><i class="${icon}" aria-hidden="true"></i></button>`;
}

export function addonActionsMarkup(addon, index, isFirst, isLast) {
  const configure = getAddonConfigureUrl(addon);
  return `<div class="account-addon-actions">
    <div class="account-addon-management">
      <a data-addon-configure class="lat-capsule-btn glass account-addon-configure" ${configure ? `href="${escapeHtml(configure)}"` : 'hidden'}
        target="_blank" rel="noopener noreferrer" title="Abrir configuración del addon" aria-label="Configurar ${escapeHtml(addon.name || 'addon')}">
        <i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i><span>Configurar</span>
      </a>
      ${button(index, 'edit-addon', 'Editar', { icon: 'fa-solid fa-pen' })}
      ${button(index, 'delete-addon', 'Eliminar', { icon: 'fa-regular fa-trash-can' })}
    </div>
    <div class="account-addon-order">
      ${button(index, 'move-up', 'Subir', { icon: 'fa-solid fa-chevron-up', disabled: isFirst })}
      ${button(index, 'move-down', 'Bajar', { icon: 'fa-solid fa-chevron-down', disabled: isLast })}
    </div>
  </div>`;
}
