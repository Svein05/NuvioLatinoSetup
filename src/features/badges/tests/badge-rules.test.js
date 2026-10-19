import { expect, it } from 'vitest';
import { getBadgePackById, getPackSectionsOrdered, compileBadgeRules,
  sanitizeLanguageAndBadges, normalizeBadgeColor, listBadgePacks, addCustomBadgePack } from '../index.js';

it('preserves all bundled styles, ordered modules and Latino-first language previews', () => {
  for (const pack of listBadgePacks()) {
    const before = JSON.stringify(pack);
    const sections = getPackSectionsOrdered(pack, ['glang', 'gsub', 'gr'], ['gsub', 'glang', 'gr']);
    expect(sections.map(section => section.id)).toEqual(['gsub', 'glang', 'gr']);
    expect(sections[0].items[0].name).toBe('Latino Sub');
    expect(sections[1].items[0].name).toBe('Latino');
    expect(sections[1].items).toHaveLength(46);
    expect(JSON.stringify(pack)).toBe(before);
  }
});

it('keeps native custom preview items and colors unchanged', () => {
  const section = { id: 'gr', items: [{ name: 'Custom', img: 'https://example.invalid/custom.png' }] };
  expect(getPackSectionsOrdered({ isCustom: true, sections: [section] }, ['gr'], ['gr'])).toEqual([section]);
  expect(normalizeBadgeColor('#80FF0000')).toBe('rgba(255, 0, 0, 0.5)');
});

it('preserves native Latino assets, separates Spain and does not mutate input filters', () => {
  const filters = [Object.freeze({ id: 'lat', name: 'Latino', groupId: 'gl', imageURL: 'https://example.invalid/native.png', pattern: 'old' }),
    Object.freeze({ name: 'Spanish', groupId: 'gl', pattern: 'spanish|latino' })];
  const output = sanitizeLanguageAndBadges(Object.freeze(filters));
  expect(output[0].imageURL).toBe(filters[0].imageURL);
  expect(output[0].pattern).toContain('latino');
  expect(output[1].pattern).not.toContain('latino');
  expect(filters[0].pattern).toBe('old');
});

it('compiles selected groups in order and retains ungrouped rules', () => {
  const document = { groups: [{ id: 'ga' }, { id: 'gr' }, { id: 'glang' }], filters: [
    { id: 'audio', groupId: 'ga' }, { id: 'resolution', groupId: 'gr' }, { id: 'ungrouped' },
    { id: 'lat', name: 'Latino', groupId: 'glang' },
  ] };
  const output = compileBadgeRules(document, ['gr', 'ga'], ['gr', 'ga']);
  expect(output.groups.map(group => group.id)).toEqual(['gr', 'ga']);
  expect(output.filters.map(filter => filter.id)).toEqual(['resolution', 'audio', 'ungrouped']);
  expect(document.groups.map(group => group.id)).toEqual(['ga', 'gr', 'glang']);
});

it('owns custom catalog additions and exposes array snapshots', () => {
  const snapshot = listBadgePacks();
  const pack = { id: 'synthetic-test-pack', isCustom: true, sections: [] };
  addCustomBadgePack(pack);
  expect(getBadgePackById(pack.id)).toBe(pack);
  expect(listBadgePacks()[0]).toBe(pack);
  expect(snapshot.some(item => item.id === pack.id)).toBe(false);
});
