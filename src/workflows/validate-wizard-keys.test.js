import { expect, it, vi } from 'vitest';
import { validateWizardKeys } from './validate-wizard-keys.js';

const snapshot = { keys: { tmdb: 'synthetic', mdblist: 'synthetic', rpdb: 't0-free-rpdb' }, aiEnabled: false };

it('does not call missing required credentials or treat them as verified', async () => {
  const validateKey = vi.fn(async () => ({ status: 'skipped', valid: false }));
  const result = await validateWizardKeys({ keys: {}, aiEnabled: false }, { validateKey });
  expect(result.valid).toBe(false);
  expect(result.providers.tmdb.status).toBe('required');
  expect(validateKey.mock.calls.some(([provider]) => ['tmdb', 'mdblist'].includes(provider))).toBe(false);
});

it('validates the AI provider actually selected by the metadata payload when both keys exist', async () => {
  const data = { keys: { ...snapshot.keys, gemini: 'synthetic', openrouter: 'synthetic' }, aiEnabled: true };
  const result = await validateWizardKeys(data, { validateKey: async provider => ({
    valid: provider !== 'openrouter', status: provider === 'openrouter' ? 'unverifiable' : 'valid',
  }) });
  expect(result.valid).toBe(false);
});

it('allows verified required keys with explicit warnings for unverified optional providers', async () => {
  const result = await validateWizardKeys(snapshot, { validateKey: async provider => ({
    valid: ['tmdb', 'mdblist'].includes(provider), status: ['tmdb', 'mdblist'].includes(provider) ? 'valid' : 'unverifiable',
  }) });
  expect(result.valid).toBe(true);
  expect(result.warnings).toEqual(['rpdb']);
  expect(result.statusMap.rpdb).toBe(false);
});

it('requires a confirmed AI credential when AI search is enabled', async () => {
  const data = { ...snapshot, keys: { ...snapshot.keys, gemini: 'synthetic' }, aiEnabled: true };
  const result = await validateWizardKeys(data, { validateKey: async provider => ({
    valid: provider !== 'gemini', status: provider === 'gemini' ? 'unverifiable' : 'valid',
  }) });
  expect(result.valid).toBe(false);
  expect(result.statusMap.gemini).toBe(false);
});
