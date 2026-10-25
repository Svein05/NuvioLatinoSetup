import { expect, it } from 'vitest';
import { createScenePlayback } from './scene-playback.js';

it('limits visual progress after a sudden target change and eventually settles exactly', () => {
  const playback = createScenePlayback();
  const scene = {};
  playback.begin(0);
  expect(playback.value(scene, 1)).toBeLessThan(.01);
  expect(playback.pending()).toBe(true);
  let value;
  for (let time = 16; time <= 3000; time += 16) {
    playback.begin(time);
    value = playback.value(scene, 1);
  }
  expect(value).toBe(1);
  expect(playback.pending()).toBe(false);
});

it('reverses from the current frame and skips motion when requested', () => {
  const playback = createScenePlayback();
  const scene = {};
  playback.begin(0);
  expect(playback.value(scene, .7, true)).toBe(.7);
  playback.begin(16);
  const reversed = playback.value(scene, 0);
  expect(reversed).toBeLessThan(.7);
  expect(reversed).toBeGreaterThan(.6);
  playback.begin(10000);
  expect(playback.value(scene, 0)).toBeGreaterThan(.6);
  expect(playback.value(scene, 0, true)).toBe(0);
});
