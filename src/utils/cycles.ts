/**
 * Utilities for academic cycle comparison and retrospective chronological filtering.
 * Cycle format: "YY-T" (e.g., "25-1", "25-2", "26-1", "26-2").
 */

export function getCicloScore(ciclo: string): number {
  if (!ciclo) return 0;
  const match = ciclo.match(/(\d+)\s*[-_]\s*(\d+)/);
  if (match) {
    const year = parseInt(match[1], 10);
    const term = parseInt(match[2], 10);
    return year * 10 + term;
  }
  return 0;
}

/**
 * Checks if cicloA is chronologically before or equal to cicloRef.
 * If cicloRef is 'Histórico' or empty, all cycles are included.
 */
export function isCicloBeforeOrEqual(cicloA: string, cicloRef: string): boolean {
  if (!cicloRef || cicloRef === 'Histórico') return true;
  const scoreA = getCicloScore(cicloA);
  const scoreRef = getCicloScore(cicloRef);
  if (scoreA === 0 || scoreRef === 0) return true;
  return scoreA <= scoreRef;
}

