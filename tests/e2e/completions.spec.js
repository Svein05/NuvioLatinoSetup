import { expect, test } from '@playwright/test';
import { isolateExternalServices } from './support/offline-services.js';

for (const count of [0, 2500]) {
  test(`the shared counter keeps cached ${count} visible on public pages during an outage`, async ({ page }) => {
    await isolateExternalServices(page);
    await page.addInitScript(value => {
      localStorage.setItem('nuvio_metrics_v2:testing:nuvio_completions_cached_count', String(value));
    }, count);
    for (const url of ['/', '/account/', '/documentation/', '/configuration/']) {
      await page.goto(url);
      const pill = page.locator('.completions-counter-pill').first();
      await expect(pill).toHaveAttribute('data-source', 'cache');
      await expect(pill).toHaveAttribute('title', /confirmar/);
      const digits = pill.locator('.completions-count-compact');
      await expect(digits).toHaveText(count === 0 ? '0' : '2.5k');
    }
  });
}

test('blocked local and session storage leaves the counter and mobile menu usable', async ({ page }) => {
  await isolateExternalServices(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    for (const name of ['localStorage', 'sessionStorage']) {
      Object.defineProperty(window, name, { get() { throw new DOMException('synthetic blocked storage', 'SecurityError'); } });
    }
  });
  await page.goto('/');
  const pill = page.locator('.completions-counter-pill').first();
  await expect(pill).toHaveAttribute('data-source', 'unavailable');
  await expect(pill.locator('.completions-count-compact')).toHaveText('--');
  await page.locator('#btnMobileHeaderMenu').click();
  await expect(page.locator('#mobileHeaderDropdown')).toHaveClass(/is-open/);
  await page.keyboard.press('Escape');
  await expect(page.locator('#mobileHeaderDropdown')).not.toHaveClass(/is-open/);
});

test('reads the Worker total in both landing metrics and header with one shared request', async ({ page }) => {
  await isolateExternalServices(page);
  let reads = 0;
  await page.route('**/api/completions', route => {
    expect(route.request().method()).toBe('GET');
    reads++;
    return route.fulfill({ contentType: 'application/json', body: '{"value":55,"environment":"testing"}' });
  });
  await page.goto('/');
  const pill = page.locator('.completions-counter-pill').first();
  await expect(pill).toHaveAttribute('data-source', 'network');
  await expect.poll(() => pill.locator('.completions-count-compact .odometer-digit-slot')
    .evaluateAll(slots => slots.map(slot => slot.dataset.digit).join(''))).toBe('55');
  const metric = page.locator('[data-metric="setups"]');
  await metric.scrollIntoViewIfNeeded();
  await expect(metric).toHaveAttribute('data-source', 'network');
  await expect(metric.locator('[data-metric-accessible]')).toContainText('55');
  expect(reads).toBe(1);
});
