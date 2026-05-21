export function mean(data: number[]): number {
  if (data.length === 0) return 0;
  return data.reduce((a, b) => a + b, 0) / data.length;
}

export function median(data: number[]): number {
  if (data.length === 0) return 0;
  const sorted = [...data].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

export function stdDev(data: number[], meanVal?: number): number {
  if (data.length < 2) return 0;
  const m = meanVal !== undefined ? meanVal : mean(data);
  const variance = data.reduce((acc, val) => acc + Math.pow(val - m, 2), 0) / (data.length - 1);
  return Math.sqrt(variance);
}

export function coefficientOfVariation(data: number[]): number {
  const m = mean(data);
  if (m === 0) return 0; // Avoid division by zero
  return stdDev(data, m) / m;
}

export function isMeanRepresentative(data: number[]): boolean {
  // Un Coeficiente de Variación < 20-25% generalmente indica que el promedio es representativo
  return coefficientOfVariation(data) < 0.25;
}

export function detectOutliers(data: number[]): boolean[] {
  if (data.length < 3) return data.map(() => false);

  if (isMeanRepresentative(data)) {
    // Promedio es representativo: Usar Z-score (Desviación estándar)
    const m = mean(data);
    const sd = stdDev(data, m);
    // Si la desviación estándar es muy pequeña (todos los valores son casi iguales) no hay outliers
    if (sd < 0.05) return data.map(() => false);
    
    return data.map(val => Math.abs(val - m) > 1.5 * sd);
  } else {
    // Promedio muy disperso: Usar MAD (Desviación Absoluta de la Mediana)
    const med = median(data);
    const mad = median(data.map(val => Math.abs(val - med)));
    
    if (mad === 0) {
      // Si la MAD es 0, significa que más de la mitad de los valores son idénticos a la mediana.
      // Cualquier valor diferente a la mediana se podría considerar atípico
      return data.map(val => val !== med);
    }
    
    // Z-score modificado con MAD. El umbral típico es 2 o 2.5
    return data.map(val => (0.6745 * Math.abs(val - med)) / mad > 2);
  }
}
