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

export interface ForecastView {
  label: string;
  /** kcal prevista (arredondada) ou null sem relógio */
  kcal: number | null;
  /** diferença pra meta, já com os dois lados arredondados */
  diff: number | null;
}

export function forecastView(t: number | null, cur: number, plan: Pick<ClassPlan, 'startKcal' | 'total' | 'goal'>): ForecastView {
  const f = forecastKcal(t, cur, plan);
  const ended = t != null && t >= plan.total;
  const label = ended ? 'total da aula' : f == null ? 'previsão: acerte o relógio' : 'previsão no fim da aula';
  if (f == null) return { label, kcal: null, diff: null };
  const kcal = Math.round(f);
  return { label, kcal, diff: kcal - Math.round(plan.goal) };
}
