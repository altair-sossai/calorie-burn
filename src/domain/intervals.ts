import type { ClassPlan, Interval } from './types';

/** Meta cumulativa teórica no minuto `t`, numa linha reta da kcal inicial até a meta. */
export function targetAt(t: number, plan: ClassPlan): number {
  const frac = plan.total > 0 ? Math.max(0, Math.min(1, t / plan.total)) : 0;
  return plan.startKcal + (plan.goal - plan.startKcal) * frac;
}

/** Quebra a aula em blocos de `interval` minutos; o último termina no fim da aula (pode ser menor). */
export function buildIntervals(plan: ClassPlan): Interval[] {
  const ends: number[] = [];
  for (let t = plan.interval; t < plan.total; t += plan.interval) ends.push(t);
  if (!ends.length || ends[ends.length - 1] < plan.total) ends.push(plan.total);
  const intervals: Interval[] = [];
  let prevT = 0;
  let prevGoal = plan.startKcal;
  for (const t of ends) {
    const goal = targetAt(t, plan);
    intervals.push({ start: prevT, end: t, baseline: prevGoal, goal });
    prevT = t;
    prevGoal = goal;
  }
  return intervals;
}

/**
 * Ao confirmar o marco `fromIdx`, redistribui linearmente o que falta de meta pelo tempo que resta,
 * ancorado na kcal real (não na teórica): adiantado, os próximos blocos pedem menos; atrasado, pedem mais.
 * Se já passou da meta, os próximos ficam na kcal atual (nunca uma meta abaixo do que já foi feito).
 */
export function recalcFuture(intervals: Interval[], fromIdx: number, actualKcal: number, plan: ClassPlan): Interval[] {
  const fromT = intervals[fromIdx].end;
  const remainingT = Math.max(0.0001, plan.total - fromT);
  const remainingKcal = Math.max(0, plan.goal - actualKcal);
  let prevGoal = actualKcal;
  return intervals.map((iv, j) => {
    if (j <= fromIdx) return iv;
    const frac = Math.max(0, Math.min(1, (iv.end - fromT) / remainingT));
    const goal = actualKcal + remainingKcal * frac;
    const next = { ...iv, baseline: prevGoal, goal };
    prevGoal = goal;
    return next;
  });
}

/** Quanto falta fazer no bloco, pela diferença dos valores já arredondados (bate com as metas mostradas). */
export function intervalDelta(iv: Interval): number {
  return Math.max(0, Math.round(iv.goal) - Math.round(iv.baseline));
}

/** Fração (0..1) da kcal do bloco já feita. */
export function kcalProgress(cur: number, iv: Pick<Interval, 'baseline' | 'goal'>): number {
  const span = iv.goal - iv.baseline;
  const frac = span > 0.0001 ? (cur - iv.baseline) / span : cur >= iv.goal ? 1 : 0;
  return Math.max(0, Math.min(1, frac));
}

/** Fração (0..1) do tempo do bloco já passada no minuto `t` — posição do risco de referência. */
export function timeProgress(t: number, iv: Interval): number {
  return Math.max(0, Math.min(1, (t - iv.start) / Math.max(0.0001, iv.end - iv.start)));
}

export const BONUS_STEP = 50;

/** Além da meta: o próximo nível de 50 em 50 kcal, independente dos marcos. */
export function bonusLevel(cur: number, goal: number): { baseline: number; goal: number } | null {
  if (cur < goal) return null;
  const steps = Math.floor((cur - goal) / BONUS_STEP) + 1;
  const baseline = goal + (steps - 1) * BONUS_STEP;
  return { baseline, goal: baseline + BONUS_STEP };
}
