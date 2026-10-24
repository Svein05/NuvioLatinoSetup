import { accountProgress, chapterProgress, clamp, pinnedProgress } from './scene-progress.js';
import { renderScene } from './render-scene.js';

function renderChapter(story, chapters, viewportHeight) {
  const state = chapterProgress(chapters.map(chapter => chapter.getBoundingClientRect()), viewportHeight);
  story.dataset.activeChapter = chapters[state.index].dataset.chapter;
  chapters.forEach(chapter => {
    const rectangle = chapter.getBoundingClientRect();
    const progress = story.classList.contains('is-enhanced') ? pinnedProgress(rectangle, viewportHeight) : 1;
    const scene = chapter.querySelector('[data-scene]');
    const bounds = scene.getBoundingClientRect();
    renderScene(scene, chapter.dataset.chapter, progress, bounds.top < viewportHeight && bounds.bottom > 0);
  });
}

function renderAccount(account, viewportHeight) {
  const progress = account.classList.contains('is-enhanced')
    ? accountProgress(account.getBoundingClientRect(), viewportHeight)
    : { activity: 1, avatar: 1, change: 1 };
  account.style.setProperty('--addon-order', progress.avatar.toFixed(4));
  account.style.setProperty('--addon-config', progress.change.toFixed(4));
  account.style.setProperty('--activity-reveal', progress.activity.toFixed(4));
  account.style.setProperty('--avatar-reveal', progress.avatar.toFixed(4));
  account.style.setProperty('--avatar-change', progress.change.toFixed(4));
}

function renderBackdrop(backdrop, story, reduced) {
  if (!backdrop) return;
  if (reduced) {
    backdrop.style.removeProperty('opacity');
    backdrop.style.removeProperty('filter');
    return;
  }
  const end = Math.max(600, story.getBoundingClientRect().top + window.scrollY + 120);
  const raw = clamp(window.scrollY / end);
  const progress = raw * raw * (3 - 2 * raw);
  backdrop.style.opacity = (.85 - progress * .70).toFixed(3);
  backdrop.style.filter = `blur(${(progress * 6).toFixed(1)}px) brightness(${(1 - progress * .45).toFixed(2)})`;
}

/** Presentation only: no sessions, account controllers, storage or service adapters. */
export function initLandingPresentation(documentRoot = document) {
  const story = documentRoot.querySelector('.landing-story');
  const account = documentRoot.querySelector('.landing-account');
  if (!story || !account || !window.IntersectionObserver) return () => {};
  const chapters = [...story.querySelectorAll('[data-chapter]')];
  const backdrop = documentRoot.getElementById('heroBackdrop');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const desktop = window.matchMedia('(min-width: 1024px) and (min-height: 650px)');
  const visible = new Set([story, account]);
  let frame = 0;
  const update = () => {
    frame = 0;
    renderBackdrop(backdrop, story, reduced.matches);
    if (visible.has(story)) renderChapter(story, chapters, window.innerHeight);
    account.classList.toggle('has-scene-motion', !reduced.matches && visible.has(account));
    if (!reduced.matches && visible.has(account)) renderAccount(account, window.innerHeight);
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
