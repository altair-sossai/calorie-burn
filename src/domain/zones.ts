export type Zone = 1 | 2 | 3 | 4 | 5;

/** %FTP = watts agora / FTP, arredondado (a zona usa o valor arredondado, pra cor bater com o número). */
export function ftpPercent(watts: number, ftp: number): number | null {
  return ftp > 0 ? Math.round((watts / ftp) * 100) : null;
}

/** Zonas de %FTP: 1 até 55, 2 até 75, 3 até 89, 4 até 105, 5 acima. */
export function ftpZone(pct: number): Zone {
  return pct <= 55 ? 1 : pct <= 75 ? 2 : pct <= 89 ? 3 : pct <= 105 ? 4 : 5;
}

/**
 * Faixa de %FTP de cada zona no velocímetro. Cada zona ocupa a mesma fatia do arco, pra dar pra ver onde você está
 * dentro dela; os limites ficam no meio do inteiro pra agulha nunca cair na zona vizinha. A zona 5 vai até 150%.
 */
export const GAUGE_ZONES: ReadonlyArray<readonly [number, number]> = [
  [0, 55.5],
  [55.5, 75.5],
  [75.5, 89.5],
  [89.5, 105.5],
  [105.5, 150],
];
export const GAUGE_LABELS = [55, 75, 90, 105];

/** Posição da agulha (0..1 do arco): zonas inteiras já passadas + quanto andou dentro da zona atual. */
export function gaugeFrac(pct: number, zone: Zone): number {
  const [lo, hi] = GAUGE_ZONES[zone - 1];
  const inZone = Math.max(0, Math.min(1, (pct - lo) / (hi - lo)));
  return (zone - 1 + inZone) / GAUGE_ZONES.length;
}

/** Geometria do velocímetro (viewBox 200 de largura, centro em 100,100, arco de cima). */
export const GAUGE_CENTER = 100;
export const GAUGE_RADIUS = 82;

function point(frac: number, r: number): [string, string] {
  const a = Math.PI * (1 - frac);
  return [(GAUGE_CENTER + r * Math.cos(a)).toFixed(2), (GAUGE_CENTER - r * Math.sin(a)).toFixed(2)];
}

export interface GaugeGeometry {
  bands: { zone: Zone; d: string }[];
  labels: { x: string; y: string; text: string }[];
}

export function gaugeGeometry(): GaugeGeometry {
  const n = GAUGE_ZONES.length;
  const gap = 0.006;
  const r = GAUGE_RADIUS;
  const bands = GAUGE_ZONES.map((_, i) => {
    const p1 = point(i / n + gap, r);
    const p2 = point((i + 1) / n - gap, r);
    return { zone: (i + 1) as Zone, d: `M${p1} A${r} ${r} 0 0 1 ${p2}` };
  });
  const labels = GAUGE_LABELS.map((v, i) => {
    const [x, y] = point((i + 1) / n, r + 18);
    return { x, y, text: String(v) };
  });
  return { bands, labels };
}
