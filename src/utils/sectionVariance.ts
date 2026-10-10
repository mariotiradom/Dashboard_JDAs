import type { SurveyRecord } from '../services/googleSheets';
import { mean } from './statistics';

// ── 4-tier score classification (shared) ─────────────────────────────────────
export interface Tier {
  label: string;
  color: string;
  bg: string;
}

export function getTier(score: number): Tier {
  if (score >= 4.5) return { label: 'Sobresaliente', color: 'var(--rea-turquesa)',        bg: 'rgba(61,209,178,0.12)' };
  if (score >= 4.0) return { label: 'Notable',       color: 'var(--primary)',              bg: 'rgba(32,78,207,0.10)' };
  if (score >= 3.5) return { label: 'Aceptable',     color: 'var(--rea-goldenrod)',        bg: 'rgba(234,152,54,0.12)' };
  return              { label: 'En Riesgo',           color: 'var(--rea-naranja-intenso)',  bg: 'rgba(242,103,73,0.12)' };
}

// ── Variance types ────────────────────────────────────────────────────────────
export interface SectionStat {
  /** Full section string, e.g. "A [26-2]" */
  section: string;
  /** Just the letter, e.g. "A" */
  sectionLabel: string;
  professor: string;
  promedioSeccion: number;
  /** promedioSeccion − promedioCurso */
  delta: number;
  coverage: number;
}

export interface CourseVariance {
  ciclo: string;
  promedioCurso: number;
  /** max(promedioSeccion) − min(promedioSeccion) */
  spread: number;
  isHighDispersion: boolean;
  /** Sorted by promedioSeccion descending */
  secciones: SectionStat[];
}

// ── Aggregation ───────────────────────────────────────────────────────────────
/**
 * Given all SurveyRecord rows for a single course, compute per-ciclo section
 * variance. Only valid sections (coverage >= 60%) are included.
 * Ciclos with fewer than 2 valid sections are skipped entirely.
 */
export function computeSectionVariance(records: SurveyRecord[]): CourseVariance[] {
  // Filter to valid sections only
  const valid = records.filter(r => r.isValid);

  // Group by ciclo
  const byCiclo = new Map<string, SurveyRecord[]>();
  valid.forEach(r => {
    if (!byCiclo.has(r.ciclo)) byCiclo.set(r.ciclo, []);
    byCiclo.get(r.ciclo)!.push(r);
  });

  const result: CourseVariance[] = [];

  for (const [ciclo, rows] of byCiclo.entries()) {
    if (rows.length <= 1) continue; // nothing to compare

    const scores = rows.map(r => r.puntajeProfesor);
    const promedioCurso = mean(scores);
    const spread = Math.max(...scores) - Math.min(...scores);

    const secciones: SectionStat[] = rows
      .map(r => ({
        section:        r.section,
        sectionLabel:   r.section.split(' ')[0], // "A [26-2]" → "A"
        professor:      r.professor,
        promedioSeccion: r.puntajeProfesor,
        delta:          r.puntajeProfesor - promedioCurso,
        coverage:       r.coverage,
      }))
      .sort((a, b) => b.promedioSeccion - a.promedioSeccion);

    result.push({ ciclo, promedioCurso, spread, isHighDispersion: spread >= 0.5, secciones });
  }

  // Newest ciclo first
  return result.sort((a, b) => b.ciclo.localeCompare(a.ciclo));
}

