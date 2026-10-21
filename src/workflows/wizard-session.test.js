import { expect, it, vi } from 'vitest';
import { createWizardSessionStore } from './wizard-session.js';

it('migrates old wizard snapshots without retaining Nuvio or AIOMetadata passwords', () => {
  const legacy = { auth: { accessToken: 'synthetic', userId: 'user', isAuthenticated: true, password: 'private-nuvio' },
    aioPassword: 'private-aio', profiles: [{ id: 2, name: 'Profile' }], newlyCreatedProfileIds: [2],
    selectedProfileId: 2, selectedProfileName: 'Profile', currentStep: 4, maxUnlockedStep: 5 };
  const storage = { getItem: () => JSON.stringify(legacy), setItem: vi.fn(), removeItem: vi.fn() };
  const persistence = createWizardSessionStore({ key: 'synthetic', storage });
  const result = persistence.read();
  expect(result).toMatchObject({ selectedProfileId: 2, profiles: legacy.profiles, currentStep: 4, maxUnlockedStep: 5,
    auth: { accessToken: 'synthetic', userId: 'user', isAuthenticated: true } });
  expect(result.auth).not.toHaveProperty('password');
  expect(result).not.toHaveProperty('aioPassword');
  expect(storage.setItem.mock.calls[0][1]).not.toContain('private');
});

it('restores an authenticated snapshot saved before the delayed step transition at profile selection', () => {
  const storage = { getItem: () => JSON.stringify({ auth: { accessToken: 'synthetic', userId: 'user' }, currentStep: 1 }),
    setItem: vi.fn(), removeItem: vi.fn() };
  expect(createWizardSessionStore({ key: 'synthetic', storage }).read()).toMatchObject({ currentStep: 2, maxUnlockedStep: 2 });
});
