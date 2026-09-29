import { describe, expect, it } from 'vitest';
import { autoAdvance, confirm, newSession, popConfirmed, syncClock, unconfirm, type Session } from './session';

const plan = { startKcal: 0, goal: 700, total: 45, interval: 8 };
const T0 = 1_000_000;
const MIN = 60_000;
const goals = (s: Session) => s.intervals.map((i) => Math.round(i.goal));
const ORIGINAL = [124, 249, 373, 498, 622, 700];

describe('confirmar e desfazer', () => {
  it('toque confirma o próximo, recalcula e acerta o relógio no fim do marco', () => {
    const s = confirm(newSession(plan, T0), 0, 150, plan, T0 + 5);
    expect(s.confirmedIdx).toBe(1);
    expect(s.clock).toEqual({ at: T0 + 5, min: 8 });
    // faltam 550 kcal em 37 min, a partir de 150
    expect(goals(s)).toEqual([124, 269, 388, 507, 626, 700]);
    expect(s.history).toHaveLength(1);
  });

  it('só confirma o próximo da fila', () => {
    const s = newSession(plan, T0);
    expect(confirm(s, 2, 100, plan, T0)).toBe(s);
  });

  it('desfazer só o último, voltando as metas e parando o relógio', () => {
    const s1 = confirm(newSession(plan, T0), 0, 150, plan, T0);
    const s2 = confirm(s1, 1, 300, plan, T0);
    expect(unconfirm(s2, 0)).toBe(s2);
    const back = unconfirm(s2, 1);
    expect(back.confirmedIdx).toBe(1);
    expect(goals(back)).toEqual(goals(s1));
    expect(back.clock).toBeNull();
  });

  it('popConfirmed mantém o relógio e não passa de zero', () => {
    const s1 = confirm(newSession(plan, T0), 0, 150, plan, T0);
    expect(popConfirmed(s1).clock).toEqual(s1.clock);
    const s0 = newSession(plan, T0);
    expect(popConfirmed(s0)).toBe(s0);
  });
});

describe('autoAdvance', () => {
  it('sem relógio não faz nada', () => {
    const s = newSession(plan, T0);
    expect(autoAdvance(s, 100, plan, T0 + 60 * MIN)).toBe(s);
  });

  it('conclui sozinho quando o relógio passa do fim, sem mexer no relógio', () => {
    const s = { ...newSession(plan, T0), clock: { at: T0, min: 7.9 } };
    expect(autoAdvance(s, 100, plan, T0 + 5000)).toBe(s);
    const next = autoAdvance(s, 100, plan, T0 + 10_000);
    expect(next.confirmedIdx).toBe(1);
    expect(next.clock).toBe(s.clock);
  });

  it('conclui vários de uma vez e para no último', () => {
    const s = { ...newSession(plan, T0), clock: { at: T0, min: 50 } };
    expect(autoAdvance(s, 100, plan, T0).confirmedIdx).toBe(6);
  });
});

describe('syncClock', () => {
  const at = (s: Session) => s.intervals.map((_, i) => (i < s.confirmedIdx ? 'done' : i === s.confirmedIdx ? 'now' : '-')).join(',');

  it('acerta o relógio e conclui os marcos que já passaram', () => {
    const s = syncClock(newSession(plan, T0), 20, 36, plan, T0);
    expect(at(s)).toBe('done,done,now,-,-,-');
    expect(s.clock).toEqual({ at: T0, min: 20 });
  });

  it('tempo menor desmarca os que terminam depois e volta as metas', () => {
    const s = syncClock(newSession(plan, T0), 20, 36, plan, T0);
    expect(at(syncClock(s, 10, 36, plan, T0))).toBe('done,now,-,-,-,-');
    const back = syncClock(s, 5, 36, plan, T0);
    expect(at(back)).toBe('now,-,-,-,-,-');
    expect(goals(back)).toEqual(ORIGINAL);
    expect(back.history).toEqual([]);
  });

  it('tempo exato no fim mantém concluído; um segundo antes desmarca', () => {
    const s = syncClock(newSession(plan, T0), 20, 36, plan, T0);
    expect(at(syncClock(s, 16, 36, plan, T0))).toBe('done,done,now,-,-,-');
    expect(at(syncClock(s, 15 + 59 / 60, 36, plan, T0))).toBe('done,now,-,-,-,-');
  });
});
