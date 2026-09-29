import { describe, expect, it } from 'vitest';
import { guardKcal, parseFtpInput } from './inputs';

describe('guardKcal', () => {
  it('mantém a última kcal válida', () => {
    expect(guardKcal(null, 5)).toBe(5);
    expect(guardKcal(10, 0)).toBe(10);
    expect(guardKcal(10, 8)).toBe(10);
    expect(guardKcal(10, 12)).toBe(12);
  });
});

describe('parseFtpInput', () => {
  it.each([['200', 200], ['199,6', 200], ['180.4', 180], [' 150 ', 150], ['0', 0]])('"%s" → %i', (v, n) => expect(parseFtpInput(v)).toBe(n));
  it.each([null, '', '  ', 'abc', '-10'])('rejeita %s', (v) => expect(parseFtpInput(v)).toBeNull());
});
