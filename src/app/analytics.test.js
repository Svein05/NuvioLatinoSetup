import { expect, it, vi } from 'vitest';
import { installPublicAnalytics } from './analytics.js';

function documentStub(existing = false) {
  return { querySelector: vi.fn(() => existing ? {} : null),
    createElement: vi.fn(() => ({ dataset: {} })), body: { append: vi.fn() } };
}
const location = path => ({ origin: 'https://guia.lat-add.com', pathname: path, search: '', hash: '' });

it('loads only the approved public beacon on clean public production URLs', () => {
  const doc = documentStub();
  installPublicAnalytics(doc, location('/'));
  const script = doc.body.append.mock.calls[0][0];
  expect(script.src).toBe('https://static.cloudflareinsights.com/beacon.min.js');
  expect(JSON.parse(script.dataset.cfBeacon)).toEqual({ token: '12a952af0aa14b259e07528c885fd62f' });
  expect(script.type).toBe('module');
});

it('does not load analytics in testing, private forms, parameterized URLs or duplicate installations', () => {
  for (const url of [{ ...location('/'), origin: 'http://localhost:5173' },
    { ...location('/'), origin: 'https://testing-latinosetup.pages.dev' },
    location('/account/'), location('/configuration/'), location('/modder/'),
    { ...location('/'), search: '?key=synthetic' }, { ...location('/'), hash: '#private' }]) {
    const doc = documentStub();
    installPublicAnalytics(doc, url);
    expect(doc.body.append).not.toHaveBeenCalled();
  }
  const existing = documentStub(true);
  installPublicAnalytics(existing, location('/documentation/'));
  expect(existing.body.append).not.toHaveBeenCalled();
});
