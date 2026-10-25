import { expect, test } from '@playwright/test';
import { isolateExternalServices } from './support/offline-services.js';

const avatar = { key: 'NetflixStyle/Naruto/Naruto.webp', score: 4 };
async function prepare(page, { totalUsage = 1234, cachedSetups, oldWorker = false } = {}) {
  await isolateExternalServices(page);
  if (cachedSetups !== undefined) await page.addInitScript(count => {
    localStorage.setItem('nuvio_metrics_v2:testing:nuvio_completions_cached_count', String(count));
  }, cachedSetups);
  let reads = 0;
  await page.route('**/api/avatars/ranking**', route => {
    reads++;
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ environment: 'testing', items: [avatar], ...(oldWorker ? {} : { totalUsage }) }) });
  });
  return () => reads;
}

for (const cachedSetups of [0, 2500]) {
  test(`two metrics roll once on reveal, preserve cached ${cachedSetups} and share the ranking read`, async ({ page }, testInfo) => {
    const reads = await prepare(page, { cachedSetups });
    const writes = [];
    page.on('request', request => { if (request.method() === 'POST') writes.push(request.url()); });
    await page.goto('/');
    const section = page.locator('[data-landing-metrics]');
    await expect(section.locator('[data-metric]')).toHaveCount(2);
    await expect(section.locator('.odometer-digit-strip')).toHaveCount(0);
    await section.scrollIntoViewIfNeeded();
    const setups = section.locator('[data-metric="setups"]');
    const avatars = section.locator('[data-metric="avatars"]');
    await expect(setups).toHaveAttribute('data-source', 'cache');
    await expect(setups.locator('[data-metric-status]')).toHaveText('Último dato guardado');
    await expect(avatars).toHaveAttribute('data-source', 'network');
    await expect(avatars.locator('[data-metric-accessible]')).toContainText('1,234');
    await expect(setups.locator('[data-metric-accessible]')).toContainText(new Intl.NumberFormat('es-MX').format(cachedSetups));
    await expect(avatars.locator('.odometer-digit-strip')).toHaveCount(4);
    await expect(avatars.locator('.odometer-static-char')).toHaveText(',');
    await page.waitForTimeout(1200);
    const before = await avatars.locator('[data-metric-value]').innerHTML();
    await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
    await section.scrollIntoViewIfNeeded();
    expect(await avatars.locator('[data-metric-value]').innerHTML()).toBe(before);
    expect(reads()).toBe(1);
    expect(writes).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath('metrics-desktop.png') });
    await page.setViewportSize({ width: 390, height: 844 });
    await section.scrollIntoViewIfNeeded();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await section.screenshot({ path: testInfo.outputPath('metrics-mobile.png') });
  });
}

test('missing setup data never turns the header estimate into a metric, and older Workers remain supported', async ({ page }) => {
  await prepare(page, { oldWorker: true });
  await page.goto('/');
  await page.locator('[data-landing-metrics]').scrollIntoViewIfNeeded();
  for (const metric of await page.locator('[data-metric]').all()) {
    await expect(metric).toHaveAttribute('data-source', 'unavailable');
    await expect(metric.locator('[data-metric-value]')).toHaveText('—');
    await expect(metric.locator('[data-metric-status]')).toHaveText('Sin datos confirmados');
  }
  await expect(page.locator('.completions-count-compact').first()).toHaveText('--');
});

test('late zero animates when visible; reduced motion immediately settles and bfcache does not replay', async ({ page }) => {
  await prepare(page);
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  await page.route('**/api/avatars/ranking**', async route => {
    await gate;
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ environment: 'testing', items: [], totalUsage: 0 }) });
  });
  await page.goto('/');
  const avatars = page.locator('[data-metric="avatars"]');
  await avatars.scrollIntoViewIfNeeded();
  await expect(avatars.locator('[data-metric-value]')).toHaveText('—');
  release();
  await expect(avatars.locator('.odometer-digit-strip')).toHaveCount(1);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(avatars.locator('[data-metric-value]')).toHaveText('0');
  await page.evaluate(() => {
    window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true }));
    window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
  });
  await expect(avatars.locator('[data-metric-value]')).toHaveText('0');
  await expect(avatars.locator('.odometer-digit-strip')).toHaveCount(0);
});

test('cached avatar totals survive failures without fabricating a zero', async ({ page }) => {
  await isolateExternalServices(page);
  await page.addInitScript(() => localStorage.setItem('nuvio_metrics_v2:testing:nuvio_avatar_ranks_cached_summary', JSON.stringify({ totalUsage: 87 })));
  await page.goto('/');
  const metric = page.locator('[data-metric="avatars"]');
  await metric.scrollIntoViewIfNeeded();
  await expect(metric).toHaveAttribute('data-source', 'cache');
  await expect(metric.locator('[data-metric-accessible]')).toContainText('87');
});

test('without JavaScript the two metrics retain honest labels and unavailable states', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await isolateExternalServices(page);
  await page.goto('/');
  await expect(page.locator('[data-metric]')).toHaveCount(2);
  await expect(page.locator('[data-metric-status]')).toHaveText(['Sin datos confirmados', 'Sin datos confirmados']);
  await context.close();
});
