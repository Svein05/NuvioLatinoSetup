import { sceneState } from './scene-state.js';

const rendered = new WeakMap();

/** Render decorative scene state only. Never mount functional application controllers. */
export function renderScene(scene, name, progress, inView) {
  const signature = [name, progress.toFixed(4), inView, window.innerWidth, window.innerHeight].join(':');
  if (rendered.get(scene) === signature) return;
  rendered.set(scene, signature);
  const state = sceneState(name, progress);
  scene.classList.add('is-active');
  scene.classList.toggle('is-in-view', inView);
  scene.style.setProperty('--progress', progress.toFixed(4));
  for (const [key, value] of Object.entries({ ...state.timeline, ...state.variables })) {
    scene.style.setProperty(`--${key}`, value.toFixed(4));
  }
  if (name === 'style') {
    scene.classList.toggle('is-badges-settled', state.variables['badges-show'] >= .9999);
  }
  Object.assign(scene.dataset, state.attributes);
  if (name === 'profile') {
    const nameField = scene.querySelector('[data-profile-name]');
    if (nameField.textContent !== state.name) nameField.textContent = state.name;
    scene.querySelectorAll('[data-avatar-option]').forEach((avatar, index) => {
      avatar.classList.toggle('is-chosen', index === state.avatar);
    });
  }
  if (name === 'style') {
    scene.style.setProperty('--poster-depth', `${scene.querySelector('.scene-poster').clientWidth / 2}px`);
  }
  if (name === 'assembly') {
    scene.style.setProperty('--orbit-distance', `${Math.min(scene.clientWidth * .35, scene.clientHeight * .36)}px`);
  }
}
