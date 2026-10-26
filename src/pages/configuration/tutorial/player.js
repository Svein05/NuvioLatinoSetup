import { createLifetime } from '../../../shared/ui/lifetime.js';
import { mountTutorialControls } from './controls.js';
import { mountTutorialFullscreen } from './fullscreen.js';

export function mountTmdbTutorial(root = document) {
  const trigger = root.querySelector('[data-open-tmdb-tutorial]');
  const dialog = root.querySelector('#tmdbTutorial');
  if (!trigger || !dialog) return () => {};
  const lifetime = createLifetime();
  const video = dialog.querySelector('video');
  const doc = dialog.ownerDocument;
  const win = doc.defaultView;
  const status = dialog.querySelector('[data-tutorial-status]');
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
    event.preventDefault();
    if (dialog.open) return;
    previousOverflow = doc.documentElement.style.overflow;
    doc.documentElement.style.overflow = 'hidden';
    dialog.showModal();
    if (!video.currentSrc || video.error) {
      for (const source of video.querySelectorAll('source[data-src]')) source.src = source.dataset.src;
      video.preload = 'metadata';
      video.load();
    }
  }
  mountTutorialControls(dialog, lifetime);
  exitFullscreen = mountTutorialFullscreen({ player: dialog.querySelector('[data-tutorial-player]'),
    video, button: dialog.querySelector('[data-tutorial-fullscreen]'), status }, lifetime);
  lifetime.on(trigger, 'click', open);
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
