/** Parâmetros da aula que definem as metas. */
export interface ClassPlan {
  /** kcal no mostrador da bike no começo da aula */
  startKcal: number;
  /** meta de kcal no fim da aula */
  goal: number;
  /** duração da aula, em minutos */
  total: number;
  /** tamanho de cada bloco, em minutos */
  interval: number;
}

/** Um marco da aula: o bloco vai de `start` a `end` (minutos) e leva a kcal de `baseline` a `goal`. */
export interface Interval {
  start: number;
  end: number;
  baseline: number;
  goal: number;
}

/** Relógio de referência: em `at` (Date.now) a aula estava no minuto `min`. */
export interface Clock {
  at: number;
  min: number;
}
