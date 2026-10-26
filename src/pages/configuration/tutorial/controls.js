import { TMDB_CHAPTERS, mediaTime } from './chapters.js';

function chapterButtons(container, marker = false) {
  return TMDB_CHAPTERS.map(({ start, title }, index) => {
    const button = container.ownerDocument.createElement('button');
    button.type = 'button';
    button.dataset.chapter = String(index);
    button.disabled = true;
    button.setAttribute('aria-label', `${mediaTime(start)} · ${title}`);
    if (marker) button.title = `${mediaTime(start)} · ${title}`;
    else {
      const time = container.ownerDocument.createElement('span');
      time.textContent = mediaTime(start);
      button.append(time, container.ownerDocument.createTextNode(title));
    }
    const item = marker ? button : container.ownerDocument.createElement('li');
    if (!marker) item.append(button);
    container.append(item);
    return button;
  });
}

function controlsFor(dialog) {
  const elements = Object.fromEntries(['play', 'seek', 'progress', 'time', 'status', 'speed']
    .map(key => [key, dialog.querySelector(`[data-tutorial-${key}]`)]));
  return { ...elements, video: dialog.querySelector('video'),
    chapters: chapterButtons(dialog.querySelector('[data-tutorial-chapters]')),
    markers: chapterButtons(dialog.querySelector('[data-tutorial-markers]'), true) };
}

function synchronize({ video, play, seek, progress, time, chapters, markers }) {
  const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0;
  const current = video.currentTime || 0;
  const active = Math.max(0, TMDB_CHAPTERS.findLastIndex(chapter => current >= chapter.start));
  seek.disabled = !duration;
  seek.max = String(duration);
  seek.value = String(current);
  seek.setAttribute('aria-valuetext', `${mediaTime(current)} de ${mediaTime(duration)} · ${TMDB_CHAPTERS[active].title}`);
  progress.style.width = `${duration ? current / duration * 100 : 0}%`;
  time.textContent = `${mediaTime(current)} / ${mediaTime(duration)}`;
  play.setAttribute('aria-label', video.paused ? 'Reproducir video' : 'Pausar video');
  play.querySelector('i').className = `fa-solid fa-${video.paused ? 'play' : 'pause'}`;
  for (const [index, chapter] of TMDB_CHAPTERS.entries()) {
    for (const button of [chapters[index], markers[index]]) {
      button.disabled = !duration || chapter.start >= duration;
      if (index === active) button.setAttribute('aria-current', 'true');
      else button.removeAttribute('aria-current');
    }
    markers[index].style.setProperty('--chapter-position', `${duration ? chapter.start / duration * 100 : 0}%`);
  }
}

export function mountTutorialControls(dialog, lifetime) {
  const controls = controlsFor(dialog);
  const { video, play, seek, speed, status, chapters, markers } = controls;
  const ready = () => Number.isFinite(video.duration) && video.duration > 0;
  async function togglePlayback() {
    if (!video.paused) { video.pause(); return; }
    try { await video.play(); }
    catch { status.textContent = 'No se pudo reproducir el video. Intenta nuevamente.'; }
  }
  lifetime.on(play, 'click', togglePlayback);
  lifetime.on(seek, 'input', () => { if (ready()) video.currentTime = Number(seek.value); });
  lifetime.on(speed, 'change', event => {
    video.playbackRate = Number(event.target.value);
  });
  for (const button of [...chapters, ...markers]) lifetime.on(button, 'click', () => {
    if (!ready()) return;
    video.currentTime = TMDB_CHAPTERS[Number(button.dataset.chapter)].start;
    synchronize(controls);
  });
  for (const event of ['loadedmetadata', 'durationchange', 'timeupdate', 'play', 'pause', 'ended', 'seeked']) {
    lifetime.on(video, event, () => synchronize(controls));
  }
  lifetime.on(video, 'loadstart', () => { status.textContent = 'Cargando video…'; });
  lifetime.on(video, 'waiting', () => { status.textContent = 'Cargando video…'; });
  for (const event of ['canplay', 'playing', 'seeked']) lifetime.on(video, event, () => { status.textContent = ''; });
  lifetime.on(video, 'error', () => { status.textContent = 'No se pudo cargar el video. Cierra y vuelve a abrir el tutorial para reintentar.'; });
  video.controls = false;
  dialog.querySelector('[data-tutorial-controls]').hidden = false;
  lifetime.add(() => {
    dialog.querySelector('[data-tutorial-chapters]').replaceChildren();
    dialog.querySelector('[data-tutorial-markers]').replaceChildren();
    dialog.querySelector('[data-tutorial-controls]').hidden = true;
    video.controls = true;
  });
  synchronize(controls);
}
