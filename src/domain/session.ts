import { classMin } from './classTime';
import { buildIntervals, recalcFuture } from './intervals';
import type { ClassPlan, Clock, Interval } from './types';

/**
 * Aula em andamento. `confirmedIdx` = quantos marcos já foram confirmados, em sequência (0..intervals.length):
 * só dá pra confirmar o próximo (intervals[confirmedIdx]) ou desfazer o último confirmado.
 * `history` guarda as metas de antes de cada confirmação, pra desfazer.
 * `clock` é o relógio de referência: acertado por um toque manual num marco ou pelo botão de relógio.
 */
export interface Session {
  startedAt: number;
  intervals: Interval[];
  confirmedIdx: number;
  history: Interval[][];
  clock: Clock | null;
}

export function newSession(plan: ClassPlan, now: number): Session {
  return { startedAt: now, intervals: buildIntervals(plan), confirmedIdx: 0, history: [], clock: null };
}

/**
 * Confirma o marco `i` (só o próximo da fila) com a kcal real de agora e recalcula os seguintes.
 * Um toque manual (`auto` = false) também acerta o relógio: agora é o fim deste marco.
 */
export function confirm(s: Session, i: number, kcal: number, plan: ClassPlan, now: number, auto = false): Session {
  if (i !== s.confirmedIdx) return s;
  return {
    ...s,
    history: [...s.history, s.intervals],
    intervals: recalcFuture(s.intervals, i, kcal, plan),
    confirmedIdx: i + 1,
    clock: auto ? s.clock : { at: now, min: s.intervals[i].end },
  };
}

/** Desfaz o último marco confirmado, voltando as metas ao que eram antes dele (mantém o relógio). */
export function popConfirmed(s: Session): Session {
  if (s.confirmedIdx <= 0) return s;
  const history = s.history.slice(0, -1);
  const snap = s.history[s.history.length - 1];
  return { ...s, history, intervals: snap ?? s.intervals, confirmedIdx: s.confirmedIdx - 1 };
}

/** Toque no último marco confirmado: desfaz e para o relógio (sem risco nem avanço automático até o próximo toque). */
export function unconfirm(s: Session, i: number): Session {
  if (i !== s.confirmedIdx - 1) return s;
  return { ...popConfirmed(s), clock: null };
}

/** Quando o relógio passa do fim do marco atual, conclui sozinho (sem mexer no relógio) e recalcula os próximos. */
export function autoAdvance(s: Session, kcal: number, plan: ClassPlan, now: number): Session {
  const t = classMin(s.clock, now);
  let next = s;
  while (t != null && next.confirmedIdx < next.intervals.length && t >= next.intervals[next.confirmedIdx].end) {
    next = confirm(next, next.confirmedIdx, kcal, plan, now, true);
  }
  return next;
}

/**
 * Acerta o relógio pelo tempo da aula digitado (`min`): marcos confirmados que terminam depois desse tempo são
 * desmarcados (do último pro primeiro) e os que já passaram são concluídos sozinhos, como no avanço normal.
 */
export function syncClock(s: Session, min: number, kcal: number, plan: ClassPlan, now: number): Session {
  let next = s;
  while (next.confirmedIdx > 0 && next.intervals[next.confirmedIdx - 1].end > min) next = popConfirmed(next);
  return autoAdvance({ ...next, clock: { at: now, min } }, kcal, plan, now);
}
