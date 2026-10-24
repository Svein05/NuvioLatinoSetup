import { accountTimeline, chapterProgress, pinnedProgress } from './scene-progress.js';
import { renderScene } from './render-scene.js';
import { createScenePlayback } from './scene-playback.js';

function renderChapter({ story, chapters, viewportHeight, playback }) {
  const state = chapterProgress(chapters.map(chapter => chapter.getBoundingClientRect()), viewportHeight);
  story.dataset.activeChapter = chapters[state.index].dataset.chapter;
  chapters.forEach(chapter => {
    const rectangle = chapter.getBoundingClientRect();
    const enhanced = story.classList.contains('is-enhanced');
    const target = enhanced ? pinnedProgress(rectangle, viewportHeight) : 1;
    const scene = chapter.querySelector('[data-scene]');
    const bounds = scene.getBoundingClientRect();
    const inView = bounds.top < viewportHeight && bounds.bottom > 0;
    const progress = playback.value(scene, target, !enhanced || !inView || document.hidden);
    renderScene(scene, chapter.dataset.chapter, progress, inView);
  });
}

function renderAccount({ account, viewportHeight, playback }) {
  const target = pinnedProgress(account.getBoundingClientRect(), viewportHeight);
  const progress = accountTimeline(playback.value(account, target, document.hidden));
  account.style.setProperty('--addon-order', progress.avatar.toFixed(4));
  account.style.setProperty('--addon-config', progress.change.toFixed(4));
  account.style.setProperty('--activity-reveal', progress.activity.toFixed(4));
  account.style.setProperty('--avatar-reveal', progress.avatar.toFixed(4));
  account.style.setProperty('--avatar-change', progress.change.toFixed(4));
}

/** Presentation only: no sessions, account controllers, storage or service adapters. */
export function initLandingPresentation(documentRoot = document) {
  const story = documentRoot.querySelector('.landing-story');
  const account = documentRoot.querySelector('.landing-account');
  if (!story || !account || !window.IntersectionObserver) return () => {};
  const chapters = [...story.querySelectorAll('[data-chapter]')];
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const desktop = window.matchMedia('(min-width: 1024px) and (min-height: 650px)');
  const visible = new Set([story, account]);
  const playback = createScenePlayback();
  let frame = 0;
  const update = time => {
    frame = 0;
    playback.begin(time);
    if (visible.has(story)) renderChapter({ story, chapters, viewportHeight: window.innerHeight, playback });
    account.classList.toggle('has-scene-motion', !reduced.matches && visible.has(account));
    if (!reduced.matches && visible.has(account) && account.classList.contains('is-enhanced')) renderAccount({ account, viewportHeight: window.innerHeight, playback });
    if (playback.pending() && !documentRoot.hidden) schedule();
  };
  const schedule = () => { if (!frame) frame = window.requestAnimationFrame(update); };
  const visibility = () => {
    story.classList.toggle('is-document-hidden', documentRoot.hidden);
    account.classList.toggle('is-document-hidden', documentRoot.hidden);
    schedule();
  };
  const configure = () => {
    story.classList.toggle('is-enhanced', desktop.matches && !reduced.matches);
    story.classList.toggle('has-scene-motion', !reduced.matches);
    account.classList.toggle('is-enhanced', desktop.matches && !reduced.matches);
    schedule();
  };
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) visible.add(entry.target);
      else visible.delete(entry.target);
    });
    schedule();
  }, { rootMargin: '150px' });
  [story, account].forEach(element => observer.observe(element));
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  documentRoot.addEventListener('visibilitychange', visibility);
  reduced.addEventListener('change', configure);
  desktop.addEventListener('change', configure);
  configure();
  return () => {
    window.cancelAnimationFrame(frame);
    observer.disconnect();
    window.removeEventListener('scroll', schedule);
    window.removeEventListener('resize', schedule);
    documentRoot.removeEventListener('visibilitychange', visibility);
    reduced.removeEventListener('change', configure);
    desktop.removeEventListener('change', configure);
    story.classList.remove('is-enhanced');
    story.classList.remove('has-scene-motion');
    account.classList.remove('is-enhanced', 'has-scene-motion', 'is-document-hidden');
    story.classList.remove('is-document-hidden');
  };
}
