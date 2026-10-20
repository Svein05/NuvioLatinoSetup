import { prepareAvatarSuggestion, validateSuggestionFile } from '../model/suggestion.js';
import { createLifetime } from '../../../shared/ui/lifetime.js';
import { createSuggestionView } from './suggestion-view.js';
import { bindSuggestionEvents } from './suggestion-events.js';

const instances = new WeakMap();
const empty = () => ({ mode: 'file', file: null, objectUrl: '', url: '', characterName: '', seriesName: '', busy: false, uncertain: false, error: '', view: 'form', open: false });

function releaseFile(context) {
  if (context.state.objectUrl) URL.revokeObjectURL(context.state.objectUrl);
  context.state.file = null;
  context.state.objectUrl = '';
  context.modal.querySelector('#inputAvatarSuggestionFile').value = '';
}

function fileSelection(context, file) {
  if (context.state.busy) return;
  try { if (file) validateSuggestionFile(file); }
  catch (error) { context.state.error = error.message; context.render(); return; }
  releaseFile(context);
  context.state.file = file || null;
  context.state.objectUrl = file ? URL.createObjectURL(file) : '';
  if (!file) context.modal.querySelector('#inputAvatarSuggestionFile').value = '';
  context.state.error = '';
  context.state.uncertain = false;
  context.render();
}

function close(context, force = false) {
  if (context.state.busy && !force) return;
  const wasOpen = context.state.open;
  releaseFile(context);
  if (context.state.mode === 'file') Object.assign(context.state, empty());
  else Object.assign(context.state, { file: null, objectUrl: '', open: false, error: '' });
  clearTimeout(context.cooldownTimer);
  if (wasOpen) document.body.style.overflow = context.previousOverflow;
  context.render();
  if (wasOpen && context.previousFocus?.isConnected) context.previousFocus.focus();
}

function open(context) {
  if (context.state.open) return;
  if (context.state.mode === 'file') Object.assign(context.state, empty());
  context.previousFocus = document.activeElement;
  context.previousOverflow = document.body.style.overflow;
  Object.assign(context.state, { open: true, view: 'form', error: '' });
  document.body.style.overflow = 'hidden';
  context.render();
  context.modal.querySelector('#inputAvatarSuggestionCharName')?.focus();
}

async function send(context) {
  if (context.state.busy || context.state.view !== 'confirm') return;
  let draft;
  try { draft = prepareAvatarSuggestion(context.state); }
  catch (error) { context.state.error = error.message; context.render(); return; }
  context.state.busy = true;
  context.state.error = '';
  context.render();
  try {
    await context.submission.send(draft, { accessToken: context.getAccessToken(), signal: context.lifetime.signal });
    if (context.lifetime.signal.aborted) return;
    releaseFile(context);
    Object.assign(context.state, empty(), { open: true, view: 'success' });
  } catch (error) {
    if (!context.lifetime.signal.aborted) {
      context.state.uncertain = error.outcome === 'unknown';
      context.state.error = context.state.uncertain
        ? 'No se pudo confirmar el envío. Revisa Discord antes de volver a enviarlo.' : error.message;
    }
  } finally {
    context.state.busy = false;
    if (!context.lifetime.signal.aborted) context.render();
  }
}

function actions(context) {
  return {
    open: () => open(context), close: () => close(context), busy: () => context.state.busy, isOpen: () => context.state.open,
    file: file => fileSelection(context, file), send: () => void send(context),
    edit(field, value) { if (!context.state.busy) { context.state[field] = value; context.state.error = ''; context.state.uncertain = false; context.render(); } },
    mode(mode) {
      if (context.state.busy) return;
      context.state.mode = mode;
      if (mode === 'url') fileSelection(context, null);
      context.render();
    },
    back() { if (!context.state.busy) { context.state.view = 'form'; context.state.error = ''; context.render(); } },
    confirm() {
      if (context.state.busy) return;
      try { prepareAvatarSuggestion(context.state); context.state.view = 'confirm'; context.state.error = ''; }
      catch (error) { context.state.error = error.message; }
      context.render();
    },
  };
}

export function mountAvatarSuggestions({ submission, getAccessToken }, root = document) {
  const modal = root.querySelector('#modalAvatarSuggestion');
  if (!modal) return () => {};
  if (instances.has(modal)) return instances.get(modal);
  const view = createSuggestionView(modal);
  const lifetime = createLifetime();
  const context = { modal, lifetime, submission, getAccessToken, state: empty(), render() {
    clearTimeout(context.cooldownTimer);
    const remaining = submission.remaining();
    view.render(context.state, remaining);
    if (context.state.open && context.state.view === 'confirm' && remaining > 0) {
      context.cooldownTimer = setTimeout(context.render, 1000);
    }
  } };
  bindSuggestionEvents(modal, actions(context), lifetime, root);
  const dispose = () => {
    lifetime.dispose();
    close(context, true);
    instances.delete(modal);
  };
  instances.set(modal, dispose);
  return dispose;
}
