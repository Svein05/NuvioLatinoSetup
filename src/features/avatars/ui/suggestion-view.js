import { formatSuggestionFileSize, suggestionImageUrl } from '../model/suggestion.js';

const ACTIVE = 'flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 bg-[#ffd479] text-black shadow-sm';
const INACTIVE = 'flex-1 py-1.5 px-3 rounded-lg text-xs font-medium text-white/60 hover:text-white transition-all flex items-center justify-center gap-1.5';
const element = (root, id) => root.querySelector(`#${id}`);
const text = (root, id, value) => { const node = element(root, id); if (node) node.textContent = value; };
const hidden = (root, id, value) => element(root, id)?.classList.toggle('hidden', value);

function source(state) {
  if (state.mode === 'file') return state.objectUrl || '';
  try { return state.url ? suggestionImageUrl(state.url) : ''; } catch { return ''; }
}

function preview(root, state) {
  const src = source(state);
  for (const id of ['avatarSuggestionPreviewImg', 'avatarConfirmFinalImg']) {
    const image = element(root, id);
    if (image && image.getAttribute('src') !== src) {
      if (src) image.src = src;
      else image.removeAttribute('src');
    }
    hidden(root, id, !src);
  }
  hidden(root, 'avatarSuggestionPreviewPlaceholder', Boolean(src));
  text(root, 'avatarSuggestionPreviewChar', state.characterName.trim() || 'Nombre del personaje');
  const label = element(root, 'avatarSuggestionPreviewChar');
  for (const name of ['italic', 'text-white/40']) label?.classList.toggle(name, !state.characterName.trim());
  label?.classList.toggle('text-white', Boolean(state.characterName.trim()));
  text(root, 'avatarSuggestionPreviewSeries', state.seriesName.trim() || 'Obra / Franquicia');
  text(root, 'avatarSuggestionPreviewOrigin', state.mode === 'url' ? (src ? 'Enlace directo URL' : 'Sin URL ingresada')
    : state.file ? `Archivo: ${formatSuggestionFileSize(state.file.size)}` : 'Sin imagen elegida');
  text(root, 'avatarConfirmFinalChar', state.characterName.trim());
  text(root, 'avatarConfirmFinalSeries', state.seriesName.trim());
  text(root, 'avatarConfirmFinalOrigin', state.mode === 'file'
    ? state.file ? `Archivo: ${state.file.name} (${formatSuggestionFileSize(state.file.size)})` : '' : `Enlace: ${state.url.trim()}`);
}

function controls(root, state, remaining) {
  const fields = { inputAvatarSuggestionUrl: 'url', inputAvatarSuggestionCharName: 'characterName', inputAvatarSuggestionSeriesName: 'seriesName' };
  for (const [id, key] of Object.entries(fields)) {
    const input = element(root, id);
    if (input && input.value !== state[key]) input.value = state[key];
  }
  for (const button of root.querySelectorAll('button, input')) button.disabled = state.busy;
  const send = element(root, 'btnConfirmAndSendToDiscord');
  if (send) send.disabled = state.busy || state.uncertain || remaining > 0;
  element(root, 'suggestionDropzone')?.setAttribute('aria-disabled', String(state.busy));
  const notice = state.error || (remaining > 0 ? `Debes esperar ${remaining} segundos antes de enviar otra sugerencia.` : '');
  hidden(root, 'avatarSuggestionConfirmNotice', !notice);
  text(root, 'avatarSuggestionConfirmNoticeText', notice);
  hidden(root, 'avatarSuggestionFormError', !state.error);
  text(root, 'avatarSuggestionFormErrorText', state.error);
  text(root, 'textConfirmSend', state.busy ? 'Enviando a Discord...' : 'Confirmar y Enviar');
  const icon = element(root, 'iconConfirmSend');
  if (icon) icon.className = state.busy ? 'fa-solid fa-spinner fa-spin text-[10px]' : 'fa-solid fa-paper-plane text-[10px]';
}

export function createSuggestionView(modal) {
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.querySelector('h3')?.setAttribute('id', 'avatarSuggestionTitle');
  modal.setAttribute('aria-labelledby', 'avatarSuggestionTitle');
  element(modal, 'avatarSuggestionPreviewImg')?.parentElement.classList.add('w-16', 'h-16');
  element(modal, 'avatarSuggestionFormError')?.setAttribute('role', 'alert');
  element(modal, 'avatarSuggestionConfirmNotice')?.setAttribute('aria-live', 'polite');
  element(modal, 'inputAvatarSuggestionCharName').maxLength = 100;
  element(modal, 'inputAvatarSuggestionSeriesName').maxLength = 100;
  const dropzone = element(modal, 'suggestionDropzone');
  dropzone?.setAttribute('role', 'button');
  dropzone?.setAttribute('tabindex', '0');
  return {
    render(state, remaining = 0) {
      modal.classList.toggle('hidden', !state.open);
      modal.classList.toggle('flex', state.open);
      for (const name of ['form', 'confirm', 'success']) {
        hidden(modal, `avatarSuggestion${name[0].toUpperCase() + name.slice(1)}View`, name !== state.view);
      }
      for (const mode of ['file', 'url']) {
        const button = element(modal, mode === 'file' ? 'btnSuggestionModeFile' : 'btnSuggestionModeUrl');
        if (button) { button.className = state.mode === mode ? ACTIVE : INACTIVE; button.setAttribute('aria-pressed', String(state.mode === mode)); }
      }
      hidden(modal, 'suggestionDropzoneWrap', state.mode !== 'file');
      hidden(modal, 'suggestionUrlWrap', state.mode !== 'url');
      hidden(modal, 'suggestionDropzone', Boolean(state.file));
      hidden(modal, 'suggestionFileSelectedWrap', !state.file);
      element(modal, 'suggestionFileSelectedWrap')?.classList.toggle('flex', Boolean(state.file));
      text(modal, 'suggestionFileName', state.file?.name || '');
      text(modal, 'suggestionFileSize', state.file ? formatSuggestionFileSize(state.file.size) : '');
      preview(modal, state);
      controls(modal, state, remaining);
    },
  };
}
