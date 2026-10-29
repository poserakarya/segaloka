const { test, expect } = require('@playwright/test');

const baseURL = 'http://127.0.0.1:3100';

const cases = [
  { category: 'umrah', expected: 'umrah-premium-12d' },
  { category: 'halal-tour', expected: 'halal-tour-japan' },
];

for (const item of cases) {
  test(`Search ${item.category} menuju Detail Paket`, async ({ page }) => {
    const errors = [];

    page.on('pageerror', error => {
      errors.push(error.message);
    });

    const searchResponse = await page.goto(
      `${baseURL}/search?category=${item.category}`,
      { waitUntil: 'domcontentloaded' }
    );

    expect(searchResponse.status()).toBe(200);

    const packageLink = page.locator(
      `a[href="/paket/${item.expected}"]`
    );

    await expect(packageLink).toBeVisible({ timeout: 15000 });

    await packageLink.click();

    await expect(page).toHaveURL(
      new RegExp(`/paket/${item.expected}(?:[/?#]|$)`)
    );

    const heading = page.locator('h1').first();

    await expect(heading).toBeVisible();

    expect(errors).toEqual([]);
  });
}
