import { describe, expect, it } from 'vitest';
import { ftpPercent, ftpZone, gaugeFrac, gaugeGeometry } from './zones';

describe('ftpZone', () => {
  it.each([[0, 1], [55, 1], [56, 2], [75, 2], [76, 3], [89, 3], [90, 4], [105, 4], [106, 5], [300, 5]])('%i%% → zona %i', (p, z) =>
    expect(ftpZone(p)).toBe(z));
});

describe('ftpPercent', () => {
  it('arredonda e some sem FTP', () => {
    expect(ftpPercent(150, 150)).toBe(100);
    expect(ftpPercent(112, 150)).toBe(75);
    expect(ftpPercent(150, 0)).toBeNull();
  });
});

describe('gaugeFrac', () => {
  it('é monotônico e a agulha nunca sai da faixa da própria zona', () => {
    let prev = -1;
    for (let p = 0; p <= 250; p++) {
      const z = ftpZone(p);
      const f = gaugeFrac(p, z);
      expect(f).toBeGreaterThanOrEqual(prev);
      expect(f).toBeGreaterThanOrEqual((z - 1) / 5 - 1e-9);
      expect(f).toBeLessThanOrEqual(z / 5 + 1e-9);
      prev = f;
    }
  });

  it('extremos: 0% no começo, 150%+ preso no fim', () => {
    expect(gaugeFrac(0, 1)).toBe(0);
    expect(gaugeFrac(150, 5)).toBe(1);
    expect(gaugeFrac(400, 5)).toBe(1);
  });

  it('100% fica a 66% da zona 4', () => expect(+(gaugeFrac(100, 4) * 180).toFixed(1)).toBe(131.6));
});

describe('gaugeGeometry', () => {
  it('5 faixas e os 4 limites', () => {
    const g = gaugeGeometry();
    expect(g.bands.map((b) => b.zone)).toEqual([1, 2, 3, 4, 5]);
    expect(g.labels.map((l) => l.text)).toEqual(['55', '75', '90', '105']);
    expect(g.bands[0].d).toMatch(/^M[\d.]+,[\d.]+ A82 82 0 0 1 [\d.]+,[\d.]+$/);
  });
});
