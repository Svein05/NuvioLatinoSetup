import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { compileStreamingConfig } from '../index.js';

it('compiles the actual public template while retaining every unrelated setting', () => {
  const template = JSON.parse(readFileSync(new URL('../../../../public/templates/Aiostream.json', import.meta.url)));
  const before = structuredClone(template);
  const result = compileStreamingConfig(template, { torbox: ' synthetic-key ', realdebrid: 'other-key', alldebrid: ' ' });
  expect(template).toEqual(before);
  const expected = structuredClone(template);
  expected.services.forEach(service => {
    service.enabled = ['torbox', 'realdebrid'].includes(service.id);
    service.credentials = service.enabled ? { apiKey: service.id === 'torbox' ? 'synthetic-key' : 'other-key' } : {};
  });
  expected.presets.forEach(preset => {
    if (Array.isArray(preset.options?.services)) preset.options.services = ['torbox', 'realdebrid'];
  });
  expect(result).toEqual(expected);
  result.presets[0].name = 'changed';
  expect(template).toEqual(before);
});

it('preserves presets without a service list and independently copies each active list', () => {
  const source = { services: [], presets: [{ options: { services: [] } }, { options: { services: [] } }, { name: 'untouched' }] };
  const result = compileStreamingConfig(source, { torbox: 'key' });
  result.presets[0].options.services.push('other');
  expect(result.presets[1].options.services).toEqual(['torbox']);
  expect(result.presets[2]).toEqual({ name: 'untouched' });
});

it.each([{}, { torbox: '' }, { torbox: ' ' }])('requires at least one nonempty key: %j', keys => {
  expect(() => compileStreamingConfig({}, keys)).toThrow(/al menos una/);
});

it.each([null, [], 'invalid'])('rejects an invalid template: %j', template => {
  expect(() => compileStreamingConfig(template, { torbox: 'key' })).toThrow(/plantilla/);
});
