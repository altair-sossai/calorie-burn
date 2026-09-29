import { expect, test } from './fixtures';

test('no computador o app continua como um cartão centralizado', async ({ app, page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await app.open();
  const phone = (await page.getByTestId('phone').boundingBox())!;
  expect(phone.width).toBe(420);
  expect(Math.round(phone.x + phone.width / 2)).toBe(640);
  expect(phone.y).toBeGreaterThan(0);
});
