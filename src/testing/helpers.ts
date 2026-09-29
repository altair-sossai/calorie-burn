import type { KV } from '../state/storage';

/** Monta o pacote de 17 bytes que a Keiser M3 transmite. */
export function keiserPacket(o: { id?: number; rpm?: number; hr?: number; watts?: number; kcal?: number; realtime?: boolean; min?: number; sec?: number; dist?: number; km?: boolean; gear?: number } = {}): DataView {
  const dv = new DataView(new ArrayBuffer(17));
  dv.setUint8(2, o.realtime === false ? 1 : 0);
  dv.setUint8(3, o.id ?? 7);
  dv.setUint16(4, Math.round((o.rpm ?? 80) * 10), true);
  dv.setUint16(6, Math.round((o.hr ?? 130) * 10), true);
  dv.setUint16(8, o.watts ?? 150, true);
  dv.setUint16(10, o.kcal ?? 30, true);
  dv.setUint8(12, o.min ?? 1);
  dv.setUint8(13, o.sec ?? 2);
  dv.setUint16(14, (o.km === false ? 0 : 0x8000) | Math.round((o.dist ?? 10) * 10), true);
  dv.setUint8(16, o.gear ?? 12);
  return dv;
}

/** localStorage em memória. */
export function memoryStorage(initial: Record<string, unknown> = {}): KV & { data: Map<string, string> } {
  const data = new Map(Object.entries(initial).map(([k, v]) => [k, JSON.stringify(v)]));
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, String(v)),
  };
}

/** Relógio controlável pros testes. */
export function fakeClock(start = 1_700_000_000_000) {
  let t = start;
  return { now: () => t, advance: (ms: number) => { t += ms; }, set: (ms: number) => { t = ms; } };
}
