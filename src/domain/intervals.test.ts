import { describe, expect, it } from 'vitest';
import { bonusLevel, buildIntervals, intervalDelta, kcalProgress, recalcFuture, targetAt, timeProgress } from './intervals';

const plan = { startKcal: 0, goal: 700, total: 45, interval: 8 };

describe('buildIntervals', () => {
  it('quebra a aula em blocos, com o último menor terminando no fim', () => {
    const ivs = buildIntervals(plan);
    expect(ivs.map((i) => i.end)).toEqual([8, 16, 24, 32, 40, 45]);
    expect(ivs.map((i) => Math.round(i.goal))).toEqual([124, 249, 373, 498, 622, 700]);
    expect(ivs.map(intervalDelta)).toEqual([124, 125, 124, 125, 124, 78]);
  });

  it('encadeia início/baseline de cada bloco no fim do anterior', () => {
    const ivs = buildIntervals(plan);
    ivs.slice(1).forEach((iv, i) => {
      expect(iv.start).toBe(ivs[i].end);
      expect(iv.baseline).toBe(ivs[i].goal);
    });
    expect(ivs[0]).toMatchObject({ start: 0, baseline: 0 });
  });

  it('parte da kcal inicial', () => {
    const ivs = buildIntervals({ ...plan, startKcal: 100 });
    expect(ivs[0].baseline).toBe(100);
    expect(ivs.at(-1)!.goal).toBe(700);
  });

  it('intervalo que divide a aula exatamente não cria bloco vazio', () => {
    expect(buildIntervals({ ...plan, total: 40 }).map((i) => i.end)).toEqual([8, 16, 24, 32, 40]);
  });

  it('intervalo maior que a aula vira um bloco só', () => {
    expect(buildIntervals({ ...plan, interval: 60 }).map((i) => i.end)).toEqual([45]);
  });
});

describe('targetAt', () => {
  it('é linear e preso entre início e fim', () => {
    expect(targetAt(0, plan)).toBe(0);
    expect(targetAt(22.5, plan)).toBe(350);
    expect(targetAt(90, plan)).toBe(700);
    expect(targetAt(-5, plan)).toBe(0);
  });
});

describe('recalcFuture', () => {
  it('adiantado: redistribui o que falta e os próximos blocos pedem menos', () => {
    const ivs = recalcFuture(buildIntervals(plan), 1, 300, plan); // no 16 fez 300 (a meta era 249)
    expect(Math.round(ivs[2].baseline)).toBe(300);
    // faltam 400 kcal em 29 min: metas 410, 521, 631, 700
    expect(ivs.slice(2).map((i) => Math.round(i.goal))).toEqual([410, 521, 631, 700]);
    expect(ivs.slice(2).map(intervalDelta)).toEqual([110, 111, 110, 69]);
    expect(ivs.at(-1)!.goal).toBe(700);
  });

  it('não altera os marcos até o confirmado nem o array original', () => {
    const base = buildIntervals(plan);
    const copy = structuredClone(base);
    const ivs = recalcFuture(base, 1, 300, plan);
    expect(ivs[0]).toBe(base[0]);
    expect(ivs[1]).toBe(base[1]);
    expect(base).toEqual(copy);
  });

  it('já passou da meta: os próximos ficam na kcal atual', () => {
    const ivs = recalcFuture(buildIntervals(plan), 2, 800, plan);
    expect(ivs.slice(3).map((i) => i.goal)).toEqual([800, 800, 800]);
  });
});

describe('progresso', () => {
  it('kcalProgress fica entre 0 e 1', () => {
    const iv = { baseline: 100, goal: 200 };
    expect(kcalProgress(50, iv)).toBe(0);
    expect(kcalProgress(150, iv)).toBe(0.5);
    expect(kcalProgress(300, iv)).toBe(1);
    expect(kcalProgress(100, { baseline: 100, goal: 100 })).toBe(1);
  });

  it('timeProgress dá a posição do risco no bloco', () => {
    const iv = { start: 8, end: 16, baseline: 0, goal: 0 };
    expect(timeProgress(12, iv)).toBe(0.5);
    expect(timeProgress(2, iv)).toBe(0);
    expect(timeProgress(20, iv)).toBe(1);
  });
});

describe('bonusLevel', () => {
  it('só aparece depois da meta, de 50 em 50', () => {
    expect(bonusLevel(699, 700)).toBeNull();
    expect(bonusLevel(700, 700)).toEqual({ baseline: 700, goal: 750 });
    expect(bonusLevel(749, 700)).toEqual({ baseline: 700, goal: 750 });
    expect(bonusLevel(760, 700)).toEqual({ baseline: 750, goal: 800 });
  });
});
