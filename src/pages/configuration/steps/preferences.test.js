import { describe, it, expect, vi } from 'vitest';
import { refillPosterDeck, resolveCandidateUrls } from './posters-demo.js';
import { tryRepairJson, importCustomBadgeFromSource } from './badges-import.js';
import { mountPreferencesStep } from './preferences.js';

describe('Preferences Step & Posters Demo', () => {
  it('refillPosterDeck excludes current IMDB id and shuffles', () => {
    const deck = refillPosterDeck('tt0409591');
    expect(deck.length).toBeGreaterThan(10);
    expect(deck.every(p => p.imdbId !== 'tt0409591')).toBe(true);
  });

  it('resolveCandidateUrls resolves betterposter and postersplus urls', async () => {
    const item = { imdbId: 'tt12345', tmdbId: '67890', type: 'movie', fallbackPoster: 'https://fallback.jpg' };
    const res = await resolveCandidateUrls(item, { tmdbKey: 'my-tmdb', mdblistKey: 'my-mdblist' });
    expect(res.betterUrl).toContain('tt12345');
    expect(res.plusUrl).toContain('tmdb_id=67890');
    expect(res.plusUrl).toContain('my-tmdb');
    expect(res.plusUrl).toContain('my-mdblist');
    expect(res.defaultUrl).toBe('https://fallback.jpg');
  });

  it('tryRepairJson fixes trailing commas and missing property commas', () => {
    const broken = '{\n  "title": "Test",\n}';
    const parsed = tryRepairJson(broken);
    expect(parsed.title).toBe('Test');
  });

  it('importCustomBadgeFromSource creates and registers a custom badge pack', async () => {
    const json = JSON.stringify({
      name: 'Custom Latino Pack',
      author: 'Tester',
      groups: [{ id: 'gr', name: 'Resolución' }],
      filters: [{ id: '4k', name: '4K HDR', groupId: 'gr', textColor: '#fff', borderColor: '#000', tagColor: '#123' }],
    });
    const pack = await importCustomBadgeFromSource(json, 'Custom Latino');
    expect(pack.name).toBe('Custom Latino');
    expect(pack.isCustom).toBe(true);
    expect(pack.sections.length).toBe(1);
    expect(pack.sections[0].items[0].name).toBe('4K HDR');
  });

  it('mountPreferencesStep handles toggles, poster engine selection, and badges', () => {
    const state = {
      apiKeys: {},
      preferences: {
        tmdbEnrichment: true,
        mdblistRatings: true,
        badgesEnabled: false,
        posterEngine: 'default',
        activeBadgeModules: ['gr', 'gq'],
        badgeModulesOrder: ['gr', 'gq'],
        selectedBadgePack: 'tinted',
      },
    };

    const listeners = {};
    const root = {
      querySelector: vi.fn(selector => {
        return {
          checked: selector.includes('Enrichment') || selector.includes('Ratings'),
          value: '', contains: () => false, setAttribute: vi.fn(), focus: vi.fn(),
          classList: { toggle: vi.fn(), add: vi.fn(), remove: vi.fn(), contains: () => false },
          addEventListener: (type, fn) => { listeners[selector] = fn; },
          removeEventListener: vi.fn(),
          querySelector: vi.fn(() => ({ className: '' })),
          querySelectorAll: vi.fn(() => []),
        };
      }),
      querySelectorAll: vi.fn(() => []),
    };

    const notify = vi.fn();
    const compileBadgeRules = vi.fn(async () => []);
    const step = mountPreferencesStep({
      state,
      actions: { notify, compileBadgeRules, onUpdate: vi.fn() },
      root,
    });

    step.selectPosterEngine('betterposter');
    expect(state.preferences.posterEngine).toBe('betterposter');

    step.toggleBadgeModule('ga', true);
    expect(state.preferences.activeBadgeModules).toContain('ga');

    step.toggleBadgeModule('ga', false);
    expect(state.preferences.activeBadgeModules).not.toContain('ga');

    step.selectBadgePack('modern');
    expect(state.preferences.selectedBadgePack).toBe('modern');

    step.dispose();
  });
});
