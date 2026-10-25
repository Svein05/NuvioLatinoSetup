import { expect, test } from '@playwright/test';
import { openLanding, revealChapter } from './support/landing.js';

test('profile creation selects Svein, opens the catalog, types a name and selects Perfil 3', async ({ page }, testInfo) => {
  await openLanding(page);
  const scene = page.locator('[data-scene="profile"]');
  await revealChapter(page, 'profile', .03);
  await expect(scene).toHaveAttribute('data-profile-state', 'svein');
  await expect(scene.getByText('Elige el perfil')).toHaveCount(1);
  await revealChapter(page, 'profile', .22);
  await expect(scene.locator('.profile-modal-scrim')).toHaveCSS('opacity', '1');
  await revealChapter(page, 'profile', .31);
  await expect(scene.locator('[data-avatar-option]').nth(1)).toHaveClass(/is-chosen/);
  await revealChapter(page, 'profile', .45);
  await expect(scene.locator('[data-profile-name]')).toHaveText('Perf');
  await page.screenshot({ path: testInfo.outputPath('profile-creation.png') });
  await revealChapter(page, 'profile', .85);
  await expect(scene).toHaveAttribute('data-profile-state', 'created');
  await expect(scene.locator('.profile-modal-scrim')).toHaveCSS('opacity', '0');
  await expect(scene.locator('.profile-created-label')).toHaveText('Perfil 3');
  await expect(scene).not.toContainText('Perfil elegido');
});

test('collection browsing visits four sections before the two-key completion', async ({ page }, testInfo) => {
  await openLanding(page);
  const scene = page.locator('[data-scene="library"]');
  for (const [progress, section] of [[.05,'now'],[.23,'platforms'],[.39,'genres'],[.53,'anime']]) {
    await revealChapter(page, 'library', progress);
    await expect(scene).toHaveAttribute('data-collection-section', section);
    await page.screenshot({ path: testInfo.outputPath(`collections-${section}.png`) });
  }
  await revealChapter(page, 'library', .85);
  await expect(scene.locator('.api-complete-scrim')).toHaveCSS('opacity', '1');
  await expect(scene.locator('.api-complete-card')).toContainText('Todo listo');
  await expect(scene.locator('.api-complete-card')).toContainText('TMDB');
  await expect(scene.locator('.api-complete-card')).toContainText('MDBList');
});

test('poster cube selection and full badge carousel are synchronized and reversible', async ({ page }, testInfo) => {
  await openLanding(page);
  const scene = page.locator('[data-scene="style"]');
  await revealChapter(page, 'style', .05);
  await expect(scene).toHaveAttribute('data-poster', 'original');
  await revealChapter(page, 'style', .26);
  await page.screenshot({ path: testInfo.outputPath('poster-cube.png') });
  await revealChapter(page, 'style', .85);
  await expect(scene).toHaveAttribute('data-poster', 'better');
  await expect(scene.locator('.catalog-badge')).toHaveCount(74);
  await expect(scene.locator('.badge-carousel-track').first()).toHaveCSS('animation-play-state', 'running');
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(scene.locator('.badge-carousel-track').first()).toHaveCSS('animation-play-state', 'paused');
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.screenshot({ path: testInfo.outputPath('poster-final.png') });
  await revealChapter(page, 'style', .05);
  await expect(scene).toHaveAttribute('data-poster', 'original');
});

test('five steps converge to a Latin configuration and orbit its final core', async ({ page }, testInfo) => {
  await openLanding(page);
  const scene = page.locator('[data-scene="assembly"]');
  await revealChapter(page, 'assembly', .39);
  await expect(scene).toHaveAttribute('data-orbit-state', 'forming');
  await expect(scene.locator('.config-orbit-node')).toHaveCount(5);
  await revealChapter(page, 'assembly', .85);
  await expect(scene).toHaveAttribute('data-orbit-state', 'orbiting');
  await expect(scene.locator('.config-core')).toHaveCSS('opacity', '1');
  await expect(scene.locator('.config-core')).toContainText('en latino');
  await page.screenshot({ path: testInfo.outputPath('configuration-orbit.png') });
});
