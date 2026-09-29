import { test as base, expect, type Page } from '@playwright/test';

export type BleMode = 'device' | 'none' | 'error';

/**
 * Roda no navegador antes do app: relógio controlável (Date.now + __skew), prompt/alert automáticos e um
 * Web Bluetooth falso que entrega pacotes Keiser de verdade (17 bytes). O estado que precisa sobreviver a um
 * refresh (skew e bike autorizada) fica no sessionStorage.
 */
function installStubs(mode: BleMode) {
  const w = window as unknown as Record<string, unknown> & { __advert: (o: Record<string, unknown>) => void };
  const ss = window.sessionStorage;
  const realNow = Date.now.bind(Date);
  Date.now = () => realNow() + (Number(ss.getItem('__skew')) || 0);
  w.__prompts = [];
  w.__alerts = [];
  w.__promptAnswer = null;
  w.__watchCalls = 0;
  window.prompt = (m?: string, d?: string) => { (w.__prompts as unknown[]).push([m, d]); return w.__promptAnswer as string | null; };
  window.alert = (m?: string) => { (w.__alerts as unknown[]).push(m); };
  if (mode === 'none') {
    Object.defineProperty(navigator, 'bluetooth', { value: undefined, configurable: true });
    return;
  }
  const listeners = new Set<(ev: unknown) => void>();
  const device = {
    id: 'dev1',
    addEventListener: (_: string, fn: (ev: unknown) => void) => listeners.add(fn),
    removeEventListener: (_: string, fn: (ev: unknown) => void) => listeners.delete(fn),
    watchAdvertisements: () => { (w.__watchCalls as number)++; return Promise.resolve(); },
    unwatchAdvertisements: () => {},
  };
  const bt = {
    getDevices: () => Promise.resolve(ss.getItem('__authorized') ? [device] : []),
    requestDevice: () => {
      if (mode === 'error') return Promise.reject(Object.assign(new Error('Falha simulada'), { name: 'NetworkError' }));
      ss.setItem('__authorized', '1');
      return Promise.resolve(device);
    },
    addEventListener: () => {},
    removeEventListener: () => {},
  };
  Object.defineProperty(navigator, 'bluetooth', { value: bt, configurable: true });
  w.__advert = (o) => {
    const dv = new DataView(new ArrayBuffer(17));
    dv.setUint8(2, o.realtime === false ? 1 : 0);
    dv.setUint8(3, (o.id as number) ?? 7);
    dv.setUint16(4, Math.round(((o.rpm as number) ?? 80) * 10), true);
    dv.setUint16(6, 1300, true);
    dv.setUint16(8, (o.watts as number) ?? 150, true);
    dv.setUint16(10, (o.kcal as number) ?? 30, true);
    dv.setUint16(14, 0x8000 | 100, true);
    dv.setUint8(16, 12);
    const ev = { manufacturerData: new Map([[0x0102, dv]]) };
    listeners.forEach((fn) => fn(ev));
  };
}

export class AppDriver {
  constructor(readonly page: Page) {}
  $ = (id: string) => this.page.locator('#' + id);

  async open() {
    await this.page.goto('/');
    await expect(this.page.locator('.phone')).toBeVisible();
  }
  async reload() {
    await this.page.reload();
    await expect(this.page.locator('.phone')).toBeVisible();
  }
  /** avança o relógio do app (Date.now) */
  async advance(ms: number) {
    await this.page.evaluate((ms) => sessionStorage.setItem('__skew', String((Number(sessionStorage.getItem('__skew')) || 0) + ms)), ms);
  }
  /** espera o relógio de 1 s do app redesenhar */
  async tick() {
    await this.page.waitForTimeout(1150);
  }
  async advert(o: { id?: number; rpm?: number; watts?: number; kcal?: number; realtime?: boolean } = {}) {
    await this.page.evaluate((o) => (window as unknown as { __advert: (o: unknown) => void }).__advert(o), o);
  }
  async answerPrompt(answer: string | null) {
    await this.page.evaluate((a) => { (window as unknown as { __promptAnswer: unknown }).__promptAnswer = a; }, answer);
  }
  async prompts(): Promise<[string, string][]> {
    return this.page.evaluate(() => (window as unknown as { __prompts: [string, string][] }).__prompts);
  }
  async alerts(): Promise<string[]> {
    return this.page.evaluate(() => (window as unknown as { __alerts: string[] }).__alerts);
  }
  async watchCalls(): Promise<number> {
    return this.page.evaluate(() => (window as unknown as { __watchCalls: number }).__watchCalls);
  }
  /** digita no prompt do relógio */
  async setClock(v: string | null) {
    await this.answerPrompt(v);
    await this.$('navClock').click();
  }
  cards() {
    return this.page.locator('#intervals .ivl');
  }
  card(num: number | string) {
    return this.page.locator('#intervals .ivl').filter({ has: this.page.locator('.num', { hasText: new RegExp(`^${num}`) }) });
  }
  async states(): Promise<string> {
    return (await this.cards().evaluateAll((els) => els.map((e) => (e.classList.contains('done') ? 'done' : e.classList.contains('now') ? 'now' : '-')))).join(',');
  }
  async tickLeft(num: number): Promise<number | null> {
    const t = this.card(num).locator('.tick');
    return (await t.count()) ? parseFloat((await t.getAttribute('style'))!.replace(/[^\d.]/g, '')) : null;
  }
  /** cadastra a Bike 7 pelo Bluetooth falso e seleciona */
  async pairBike7() {
    await this.$('navBikes').click();
    await this.$('scan').click();
    await this.advert({ id: 7 });
    await this.page.locator('#detectedList [data-act="add"]').click();
    await this.page.locator('#bikeList .bik .l', { hasText: 'Bike 7' }).click();
  }
  async startWithSim() {
    await this.$('navBikes').click();
    await this.page.locator('#bikeList .bik .l', { hasText: 'Bike simulada' }).click();
    await this.$('startBtnBikes').click();
  }
}

export const test = base.extend<{ ble: BleMode; app: AppDriver }>({
  ble: ['device', { option: true }],
  app: async ({ page, ble }, use) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.addInitScript(installStubs, ble);
    await use(new AppDriver(page));
    expect(errors, 'erros de JavaScript na página').toEqual([]);
  },
});

export { expect };
