import { expect, it } from 'vitest';
import { profileState, libraryState, styleState, assemblyState } from './scene-state.js';

it('creates a third profile through avatar selection and a typed name, then selects it', () => {
  expect(profileState(.03).attributes.profileState).toBe('svein');
  expect(profileState(.14).variables['create-open']).toBe(0);
  expect(profileState(.22).variables['create-open']).toBe(1);
  expect(profileState(.30).avatar).toBe(1);
  expect(profileState(.40).avatar).toBe(2);
  expect(profileState(.43).name).toBe('Per');
  expect(profileState(.52).name).toBe('Perfil 3');
  expect(profileState(.85).attributes.profileState).toBe('created');
  expect(profileState(.85).variables['profile-select']).toBe(1);
});

it('visits every collection section before completing both API connections', () => {
  expect([.05,.23,.39,.53].map(progress => libraryState(progress).attributes.collectionSection))
    .toEqual(['now','platforms','genres','anime']);
  expect(libraryState(.53).variables['api-ready']).toBe(0);
  expect(libraryState(.85).variables['api-ready']).toBe(1);
});

it('switches provider selection halfway through the cube turn and retains the final provider', () => {
  expect(styleState(.10).attributes.poster).toBe('original');
  expect(styleState(.35).attributes.poster).toBe('better');
  expect(styleState(.85).variables['poster-turn']).toBe(1);
});

it('converges the steps before creating the core and restoring the final orbit', () => {
  expect(assemblyState(.39).variables['orbit-radius']).toBeCloseTo(.08);
  expect(assemblyState(.39).variables['config-create']).toBeLessThan(.1);
  expect(assemblyState(.85).variables['orbit-radius']).toBe(1);
  expect(assemblyState(.85).variables['config-create']).toBe(1);
  expect(assemblyState(.85).attributes.orbitState).toBe('orbiting');
});
