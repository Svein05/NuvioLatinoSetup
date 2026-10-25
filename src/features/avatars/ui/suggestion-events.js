function trapFocus(modal, event) {
  const items = [...modal.querySelectorAll('button:not(:disabled), input:not(:disabled), [tabindex="0"]')]
    .filter(node => node.getClientRects().length > 0);
  const target = event.shiftKey ? items.at(-1) : items[0];
  const boundary = event.shiftKey ? items[0] : items.at(-1);
  if (event.target === boundary && target) { event.preventDefault(); target.focus(); }
}

function bindDropzone(modal, actions, lifetime) {
  const zone = modal.querySelector('#suggestionDropzone');
  const input = modal.querySelector('#inputAvatarSuggestionFile');
  lifetime.on(zone, 'click', () => { if (!actions.busy()) input?.click(); });
  lifetime.on(zone, 'keydown', event => {
    if (['Enter', ' '].includes(event.key) && !actions.busy()) { event.preventDefault(); input?.click(); }
  });
  const highlight = enabled => zone?.classList.toggle('border-[#ffd479]', enabled);
  lifetime.on(zone, 'dragover', event => { event.preventDefault(); highlight(true); });
  lifetime.on(zone, 'dragleave', () => highlight(false));
  lifetime.on(zone, 'drop', event => { event.preventDefault(); highlight(false); actions.file(event.dataTransfer?.files?.[0]); });
  lifetime.on(input, 'change', () => actions.file(input.files?.[0]));
}

export function bindSuggestionEvents(modal, actions, lifetime, root = document) {
  lifetime.on(root, 'click', event => {
    if (event.target.closest('.btn-open-avatar-suggestion, #btnOpenAvatarSuggestionModal')) {
      const franchises = root.querySelector('#modalAvatarFranchises');
      franchises?.classList.add('hidden');
      franchises?.classList.remove('flex');
      actions.open();
    }
  });
  const buttons = { btnCloseAvatarSuggestionModal: actions.close, btnCancelAvatarSuggestion: actions.close,
    btnCloseSuggestionSuccess: actions.close, btnSuggestionModeFile: () => actions.mode('file'),
    btnSuggestionModeUrl: () => actions.mode('url'), btnRemoveSuggestionFile: () => actions.file(null),
    btnProceedToConfirmSuggestion: actions.confirm, btnBackToSuggestionForm: actions.back,
    btnConfirmAndSendToDiscord: actions.send };
  for (const [id, handler] of Object.entries(buttons)) lifetime.on(modal.querySelector(`#${id}`), 'click', handler);
  const inputs = { inputAvatarSuggestionUrl: 'url', inputAvatarSuggestionCharName: 'characterName', inputAvatarSuggestionSeriesName: 'seriesName' };
  for (const [id, field] of Object.entries(inputs)) {
    lifetime.on(modal.querySelector(`#${id}`), 'input', event => actions.edit(field, event.target.value));
  }
  lifetime.on(modal, 'click', event => { if (event.target === modal) actions.close(); });
  lifetime.on(root, 'keydown', event => {
    if (!actions.isOpen()) return;
    if (event.key === 'Escape') { event.stopPropagation(); actions.close(); }
    if (event.key === 'Tab') trapFocus(modal, event);
  });
  bindDropzone(modal, actions, lifetime);
}
