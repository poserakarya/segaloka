const { test, expect } = require('@playwright/test');

const baseURL = 'http://127.0.0.1:3100';

const routes = [
  '/',
  '/search',
  '/akomodasi',
  '/destinasi',
  '/inspirasi',
  '/atraksi',
  '/pusat-bantuan',
  '/masuk',
  '/daftar',
];

for (const route of routes) {
  test(`Browser audit: ${route}`, async ({ page }) => {
    const errors = [];

    page.on('pageerror', error => {
      errors.push(`PAGE ERROR: ${error.message}`);
    });

    page.on('console', message => {
      if (message.type() === 'error') {
        errors.push(`CONSOLE ERROR: ${message.text()}`);
      }
    });

    const response = await page.goto(`${baseURL}${route}`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    expect(response, 'Tidak ada respons HTTP').not.toBeNull();
    expect(response.status(), `HTTP error pada ${route}`).toBeLessThan(400);

    await page.waitForLoadState('networkidle', {
      timeout: 10000,
    }).catch(() => {});

    await page.waitForTimeout(1000);

    expect(
      errors,
      `Runtime error pada ${route}:\n${errors.join('\n')}`
    ).toEqual([]);
  });
}

test('Search menuju Detail Paket', async ({ page }) => {
  await page.goto(`${baseURL}/search`, {
    waitUntil: 'domcontentloaded',
  });

  const packageLinks = page.locator('a[href^="/paket/"]');

  const count = await packageLinks.count();

  if (count === 0) {
    test.skip(true, 'Tidak ada link paket pada hasil pencarian default.');
  }

  const href = await packageLinks.first().getAttribute('href');

  expect(href).toBeTruthy();

  const response = await page.goto(new URL(href, baseURL).href, {
    waitUntil: 'domcontentloaded',
  });

  expect(response).not.toBeNull();
  expect(response.status()).toBeLessThan(400);
});
