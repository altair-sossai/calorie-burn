import type { KeiserReading } from '../ble/keiser';
import { SIM_ID, simStep, type SimState } from '../ble/simulator';
import { classMin } from '../domain/classTime';
import { forecastPhase, forecastView, type ForecastView } from '../domain/forecast';
import { guardKcal } from '../domain/inputs';
import * as session from '../domain/session';
import type { Session } from '../domain/session';
import type { ClassPlan } from '../domain/types';
import * as storage from './storage';
import type { Config, KV } from './storage';

export type View = 'setup' | 'bikes' | 'live';
export type Field = 'startKcal' | 'goal' | 'total' | 'interval' | 'ftp';
export type Notice = { kind: 'noBle' } | { kind: 'bleError'; name: string; message: string; hasBle: boolean };

/** Sem anúncio da bike há mais que isso: considera sem sinal (dispara a retomada automática da escuta). */
export const STALE_MS = 4000;
/** No painel, uma falha curta de leitura não apaga nada: segura os últimos valores até isso sem sinal. */
export const HOLD_MS = 20000;
/** A previsão de kcal no rodapé só é recalculada a cada tanto (mudando todo segundo ela distrai mais do que ajuda). */
export const FORECAST_REFRESH_MS = 15000;
/** Por quanto tempo depois do fim previsto a aula ainda é restaurada num refresh. */
export const CLASS_GRACE_MIN = 60;

export interface LiveReading {
  kcal: number;
  watts: number;
  rpm: number;
  gear: number;
  dist: number;
  distUnit: 'km' | 'mi';
  hr: number;
  min: number;
  sec: number;
  lastSeen: number;
}
const emptyReading = (): LiveReading => ({ kcal: 0, watts: 0, rpm: 0, gear: 0, dist: 0, distUnit: 'km', hr: 0, min: 0, sec: 0, lastSeen: 0 });

export const DEFAULT_CONFIG: Config = { goal: 700, total: 45, interval: 8, startKcal: 0, ftp: 150, chosen: null };

export interface StoreDeps {
  storage: KV;
  now: () => number;
  /** há escuta Bluetooth ativa (pra etiqueta de conexão) */
  isListening?: () => boolean;
}

export const isSim = (id: number | null) => id === SIM_ID;
export const bikeName = (id: number) => (isSim(id) ? 'Bike simulada' : 'Bike ' + id);

/**
 * Estado do app e todas as ações. Não conhece a tela nem o Bluetooth: a tela lê daqui e se inscreve em `subscribe`,
 * e o runtime liga o Bluetooth, o relógio de 1 s e os eventos da página.
 */
export class AppStore {
  view: View = 'setup';
  cfg: Config = { ...DEFAULT_CONFIG };
  /** texto dos campos da tela Configurar (o que foi digitado, antes de virar número) */
  inputs: Record<Field, string> = inputsFrom(DEFAULT_CONFIG);
  bikes: number[] = [];
  live: LiveReading = emptyReading();
  /** bikes ouvidas no Bluetooth: id -> última leitura */
  detected = new Map<number, { reading: KeiserReading; lastSeen: number }>();
  session: Session | null = null;
  notice: Notice | null = null;

  /** kcal veio do localStorage (refresh) — a próxima leitura real substitui sem o filtro de glitch */
  private kcalRestored = false;
  private savedKcal: number | null = null;
  private sim: SimState | null = null;
  private forecastCache: { at: number; key: string; view: ForecastView } | null = null;
  private listeners = new Set<() => void>();

  constructor(private deps: StoreDeps) {}

  now(): number {
    return this.deps.now();
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  emit(): void {
    this.listeners.forEach((fn) => fn());
  }

  get plan(): ClassPlan {
    const { startKcal, goal, total, interval } = this.cfg;
    return { startKcal, goal, total, interval };
  }

  /* ---------- carga inicial ---------- */
  load(): void {
    this.cfg = { ...DEFAULT_CONFIG, ...storage.loadConfig(this.deps.storage) };
    this.inputs = inputsFrom(this.cfg);
    this.bikes = storage.loadBikes(this.deps.storage);
    const c = storage.loadClass(this.deps.storage);
    if (c && this.now() - c.startedAt <= (this.cfg.total + CLASS_GRACE_MIN) * 60000) {
      const { kcal, ...s } = c;
      this.session = s;
      this.live.kcal = kcal;
      this.savedKcal = kcal;
      this.kcalRestored = kcal > 0;
      const advanced = session.autoAdvance(this.session, this.live.kcal, this.plan, this.now());
      if (advanced !== this.session) {
        this.session = advanced;
        this.saveClass();
      }
      this.view = 'live';
    }
  }

  /* ---------- sinal da bike ---------- */
  /** leitura recente (STALE_MS): abaixo disso a escuta é retomada sozinha */
  hasBike(): boolean {
    return this.cfg.chosen != null && this.now() - this.live.lastSeen < STALE_MS;
  }
  /** o painel ainda mostra rpm/watts/%FTP (HOLD_MS) */
  showBike(): boolean {
    return this.cfg.chosen != null && this.now() - this.live.lastSeen < HOLD_MS;
  }
  needsReconnect(): boolean {
    return this.cfg.chosen != null && !isSim(this.cfg.chosen) && !this.hasBike();
  }
  classActive(): boolean {
    return !!this.session && this.now() - this.session.startedAt < (this.cfg.total + CLASS_GRACE_MIN) * 60000;
  }
  classMin(): number | null {
    return this.session ? classMin(this.session.clock, this.now()) : null;
  }
  /**
   * Previsão pro rodapé, recalculada no máximo a cada FORECAST_REFRESH_MS. Recalcula na hora quando muda algo que
   * muda o sentido dela: relógio acertado/desfeito, fase (sem relógio → antes dos 5 min → valendo → fim) ou o plano.
   * Depois do fim, acompanha a kcal ao vivo (é o total feito).
   */
  forecast(): ForecastView {
    const now = this.now();
    const t = this.classMin();
    const phase = forecastPhase(t, this.cfg.total);
    const clock = this.session?.clock;
    const key = [phase, clock?.at, clock?.min, this.cfg.startKcal, this.cfg.goal, this.cfg.total].join("|");
    const c = this.forecastCache;
    if (!c || c.key !== key || phase === "ended" || now - c.at >= FORECAST_REFRESH_MS) {
      this.forecastCache = { at: now, key, view: forecastView(t, this.live.kcal, this.cfg) };
    }
    return this.forecastCache!.view;
  }
  connStatus(): { on: boolean; text: string } {
    if (isSim(this.cfg.chosen)) return { on: true, text: 'simulando' };
    if (this.hasBike()) return { on: true, text: bikeName(this.cfg.chosen!) };
    if (this.deps.isListening?.()) return { on: true, text: 'ouvindo bikes' };
    return { on: false, text: 'desconectado' };
  }

  /* ---------- navegação (não reinicia nada) ---------- */
  nav(v: View): void {
    this.view = v === 'live' && !this.session ? 'setup' : v;
    this.emit();
  }

  /* ---------- configuração ---------- */
  setInput(field: Field, text: string): void {
    this.inputs = { ...this.inputs, [field]: text };
    this.cfg = { ...this.cfg, ...parseField(field, text) };
    this.saveCfg();
    this.emit();
  }
  /** FTP muda com frequência durante a aula: o botão do topo muda direto, em qualquer tela */
  setFtp(n: number): void {
    this.cfg = { ...this.cfg, ftp: n };
    this.inputs = { ...this.inputs, ftp: String(n) };
    this.saveCfg();
    this.emit();
  }
  private saveCfg(): void {
    storage.saveConfig(this.deps.storage, this.cfg);
  }

  /* ---------- cadastro de bikes (só via Bluetooth; excluir é a única edição) ---------- */
  selectBike(id: number): void {
    // trocou de bike: zera a leitura, senão o filtro de glitch descartaria a kcal menor da bike nova
    if (id !== this.cfg.chosen) {
      this.live = emptyReading();
      this.kcalRestored = false;
    }
    this.cfg = { ...this.cfg, chosen: id };
    this.saveCfg();
    if (isSim(id)) this.sim = null;
    this.emit();
  }
  addBike(id: number): void {
    if (!this.bikes.includes(id)) {
      this.bikes = [...this.bikes, id];
      storage.saveBikes(this.deps.storage, this.bikes);
    }
    this.emit();
  }
  deleteBike(id: number): void {
    this.bikes = this.bikes.filter((b) => b !== id);
    storage.saveBikes(this.deps.storage, this.bikes);
    if (this.cfg.chosen === id) {
      this.cfg = { ...this.cfg, chosen: null };
      this.saveCfg();
    }
    this.emit();
  }
  /** bikes detectadas que ainda não estão no cadastro */
  detectedNew(): { id: number; rpm: number }[] {
    return [...this.detected.entries()]
      .filter(([id]) => !isSim(id) && !this.bikes.includes(id))
      .sort((a, b) => a[0] - b[0])
      .map(([id, d]) => ({ id, rpm: d.reading.rpm }));
  }

  /* ---------- leituras ---------- */
  ingest(data: KeiserReading): void {
    if (!data || !data.realtime) return;
    const now = this.now();
    const prev = this.detected.get(data.id);
    this.detected.set(data.id, { reading: { ...data, kcal: guardKcal(prev ? prev.reading.kcal : null, data.kcal) }, lastSeen: now });
    if (this.cfg.chosen === data.id) {
      let kcal: number;
      if (this.kcalRestored) {
        kcal = data.kcal > 0 ? data.kcal : this.live.kcal;
        if (data.kcal > 0) this.kcalRestored = false;
      } else kcal = guardKcal(this.live.kcal > 0 ? this.live.kcal : null, data.kcal);
      const { watts, rpm, gear, dist, distUnit, hr, min, sec } = data;
      this.live = { kcal, watts, rpm, gear, dist, distUnit, hr, min, sec, lastSeen: now };
    }
    // no painel quem redesenha é o relógio de 1 s; na aba Bikes a lista de detectadas acompanha na hora
    if (this.view === 'bikes') this.emit();
  }

  /* ---------- Bluetooth: avisos ---------- */
  clearNotice(): void {
    this.notice = null;
    this.emit();
  }
  showNoBle(): void {
    this.notice = { kind: 'noBle' };
    this.emit();
  }
  bleError(e: unknown, hasBle: boolean): void {
    const err = e as { name?: string; message?: string } | null;
    this.notice = { kind: 'bleError', name: err?.name || 'Erro', message: err?.message || String(e || 'Erro desconhecido'), hasBle };
    this.view = 'bikes'; // o aviso fica na aba Bikes (ex. erro ao tocar em "Reconectar" no painel)
    this.emit();
  }

  /* ---------- aula ---------- */
  startClass(): void {
    const c = { ...this.cfg };
    for (const f of ['startKcal', 'goal', 'total', 'interval', 'ftp'] as Field[]) Object.assign(c, parseField(f, this.inputs[f]));
    this.cfg = c;
    this.saveCfg();
    if (isSim(c.chosen)) {
      this.sim = null;
      this.live.kcal = c.startKcal;
    } else if (!this.hasBike()) this.live.kcal = c.startKcal;
    this.session = session.newSession(this.plan, this.now());
    this.saveClass();
    this.view = 'live';
    this.emit();
  }
  confirmInterval(i: number): void {
    this.updateSession((s) => session.confirm(s, i, this.live.kcal, this.plan, this.now()));
  }
  unconfirmInterval(i: number): void {
    this.updateSession((s) => session.unconfirm(s, i));
  }
  syncClock(min: number): void {
    this.updateSession((s) => session.syncClock(s, min, this.live.kcal, this.plan, this.now()));
  }
  private updateSession(fn: (s: Session) => Session): void {
    if (!this.session) return;
    const next = fn(this.session);
    if (next === this.session) return;
    this.session = next;
    this.saveClass();
    this.emit();
  }
  /** aula em andamento: sobrevive a refresh/fechar a aba (marcos, histórico pra desfazer, relógio e última kcal) */
  saveClass(): void {
    if (!this.session) return;
    this.savedKcal = this.live.kcal;
    storage.saveClass(this.deps.storage, { ...this.session, kcal: this.live.kcal });
  }

  /* ---------- relógio de 1 s ---------- */
  tick(): void {
    if (isSim(this.cfg.chosen)) {
      const step = simStep(this.sim, this.now(), this.live.kcal || this.cfg.startKcal || 0);
      this.sim = step.state;
      this.ingest(step.reading);
    }
    if (this.session) {
      const next = session.autoAdvance(this.session, this.live.kcal, this.plan, this.now());
      if (next !== this.session) {
        this.session = next;
        this.saveClass();
      }
      if (this.live.kcal !== this.savedKcal) this.saveClass();
    }
    this.emit();
  }
}

function inputsFrom(c: Config): Record<Field, string> {
  return { startKcal: String(c.startKcal), goal: String(c.goal), total: String(c.total), interval: String(c.interval), ftp: String(c.ftp) };
}

/** Texto do campo -> número, com os mesmos limites de sempre (aula e intervalo ≥ 1; kcal inicial e FTP ≥ 0). */
function parseField(field: Field, text: string): Partial<Config> {
  const n = +text || 0;
  switch (field) {
    case 'goal': return { goal: n };
    case 'total': return { total: Math.max(1, +text || 1) };
    case 'interval': return { interval: Math.max(1, +text || 1) };
    case 'startKcal': return { startKcal: Math.max(0, n) };
    case 'ftp': return { ftp: Math.max(0, n) };
  }
}
