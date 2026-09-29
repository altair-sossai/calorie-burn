import type { Session } from '../domain/session';
import type { Clock, Interval } from '../domain/types';

/** Chaves do localStorage — as mesmas da versão de arquivo único, então os dados salvos continuam valendo. */
export const KEYS = { cfg: 'ritmoQueimaCfg', bikes: 'ritmoQueimaBikes', cls: 'ritmoQueimaAula' } as const;

export type KV = Pick<Storage, 'getItem' | 'setItem'>;

export interface Config {
  goal: number;
  total: number;
  interval: number;
  startKcal: number;
  ftp: number;
  /** bike em uso: número da Keiser, SIM_ID pra simulada, null pra nenhuma */
  chosen: number | null;
}

export interface StoredClass extends Session {
  /** última kcal lida, pra mostrar algo antes da primeira leitura depois do refresh */
  kcal: number;
}

function read(kv: KV, key: string): unknown {
  try { return JSON.parse(kv.getItem(key) || 'null'); } catch { return null; }
}
function write(kv: KV, key: string, value: unknown): void {
  try { kv.setItem(key, JSON.stringify(value)); } catch { /* sem espaço / aba privada: segue sem salvar */ }
}
const num = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);

export function loadConfig(kv: KV): Partial<Config> {
  const c = read(kv, KEYS.cfg) as Record<string, unknown> | null;
  if (!c || typeof c !== 'object') return {};
  const out: Partial<Config> = {};
  for (const k of ['goal', 'total', 'interval', 'startKcal', 'ftp'] as const) {
    const v = num(c[k]);
    if (v != null) out[k] = v;
  }
  if (num(c.chosen) != null) out.chosen = c.chosen as number;
  return out;
}
export function saveConfig(kv: KV, cfg: Config): void {
  write(kv, KEYS.cfg, cfg);
}

/** Cadastro de bikes: [bikeId, ...]. Aceita também o formato antigo [{bikeId,name}]. */
export function loadBikes(kv: KV): number[] {
  const raw = read(kv, KEYS.bikes);
  if (!Array.isArray(raw)) return [];
  return raw
    .map((b) => (b && typeof b === 'object' ? (b as { bikeId?: unknown }).bikeId : b))
    .filter((id): id is number => typeof id === 'number' && Number.isFinite(id));
}
export function saveBikes(kv: KV, bikes: number[]): void {
  write(kv, KEYS.bikes, bikes);
}

const isInterval = (v: unknown): v is Interval => {
  const o = v as Interval;
  return !!o && [o.start, o.end, o.baseline, o.goal].every((n) => typeof n === 'number' && Number.isFinite(n));
};

/** Aula salva (valida a estrutura; quem chama decide se ainda está no prazo). */
export function loadClass(kv: KV): StoredClass | null {
  const c = read(kv, KEYS.cls) as Record<string, unknown> | null;
  if (!c || !num(c.startedAt) || !Array.isArray(c.intervals) || !c.intervals.length || !c.intervals.every(isInterval)) return null;
  const intervals = c.intervals as Interval[];
  const history = Array.isArray(c.history) ? (c.history as unknown[]).filter((h): h is Interval[] => Array.isArray(h) && h.every(isInterval)) : [];
  const ck = c.clock as Clock | null;
  return {
    startedAt: c.startedAt as number,
    intervals,
    confirmedIdx: Math.max(0, Math.min(intervals.length, (c.confirmedIdx as number) | 0)),
    history,
    clock: ck && num(ck.at) && num(ck.min) != null ? { at: ck.at, min: ck.min } : null,
    kcal: num(c.kcal) ?? 0,
  };
}
export function saveClass(kv: KV, c: StoredClass): void {
  write(kv, KEYS.cls, c);
}
