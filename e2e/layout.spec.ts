import { expect, test } from './fixtures';

for (const width of [320, 360, 375, 390, 420]) {
  test(`layout em ${width}px`, async ({ app, page }) => {
    await page.setViewportSize({ width, height: 800 });
    await app.open();
    const noHorizontalScroll = () => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
    const inside = async (sel: string, container: string) => {
      const [a, b] = await Promise.all([page.locator(sel).boundingBox(), page.locator(container).boundingBox()]);
      return a!.x >= b!.x - 0.5 && a!.x + a!.width <= b!.x + b!.width + 0.5;
    };

    expect(await noHorizontalScroll()).toBe(true);
    expect(await inside('[data-testid="nav"]', '[data-testid="phone"]')).toBe(true);

    await app.startWithSim();
    await app.setClock('12:34');
    await expect(app.$('zone')).toBeVisible();
    expect(await noHorizontalScroll()).toBe(true);
    expect(await inside('[data-testid="nav"]', '[data-testid="phone"]')).toBe(true);
    // a linha de cima do painel (bike, tempo, zona) cabe no cartão
    expect(await inside('[data-testid="panel-status"]', '#bikepanel')).toBe(true);
    expect(await inside('#classTime', '#bikepanel')).toBe(true);
    // velocímetro não invade o giro
    const [gauge, rpm] = await Promise.all([page.getByTestId('gauge').boundingBox(), page.getByTestId('rpm-box').boundingBox()]);
    expect(gauge!.x + gauge!.width).toBeLessThanOrEqual(rpm!.x + 1);
  });
}
