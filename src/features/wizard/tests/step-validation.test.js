import { describe, expect, it } from 'vitest';
import { validateWizardStep } from '../model/step-validation.js';

describe('validateWizardStep', () => {
  it('validates step 1 requiring authentication in standard mode', () => {
    expect(validateWizardStep(1, { isManualMode: false, nuvioAuth: { isAuthenticated: false } }).valid).toBe(false);
    expect(validateWizardStep(1, { isManualMode: false, nuvioAuth: { isAuthenticated: true, accessToken: null } }).valid).toBe(false);
    expect(validateWizardStep(1, { isManualMode: false, nuvioAuth: { isAuthenticated: true, accessToken: 'token-123' } })).toEqual({
      valid: true,
      error: null,
    });
    expect(validateWizardStep(1, { isManualMode: true, nuvioAuth: { isAuthenticated: false } })).toEqual({
      valid: true,
      error: null,
    });
  });

  it('validates step 2 requiring selected profile in standard mode', () => {
    expect(validateWizardStep(2, { isManualMode: false, selectedProfileId: null }).valid).toBe(false);
    expect(validateWizardStep(2, { isManualMode: false, selectedProfileId: 'profile-1' })).toEqual({
      valid: true,
      error: null,
    });
    expect(validateWizardStep(2, { isManualMode: true, selectedProfileId: null })).toEqual({
      valid: true,
      error: null,
    });
  });

  it('validates step 3 requiring at least one enabled collection folder', () => {
    expect(validateWizardStep(3, { collections: [] }).valid).toBe(false);
    expect(validateWizardStep(3, { collections: [{ enabled: false, folders: [{ enabled: true }] }] }).valid).toBe(false);
    expect(validateWizardStep(3, { collections: [{ enabled: true, folders: [{ enabled: false }] }] }).valid).toBe(false);
    expect(validateWizardStep(3, { collections: [{ enabled: true, folders: [{ enabled: true }] }] })).toEqual({
      valid: true,
      error: null,
    });
  });

  it('validates step 4 requiring TMDB, MDBList, validation and optional AI keys', () => {
    const validKeys = { tmdb: '12345678', mdblist: 'abcdefgh' };
    expect(validateWizardStep(4, { apiKeys: { tmdb: '123' } }).valid).toBe(false);
    expect(validateWizardStep(4, { apiKeys: { tmdb: '12345678', mdblist: 'short' } }).valid).toBe(false);
    expect(validateWizardStep(4, { apiKeys: validKeys, searchAiEnabled: true, apiKeysValidated: true }).valid).toBe(false);
    expect(validateWizardStep(4, {
      apiKeys: { ...validKeys, gemini: 'gemini-key' },
      searchAiEnabled: true,
      apiKeysValidated: true,
    })).toEqual({ valid: true, error: null });
    expect(validateWizardStep(4, {
      apiKeys: { ...validKeys, openrouter: 'router-key' },
      searchAiEnabled: true,
      apiKeysValidated: true,
    })).toEqual({ valid: true, error: null });
    expect(validateWizardStep(4, { apiKeys: validKeys, searchAiEnabled: false, apiKeysValidated: false }).valid).toBe(false);
    expect(validateWizardStep(4, { apiKeys: validKeys, searchAiEnabled: false, apiKeysValidated: true })).toEqual({
      valid: true,
      error: null,
    });
  });

  it('validates step 5 and 6 as unconditionally valid', () => {
    expect(validateWizardStep(5, {})).toEqual({ valid: true, error: null });
    expect(validateWizardStep(6, {})).toEqual({ valid: true, error: null });
  });

  it('validates step 7 requiring password with at least 6 characters', () => {
    expect(validateWizardStep(7, { aiometadata: { password: '' } }).valid).toBe(false);
    expect(validateWizardStep(7, { aiometadata: { password: '12345' } }).valid).toBe(false);
    expect(validateWizardStep(7, { aiometadata: { password: 'secret123' } })).toEqual({
      valid: true,
      error: null,
    });
  });

  it('returns valid for unrecognized step numbers', () => {
    expect(validateWizardStep(99, {})).toEqual({ valid: true, error: null });
  });
});
