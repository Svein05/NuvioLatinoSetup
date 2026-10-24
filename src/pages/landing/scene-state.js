import { clamp, chapterTimeline } from './scene-progress.js';

export function segment(progress, start, end) {
  const value = clamp((progress - start) / (end - start));
  return value * value * (3 - 2 * value);
}

export function profileState(progress) {
  const creating = progress >= .16 && progress < .55;
  const nameProgress = clamp((progress - .36) / .15);
  return {
    attributes: { profileState: progress < .12 ? 'svein' : progress < .55 ? 'create' : 'created' },
    variables: {
      'create-open': creating ? 1 : 0,
      'created-profile': segment(progress, .54, .61),
      'profile-select': segment(progress, .60, .68),
    },
    name: 'Perfil 3'.slice(0, Math.floor(nameProgress * 8)),
    avatar: progress < .28 ? 0 : progress < .36 ? 1 : 2,
  };
}

export function libraryState(progress) {
  const offset = segment(progress, .12, .18) + segment(progress, .28, .34) + segment(progress, .44, .50);
  return {
    variables: { 'collection-page': offset, 'api-ready': segment(progress, .55, .68) },
    attributes: { collectionSection: ['now', 'platforms', 'genres', 'anime'][Math.round(offset)] },
  };
}

export function styleState(progress) {
  const turn = segment(progress, .12, .40);
  return {
    variables: { 'poster-turn': turn, 'badges-show': segment(progress, .34, .52) },
    attributes: { poster: turn < .5 ? 'original' : 'better' },
  };
}

export function assemblyState(progress) {
  const converge = segment(progress, .16, .39);
  const expand = segment(progress, .42, .68);
  const radius = 1 - converge * .92 + expand * .92;
  return {
    variables: {
      'orbit-radius': radius,
      'orbit-angle': segment(progress, .02, .68) * 180,
      'config-create': segment(progress, .38, .61),
      'config-flash': Math.sin(segment(progress, .36, .58) * Math.PI),
    },
    attributes: { orbitState: progress >= .68 ? 'orbiting' : 'forming' },
  };
}

const states = { profile: profileState, library: libraryState, style: styleState, assembly: assemblyState };

export function sceneState(name, progress) {
  return { ...states[name](progress), timeline: chapterTimeline(progress) };
}
