import { describe, expect, it } from 'vitest';
import { FORECAST_MIN_MINUTES, forecastKcal, forecastPhase, forecastView } from './forecast';

const plan = { startKcal: 0, goal: 700, total: 45 };

describe('forecastKcal', () => {
  it('projeta o ritmo médio da aula até o fim', () => {
    expect(forecastKcal(15, 250, plan)).toBeCloseTo(750); // 250 em 15 min → 16,7/min
    expect(forecastKcal(15, 250, { ...plan, startKcal: 100 })).toBeCloseTo(550); // 150 em 15 min → 10/min
  });

  it('sem relógio ou no minuto 0 não há previsão', () => {
    expect(forecastKcal(null, 100, plan)).toBeNull();
    expect(forecastKcal(0, 100, plan)).toBeNull();
  });

  it('depois do fim é o total feito', () => expect(forecastKcal(50, 720, plan)).toBe(720));
  it('kcal abaixo da inicial não dá ritmo negativo', () => expect(forecastKcal(10, 50, { ...plan, startKcal: 100 })).toBe(50));
});

describe('forecastView', () => {
  it('rótulos e diferença pra meta', () => {
    expect(forecastView(null, 0, plan)).toEqual({ phase: 'noClock', label: 'previsão: acerte o relógio', kcal: null, diff: null });
    expect(forecastView(15, 250, plan)).toEqual({ phase: 'active', label: 'previsão no fim da aula', kcal: 750, diff: 50 });
    expect(forecastView(15, 200, plan)).toEqual({ phase: 'active', label: 'previsão no fim da aula', kcal: 600, diff: -100 });
    expect(forecastView(46, 760, plan)).toEqual({ phase: 'ended', label: 'total da aula', kcal: 760, diff: 60 });
  });

  it('só prevê depois de 5 min de aula', () => {
    expect(FORECAST_MIN_MINUTES).toBe(5);
    expect(forecastView(4.99, 80, plan)).toEqual({ phase: 'warmup', label: 'previsão a partir dos 5 min', kcal: null, diff: null });
    expect(forecastView(5, 80, plan)).toMatchObject({ phase: 'active', kcal: 720, diff: 20 }); // 16 kcal/min
  });
});

describe('forecastPhase', () => {
  it('sem relógio → aquecendo → valendo → fim', () => {
    expect([null, 0, 4.9, 5, 44.9, 45, 50].map((t) => forecastPhase(t, 45))).toEqual(['noClock', 'warmup', 'warmup', 'active', 'active', 'ended', 'ended']);
  });
});
