import { describe, it, expect, vi } from 'vitest';
import { renderAioSection } from './aiometadata.js';

describe('aiometadata section', () => {
  it('renders unlock prompt when aioProtected is true', () => {
    const card = { innerHTML: '', querySelectorAll: () => [], querySelector: () => null };
    const root = { getElementById: vi.fn(id => (id === 'accountAioCard' ? card : null)) };
    const state = { aioProtected: true, aioUuid: 'secret-uuid' };

    renderAioSection(state, { root });
    expect(card.innerHTML).toContain('Addon AIOMetadata Protegido');
    expect(card.innerHTML).toContain('secret-uuid');
  });

  it('renders identity and engine options when unlocked', () => {
    const card = { innerHTML: '', querySelectorAll: () => [], querySelector: () => null };
    const root = { getElementById: vi.fn(id => (id === 'accountAioCard' ? card : null)) };
    const state = { aioProtected: false, aioUuid: 'open-uuid', posterEngine: 'betterposter' };

    renderAioSection(state, { root });
    expect(card.innerHTML).toContain('open-uuid');
    expect(card.innerHTML).toContain('BetterPoster');
  });
});
