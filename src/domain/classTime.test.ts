import { describe, expect, it } from 'vitest';
import { classMin, fmtClassTime, parseClassTime } from './classTime';

const secs = (v: string) => {
  const m = parseClassTime(v);
  return m == null ? null : Math.round(m * 60);
};

describe('parseClassTime', () => {
  it.each([
    ['02:45', 165], ['2:45', 165], ['02 45', 165], ['2 45', 165], ['0245', 165], ['245', 165],
    [' 2 : 45 ', 165], ['2.45', 165], ['2,45', 165], ['12:30', 750], ['1230', 750],
    ['0:45', 45], ['045', 45], ['00:00', 0], ['2:05', 125], ['2:4', 124],
  ])('"%s" = %i s', (v, s) => expect(secs(v)).toBe(s));

  it.each([['3', 180], ['45', 2700], ['0', 0]])('só 1–2 dígitos = minutos: "%s" = %i s', (v, s) => expect(secs(v)).toBe(s));

  it.each(['2:75', '275', 'abc', '', '1:2:3', '-2:45', '2:', ':45', '123456'])('rejeita "%s"', (v) => expect(parseClassTime(v)).toBeNull());
});

describe('fmtClassTime', () => {
  it('formata MM:SS', () => {
    expect(fmtClassTime(2.75)).toBe('02:45');
    expect(fmtClassTime(0)).toBe('00:00');
    expect(fmtClassTime(-1)).toBe('00:00');
    expect(fmtClassTime(61.5)).toBe('61:30');
  });

  it('ida e volta sem perder segundo no ponto flutuante (2+3/60 = 122,999… s)', () => {
    for (let s = 0; s < 3600; s++) expect(secs(fmtClassTime(s / 60))).toBe(s);
  });
});

describe('classMin', () => {
  it('avança com o tempo a partir do acerto', () => {
    expect(classMin(null, 1000)).toBeNull();
    expect(classMin({ at: 0, min: 8 }, 90_000)).toBe(9.5);
  });
});
