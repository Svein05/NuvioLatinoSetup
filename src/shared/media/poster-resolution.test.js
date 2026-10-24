import { expect, it } from 'vitest';
import { posterResolution } from './poster-resolution.js';

it('covers real poster pixels and caps retina downloads without originals', () => {
  expect(posterResolution(282, 1)).toBe(342);
  expect(posterResolution(282, 2)).toBe(780);
  expect(posterResolution(282, 3)).toBe(780);
  expect(posterResolution(180, 2)).toBe(500);
  expect(posterResolution(900, 4)).toBe(780);
  expect(posterResolution(200, undefined)).toBe(342);
});
