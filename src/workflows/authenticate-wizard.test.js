import { expect, it, vi } from 'vitest';
import { authenticateWizard } from './authenticate-wizard.js';

const credentials = { email: 'test@example.invalid', password: 'synthetic' };
const auth = { accessToken: 'synthetic', userId: 'user' };

it('does not create a profile when the authenticated profile read fails', async () => {
  const client = { login: vi.fn(async () => auth), getProfiles: vi.fn(async () => { throw new Error('offline'); }), createProfile: vi.fn() };
  await expect(authenticateWizard({ mode: 'login', credentials, context: {}, client })).rejects.toThrow('offline');
  expect(client.createProfile).not.toHaveBeenCalled();
});

it('creates an initial profile only after a confirmed empty list and reports partial warnings', async () => {
  const profile = { id: 1, name: 'Principal', warnings: ['Synthetic cleanup warning'] };
  const client = { signup: vi.fn(async () => auth), getProfiles: vi.fn(async () => []), createProfile: vi.fn(async () => profile) };
  expect(await authenticateWizard({ mode: 'signup', credentials, context: { apikey: 'public' }, client }))
    .toEqual({ auth, profiles: [profile], email: credentials.email, warnings: profile.warnings });
  expect(client.createProfile).toHaveBeenCalledWith({ apikey: 'public', ...auth, name: 'Principal' });
});
