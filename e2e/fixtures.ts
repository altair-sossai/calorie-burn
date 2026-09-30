import { test as base, expect, type Page } from '@playwright/test';
import { fmtClassTime, parseClassTime } from '../src/domain/classTime';

export type BleMode = 'device' | 'none' | 'error';

/**
 * Roda no navegador antes do app: relógio controlável (Date.now + __skew) e um Web Bluetooth falso que entrega
 * pacotes Keiser de verdade (17 bytes). O estado que precisa sobreviver a um refresh (skew e bike autorizada) fica
 * no sessionStorage.
 */
function installStubs(mode: BleMode) {
  const w = window as unknown as Record<string, unknown> & { __advert: (o: Record<string, unknown>) => void };
  const ss = window.sessionStorage;
  const realNow = Date.now.bind(Date);
  Date.now = () => realNow() + (Number(ss.getItem('__skew')) || 0);
  w.__watchCalls = 0;
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
    await expect(this.page.getByTestId('phone')).toBeVisible();
  }
  async reload() {
    await this.page.reload();
    await expect(this.page.getByTestId('phone')).toBeVisible();
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
  async watchCalls(): Promise<number> {
    return this.page.evaluate(() => (window as unknown as { __watchCalls: number }).__watchCalls);
  }
  /** com o relógio aberto: toca no tempo, digita e confirma (Enter) */
  async typeRemaining(text: string) {
    await this.$('clockTime').click();
    await this.$('clockInput').fill(text);
    await this.$('clockInput').press('Enter');
  }
  /**
   * Acerta o relógio pelo tempo já passado da aula (qualquer formato do parseClassTime): abre o relógio no topo, toca no
   * tempo e digita o que falta (aula de `total` min); depois OK, ou play se o relógio estava parado.
   */
  async setClock(elapsed: string, total = 45) {
    await this.$('navClock').click();
    await this.typeRemaining(fmtClassTime(total - parseClassTime(elapsed)!));
    await expect(this.$('clockInput')).toHaveCount(0);
    if (await this.$('clockPlay').count()) await this.$('clockPlay').click();
    else await this.$('clockOk').click();
    await expect(this.$('clockModal')).toHaveCount(0);
  }
  cards() {
    return this.page.locator('#intervals').getByTestId('interval');
  }
  card(num: number | string) {
    return this.cards().filter({ has: this.page.getByTestId('interval-num').filter({ hasText: new RegExp(`^${num}`) }) });
  }
  async states(): Promise<string> {
    return (await this.cards().evaluateAll((els) => els.map((e) => { const st = e.getAttribute('data-state'); return st === 'locked' ? '-' : st; }))).join(',');
  }
  async tickLeft(num: number): Promise<number | null> {
    const t = this.card(num).getByTestId('interval-tick');
    return (await t.count()) ? parseFloat((await t.getAttribute('style'))!.replace(/[^\d.]/g, '')) : null;
  }
  /** cadastra a Bike 7 pelo Bluetooth falso (na tela Configurar) e seleciona */
  async pairBike7() {
    await this.$('scan').click();
    await this.advert({ id: 7 });
    await this.page.locator('#detectedList [data-act="add"]').click();
    await this.page.locator('#bikeList').getByTestId('bike-select').filter({ hasText: 'Bike 7' }).click();
  }
  /** "Iniciar aula" e play no relógio (parado no tempo total) */
  async start() {
    await this.$('startBtn').click();
    await this.$('clockPlay').click();
    await expect(this.$('live')).toBeVisible();
  }
  async startWithSim() {
    await this.page.locator('#bikeList').getByTestId('bike-select').filter({ hasText: 'Bike simulada' }).click();
    await this.start();
  }
}

export const test = base.extend<{ ble: BleMode; app: AppDriver }>({
  ble: ['device', { option: true }],
  app: async ({ page, ble }, use) => {
    const errors: string[] = [];
    const dialogs: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    // o app não usa prompt/alert/confirm (tudo é modal próprio): qualquer caixa nativa é bug
    page.on('dialog', (d) => { dialogs.push(`${d.type()}: ${d.message()}`); void d.dismiss(); });
    await page.addInitScript(installStubs, ble);
    await use(new AppDriver(page));
    expect(errors, 'erros de JavaScript na página').toEqual([]);
    expect(dialogs, 'caixas nativas (prompt/alert/confirm)').toEqual([]);
  },
});

export { expect };
