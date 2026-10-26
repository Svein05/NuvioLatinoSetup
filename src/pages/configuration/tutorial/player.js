import { createLifetime } from '../../../shared/ui/lifetime.js';
import { mountTutorialControls } from './controls.js';
import { mountTutorialFullscreen } from './fullscreen.js';
import { API_TUTORIALS } from './chapters.js';

function loadTutorial(dialog, provider, setChapters) {
  const { title, chapters } = API_TUTORIALS[provider];
  const video = dialog.querySelector('video');
  video.pause();
  dialog.querySelector('h2').textContent = `Obtén tu API Key de ${title}`;
  video.setAttribute('aria-label', `Cómo obtener tu API Key de ${title}`);
  for (const source of video.querySelectorAll('source')) {
    source.src = `/assets/videos/tutorial/tutorial-${provider}-apikey.${source.type === 'video/mp4' ? 'mp4' : 'webm'}`;
  }
  video.preload = 'metadata';
  video.load();
  setChapters(chapters);
}

export function mountApiKeyTutorials(root = document) {
  const triggers = root.querySelectorAll('[data-api-tutorial]');
  const dialog = root.querySelector('#apiKeyTutorial');
  if (!triggers.length || !dialog) return () => {};
  const lifetime = createLifetime();
  const video = dialog.querySelector('video');
  const doc = dialog.ownerDocument;
  const win = doc.defaultView;
  const status = dialog.querySelector('[data-tutorial-status]');
  const setChapters = mountTutorialControls(dialog, lifetime);
  let currentProvider;
  let previousOverflow;
  let exitFullscreen = () => {};
  function settle() {
    video.pause();
    exitFullscreen();
    if (previousOverflow !== undefined) doc.documentElement.style.overflow = previousOverflow;
    previousOverflow = undefined;
  }
  function open(event) {
    if (!dialog.showModal) return;
    const provider = event.currentTarget.dataset.apiTutorial;
    if (!Object.hasOwn(API_TUTORIALS, provider)) return;
    event.preventDefault();
    if (dialog.open) return;
    previousOverflow = doc.documentElement.style.overflow;
    doc.documentElement.style.overflow = 'hidden';
    dialog.showModal();
    if (currentProvider !== provider || !video.currentSrc || video.error) {
      loadTutorial(dialog, provider, setChapters);
      currentProvider = provider;
    }
  }
  exitFullscreen = mountTutorialFullscreen({ player: dialog.querySelector('[data-tutorial-player]'),
    video, button: dialog.querySelector('[data-tutorial-fullscreen]'), status }, lifetime);
  for (const trigger of triggers) lifetime.on(trigger, 'click', open);
  lifetime.on(dialog.querySelector('[data-tutorial-close]'), 'click', () => dialog.close());
  lifetime.on(dialog, 'click', event => {
    const bounds = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right
      || event.clientY < bounds.top || event.clientY > bounds.bottom)) dialog.close();
  });
  lifetime.on(dialog, 'close', () => { if (!dialog.open) settle(); });
  lifetime.on(win, 'pagehide', () => { if (dialog.open) dialog.close(); settle(); });
  return () => {
    if (dialog.open) dialog.close();
    settle();
    lifetime.dispose();
  };
}
