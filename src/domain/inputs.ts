/** Mantém a última kcal válida: uma leitura zerada ou menor que a anterior é descartada (glitch de leitura). */
export function guardKcal(prevKcal: number | null, newKcal: number): number {
  if (prevKcal == null) return newKcal;
  if (newKcal === 0 || newKcal < prevKcal) return prevKcal;
  return newKcal;
}

/** FTP digitado no modal de FTP -> watts inteiros (aceita vírgula), ou null se vazio/inválido. */
export function parseFtpInput(value: string | null): number | null {
  if (value == null || String(value).trim() === '') return null;
  const n = Math.round(+String(value).replace(',', '.'));
  return Number.isFinite(n) && n >= 0 ? n : null;
}
