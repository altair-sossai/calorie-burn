import { describe, expect, it } from 'vitest';
import { forecastKcal, forecastView } from './forecast';

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
    expect(forecastView(null, 0, plan)).toEqual({ label: 'previsão: acerte o relógio', kcal: null, diff: null });
    expect(forecastView(15, 250, plan)).toEqual({ label: 'previsão no fim da aula', kcal: 750, diff: 50 });
    expect(forecastView(15, 200, plan)).toEqual({ label: 'previsão no fim da aula', kcal: 600, diff: -100 });
    expect(forecastView(46, 760, plan)).toEqual({ label: 'total da aula', kcal: 760, diff: 60 });
  });
});
