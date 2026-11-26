import { expect, test } from '@playwright/test';

test.beforeEach(async ({ context, page, baseURL }) => {
  await context.route('**/*', route => new URL(route.request().url()).origin === baseURL
    ? route.continue() : route.abort());
  await page.clock.setFixedTime(new Date('2026-11-25T15:00:00Z'));
});

test('vitrine e fatias na primeira dobra', async ({ page }) => {
  const availability = page.waitForResponse(response =>
    new URL(response.url()).pathname === '/rest/v1/menu_availability');
  const response = await page.goto('/');
  expect(response?.headers()['x-luciane-preview']).toBe('synthetic-local');
  expect((await availability).ok()).toBeTruthy();
  const fatias = page.getByRole('button', { name: 'Fatias Artesanais — Escolher fatia' });
  await expect(fatias).toBeVisible();
  await checkViewport(page);
  await expect(page).toHaveScreenshot('vitrine.png', { animations: 'disabled' });

  await fatias.click();
  const section = page.locator('#configurador');
  await expect(section).toHaveAttribute('data-active-category', 'fatias');
  await section.evaluate(element => element.scrollIntoView({ block: 'start', behavior: 'instant' }));
  await checkViewport(page);
  await expect(page).toHaveScreenshot('fatias.png', { animations: 'disabled' });
});

async function checkViewport(page) {
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  await page.waitForFunction(() => Array.from(document.images).every(image => {
    const box = image.getBoundingClientRect();
    const visible = box.width > 0 && box.height > 0 && box.bottom > 0 && box.top < innerHeight;
    return !visible || (image.complete && image.naturalWidth > 0);
  }));
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
}
