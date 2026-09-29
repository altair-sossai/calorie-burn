import type { KeiserReading } from './keiser';

export const SIM_ID = -1;

export interface SimState {
  kcal: number;
  t: number;
  gear: number;
}

/** Um passo (1 s) da bike simulada: giro oscilando entre 64 e 84 rpm e kcal subindo devagar. */
export function simStep(state: SimState | null, now: number, fromKcal: number): { state: SimState; reading: KeiserReading } {
  const s = state ? { ...state } : { kcal: fromKcal, t: 0, gear: 14 };
  s.t += 1;
  const rpm = 74 + Math.sin(now / 3000) * 10;
  s.kcal += rpm * 2.3 * 0.00045 + 0.03;
  return {
    state: s,
    reading: {
      realtime: true,
      id: SIM_ID,
      rpm,
      hr: 132 + Math.sin(now / 5000) * 6,
      watts: Math.round(rpm * 2.3 + s.gear * 4),
      kcal: Math.round(s.kcal),
      min: Math.floor(s.t / 60),
      sec: Math.floor(s.t % 60),
      dist: (s.t / 3600) * 30,
      distUnit: 'km',
      gear: s.gear,
    },
  };
}
