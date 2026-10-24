import { expect, test } from '@playwright/test';
import { prepareAccount } from './support/account.js';

const key = 'NetflixStyle/One Piece/Hero.webp';
const sha = 'a'.repeat(40);
for (const failProfileSave of [false, true]) {
  test(`avatar usage ${failProfileSave ? 'is not recorded after a failed profile save' : 'is recorded only after the profile save is confirmed'}`, async ({ page }) => {
    let profiles = [{ profile_index: 1, name: 'Synthetic profile', avatar_url: '/assets/logo/logo.webp' }];
    const events = [];
    const votes = [];
    await prepareAccount(page, 'rpc', {
      respond(url, payload) {
        if (url.pathname.endsWith('/sync_pull_profiles')) return { body: profiles };
        if (url.pathname.endsWith('/sync_push_profiles')) {
          events.push('save');
          if (failProfileSave) return { status: 503, body: {} };
          profiles = payload.p_profiles;
          return { body: { success: true } };
        }
      },
      respondExternal(url, request) {
        if (url.pathname.includes('/git/ref/')) return { body: { object: { sha } } };
        if (url.pathname.includes('/git/trees/')) return { body: { tree: [{ type: 'blob', path: `assets/profile_icons/${key}` }] } };
        if (url.pathname === '/api/avatars/ranking') return { body: { environment: 'testing', items: [{ key, score: 7 }] } };
        if (url.pathname === '/api/avatars/usage') {
          events.push('vote');
          votes.push({ body: request.postDataJSON(), authorization: request.headers().authorization });
          return { body: { environment: 'testing', status: 'recorded', score: 8 } };
        }
      },
    });
    await page.locator('.account-nav-btn[data-section="avatars"]').click();
    const card = page.locator('#blockMostUsedAvatars .netflix-avatar-card').first();
    await expect(card.locator('.avatar-user-count-badge')).toHaveText('7');
    await card.click();
    await page.locator('#btnAccountSave').focus();
    await page.locator('#btnAccountSave').press('Enter');
    if (failProfileSave) {
      await expect(page.locator('#latToastContainer')).toContainText('Error al guardar');
      expect(votes).toHaveLength(0);
    } else {
      await expect.poll(() => votes.length).toBe(1);
      expect(events).toEqual(['save', 'vote']);
      expect(votes[0]).toEqual({ body: { key }, authorization: 'Bearer synthetic-test-only' });
    }
  });
}
