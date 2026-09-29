import type { Clock } from './types';

/** Minuto da aula pelo relógio de referência (null enquanto ele não foi acertado). */
export function classMin(clock: Clock | null, now: number): number | null {
  return clock ? clock.min + (now - clock.at) / 60000 : null;
}

/**
 * Tempo da aula digitado -> minuto da aula (null se inválido). Aceita "02:45", "2:45", "02 45", "2 45",
 * "0245" (MMSS) e "245" (MSS): só dígitos com 3+ casas = os 2 últimos são os segundos; com 1–2 casas = só minutos ("3").
 */
export function parseClassTime(value: string): number | null {
  const s = String(value).trim();
  let min: number;
  let sec: number;
  const m = s.match(/^(\d{1,3})\s*[:.,h ]\s*(\d{1,2})$/);
  if (m) {
    min = +m[1];
    sec = +m[2];
  } else if (/^\d{1,5}$/.test(s)) {
    if (s.length >= 3) {
      min = +s.slice(0, -2);
      sec = +s.slice(-2);
    } else {
      min = +s;
      sec = 0;
    }
  } else return null;
  if (sec >= 60) return null;
  return min + sec / 60;
}

/** Minuto da aula -> "MM:SS". */
export function fmtClassTime(min: number): string {
  const s = Math.max(0, Math.floor(min * 60 + 1e-6)); // folga pro ponto flutuante: 2+3/60 vira 122,99999 s
  return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
}
