import { sceneState } from './scene-state.js';

/** Render decorative scene state only. Never mount functional application controllers. */
export function renderScene(scene, name, progress, inView) {
  const state = sceneState(name, progress);
  scene.classList.add('is-active');
  scene.classList.toggle('is-in-view', inView);
  scene.style.setProperty('--progress', progress.toFixed(4));
  for (const [key, value] of Object.entries({ ...state.timeline, ...state.variables })) {
    scene.style.setProperty(`--${key}`, value.toFixed(4));
  }
  Object.assign(scene.dataset, state.attributes);
  if (name === 'profile') {
    scene.querySelector('[data-profile-name]').textContent = state.name;
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
