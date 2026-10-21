import { expect, test } from '@playwright/test';
import { prepareAccount } from './support/account.js';

test('authenticated overview recovers continue-watching cards from the scoped table', async ({ page }) => {
  const progressRequests = [];
  page.on('request', request => {
    if (request.url().includes('/watch_progress?')) progressRequests.push(request.url());
  });
  await prepareAccount(page, 'fallback');
  await expect(page.locator('#rowCurrentlyWatchingCards')).toContainText('Synthetic continue watching');
  await expect(page.locator('#metricProgressCount')).toHaveText('1');
  await expect(page.locator('#rowRecentlyWatchedCards')).toContainText('Synthetic watched item');
  expect(progressRequests.length).toBeGreaterThan(0);
  expect(progressRequests.every(url => url.startsWith('https://api.nuvio.tv/') && url.includes('profile_id=eq.1'))).toBe(true);
});

test('authenticated overview reports a progress outage without clearing the watched section', async ({ page }) => {
  await prepareAccount(page, 'failed');
  await expect(page.locator('#rowCurrentlyWatchingCards')).toContainText('No se pudo cargar el progreso');
  await expect(page.locator('#rowCurrentlyWatchingCards')).not.toContainText('Sin reproducciones');
  await expect(page.locator('#metricProgressCount')).toHaveText('—');
  await expect(page.locator('#rowRecentlyWatchedCards')).toContainText('Synthetic watched item');
});

test('authenticated overview renders progress directly from the numeric-cursor RPC', async ({ page }) => {
  const requests = [];
  page.on('request', request => {
    if (request.url().includes('/watch_progress?')) requests.push(request.url());
  });
  await prepareAccount(page, 'rpc');
  await expect(page.locator('#rowCurrentlyWatchingCards')).toContainText('Synthetic continue watching');
  await expect(page.locator('#metricProgressCount')).toHaveText('1');
  expect(requests).toEqual([]);
});

test('overview treats remote titles as text and rejects executable poster URLs', async ({ page }) => {
  await prepareAccount(page, 'unsafe');
  await expect(page.locator('#rowCurrentlyWatchingCards h5')).toHaveText('<img src=x onerror=alert(1)>');
  await expect(page.locator('#rowCurrentlyWatchingCards img')).not.toHaveAttribute('src', /^javascript:/);
});
