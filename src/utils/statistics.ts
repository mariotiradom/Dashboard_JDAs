export function mean(data: number[]): number {
  if (data.length === 0) return 0;
  return data.reduce((a, b) => a + b, 0) / data.length;
}

export function detectOutliers(data: number[]): boolean[] {
  if (data.length === 0) return [];
  const m = mean(data);
  return data.map(val => Math.abs(val - m) > 1);
}
