import { escapeHtml } from '../../shared/ui/safe-markup.js';

const actions = new Set(['downloadCompiledBadgeJson', 'copyCompiledBadgeJson', 'handleImportCustomBadge',
  'selectPosterEngine', 'toggleCustomUrlInput', 'openAioStreamsDebridsModal', 'moveAddon', 'removeAddon',
  'toggleBadgeModule', 'moveBadgeModule', 'selectBadgePack', 'copyBadgeJsonUrl']);

export function wizardAction(name, ...args) {
  if (!actions.has(name)) throw new Error(`Acción del asistente desconocida: ${name}`);
  return `data-wizard-action="${name}" data-wizard-args="${escapeHtml(JSON.stringify(args))}"`;
}

export function bindWizardCommands({ root = document, controller, lifetime }) {
  const dispatch = event => {
    if (event.target.closest('[data-wizard-stop]')) return;
    const target = event.target.closest('[data-wizard-action]');
    if (!target || target.disabled || (target.dataset.wizardEvent || 'click') !== event.type) return;
    event.stopPropagation();
    if (!actions.has(target.dataset.wizardAction)) return;
    const args = JSON.parse(target.dataset.wizardArgs || '[]');
    if (event.type === 'change') args.push(target.checked);
    Promise.resolve(controller[target.dataset.wizardAction](...args))
      .catch(error => controller.showToast(error.message, 'error'));
  };
  lifetime.on(root, 'click', dispatch);
  lifetime.on(root, 'change', dispatch);
  lifetime.on(root, 'load', event => {
    if (event.target.matches?.('[data-badge-image]')) controller.handleBadgeImgLoaded(event.target);
  }, { capture: true });
  lifetime.on(root, 'error', event => {
    const image = event.target;
    if (!image.matches?.('[data-badge-image]')) return;
    image.style.display = 'none';
    if (image.nextElementSibling) image.nextElementSibling.style.display = 'inline';
    controller.handleBadgeImgLoaded(image);
  }, { capture: true });
}
