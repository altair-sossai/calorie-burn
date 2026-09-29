import type { ClassPlan } from './types';

/**
 * Previsão de kcal no fim da aula: ritmo médio desde a kcal inicial (minuto 0) até agora, projetado pro tempo que falta.
 * Média da aula inteira (não da janela recente) porque a aula alterna zonas de propósito — uma janela curta oscilaria demais.
 * `t` é o minuto da aula pelo relógio de referência (null = relógio não acertado).
 */
export function forecastKcal(t: number | null, cur: number, plan: Pick<ClassPlan, 'startKcal' | 'total'>): number | null {
  if (t == null || t <= 0) return null;
  if (t >= plan.total) return cur;
  const rate = Math.max(0, cur - plan.startKcal) / t;
  return cur + rate * (plan.total - t);
}

/** Antes disso o ritmo médio ainda oscila demais (aquecimento, primeiros sprints): sem previsão. */
export const FORECAST_MIN_MINUTES = 5;

/** Fase da previsão: sem relógio, aquecendo (< 5 min), valendo, ou aula encerrada. */
export type ForecastPhase = 'noClock' | 'warmup' | 'active' | 'ended';

export function forecastPhase(t: number | null, total: number): ForecastPhase {
  if (t == null) return 'noClock';
  if (t >= total) return 'ended';
  return t < FORECAST_MIN_MINUTES ? 'warmup' : 'active';
}

export interface ForecastView {
  phase: ForecastPhase;
  label: string;
  /** kcal prevista (arredondada) ou null (sem relógio / antes dos 5 min) */
  kcal: number | null;
  /** diferença pra meta, já com os dois lados arredondados */
  diff: number | null;
}

const LABELS: Record<ForecastPhase, string> = {
  noClock: 'previsão: acerte o relógio',
  warmup: `previsão a partir dos ${FORECAST_MIN_MINUTES} min`,
  active: 'previsão no fim da aula',
  ended: 'total da aula',
};

export function forecastView(t: number | null, cur: number, plan: Pick<ClassPlan, 'startKcal' | 'total' | 'goal'>): ForecastView {
  const phase = forecastPhase(t, plan.total);
  const label = LABELS[phase];
  const f = phase === 'active' || phase === 'ended' ? forecastKcal(t, cur, plan) : null;
  if (f == null) return { phase, label, kcal: null, diff: null };
  const kcal = Math.round(f);
  return { phase, label, kcal, diff: kcal - Math.round(plan.goal) };
}
