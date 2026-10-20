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
  professors?: string[];
  promedioSeccion: number;
  /** promedioSeccion − promedioCurso */
  delta: number;
  coverage: number;
  isValid: boolean;
}

export interface CourseVariance {
  ciclo: string;
  promedioCurso: number;
  /** max(promedioSeccion) − min(promedioSeccion) among valid sections */
  spread: number;
  isHighDispersion: boolean;
  hasValidSections: boolean;
  /** Sorted: valid sections first by promedioSeccion desc, then low coverage */
  secciones: SectionStat[];
}

// ── Aggregation ───────────────────────────────────────────────────────────────
/**
 * Given all SurveyRecord rows for a single course, compute per-ciclo section
 * variance. Consolidates multi-professor sections so each section appears exactly once.
 * Flags low coverage (< 55%) as isValid = false.
 */
export function computeSectionVariance(records: SurveyRecord[]): CourseVariance[] {
  if (!records || records.length === 0) return [];

  // Group by ciclo
  const byCiclo = new Map<string, SurveyRecord[]>();
  records.forEach(r => {
    if (!byCiclo.has(r.ciclo)) byCiclo.set(r.ciclo, []);
    byCiclo.get(r.ciclo)!.push(r);
  });

  const result: CourseVariance[] = [];

  for (const [ciclo, rows] of byCiclo.entries()) {
    // Group rows by unique section (e.g. "A [26-2]" -> "A")
    const sectionMap = new Map<string, SurveyRecord[]>();
    rows.forEach(r => {
      const cleanLabel = r.section.replace(/[[\]()]/g, '').trim().split(' ')[0] || r.section;
      if (!sectionMap.has(cleanLabel)) sectionMap.set(cleanLabel, []);
      sectionMap.get(cleanLabel)!.push(r);
    });

    // Consolidate into unique section entries
    const uniqueSections = Array.from(sectionMap.entries()).map(([cleanLabel, secRows]) => {
      const first = secRows[0];
      const allProfs = Array.from(new Set(secRows.map(r => r.professor)));
      const scores = secRows.map(r => r.puntajeProfesor);
      const promedio = Number(mean(scores).toFixed(2));
      const coverage = first.coverage;
      const isValid = first.isValid;

      return {
        section: first.section,
        sectionLabel: cleanLabel,
        professor: allProfs.join(', '),
        professors: allProfs,
        promedioSeccion: promedio,
        coverage,
        isValid
      };
    });

    const validSections = uniqueSections.filter(s => s.isValid);
    const validScores = validSections.map(s => s.promedioSeccion);
    const hasValidSections = validScores.length > 0;
    const promedioCurso = hasValidSections ? Number(mean(validScores).toFixed(2)) : 0;
    const spread = validScores.length > 1
      ? Number((Math.max(...validScores) - Math.min(...validScores)).toFixed(2))
      : 0;

    const secciones: SectionStat[] = uniqueSections
      .map(s => {
        const delta = (s.isValid && promedioCurso > 0)
          ? Number((s.promedioSeccion - promedioCurso).toFixed(2))
          : 0;

        return {
          ...s,
          delta,
        };
      })
      .sort((a, b) => {
        if (a.isValid && !b.isValid) return -1;
        if (!a.isValid && b.isValid) return 1;
        return b.promedioSeccion - a.promedioSeccion;
      });

    result.push({
      ciclo,
      promedioCurso,
      spread,
      isHighDispersion: spread >= 0.5,
      hasValidSections,
      secciones
    });
  }

  // Newest ciclo first
  return result.sort((a, b) => b.ciclo.localeCompare(a.ciclo));
}

// ── Historical Aggregation per Professor ─────────────────────────────────────
export interface ProfessorHistoricalStat {
  professor: string;
  promedioDocente: number;
  delta: number; // promedioDocente - promedioCurso
  sectionsCount: number;
  validSectionsCount: number;
  avgCoverage: number;
  isValid: boolean;
}

export interface HistoricalCourseVariance {
  promedioCurso: number;
  spread: number;
  isHighDispersion: boolean;
  hasValidSections: boolean;
  docentes: ProfessorHistoricalStat[];
}

export function computeHistoricalCourseVariance(records: SurveyRecord[]): HistoricalCourseVariance | null {
  if (!records || records.length === 0) return null;

  const validRecords = records.filter(r => r.isValid);
  const hasValidSections = validRecords.length > 0;
  const promedioCurso = hasValidSections
    ? Number(mean(validRecords.map(r => r.puntajeProfesor)).toFixed(2))
    : 0;

  const profMap = new Map<string, SurveyRecord[]>();
  records.forEach(r => {
    if (!profMap.has(r.professor)) profMap.set(r.professor, []);
    profMap.get(r.professor)!.push(r);
  });

  const docentes: ProfessorHistoricalStat[] = Array.from(profMap.entries()).map(([professor, rows]) => {
    const validRows = rows.filter(r => r.isValid);
    const isValid = validRows.length > 0;
    const scores = isValid
      ? validRows.map(r => r.puntajeProfesor)
      : rows.map(r => r.puntajeProfesor);
    const promedioDocente = Number(mean(scores).toFixed(2));
    const delta = (isValid && promedioCurso > 0)
      ? Number((promedioDocente - promedioCurso).toFixed(2))
      : 0;
    const avgCoverage = mean(rows.map(r => r.coverage));

    return {
      professor,
      promedioDocente,
      delta,
      sectionsCount: rows.length,
      validSectionsCount: validRows.length,
      avgCoverage,
      isValid
    };
  }).sort((a, b) => {
    if (a.isValid && !b.isValid) return -1;
    if (!a.isValid && b.isValid) return 1;
    return b.promedioDocente - a.promedioDocente;
  });

  const validProfScores = docentes.filter(d => d.isValid).map(d => d.promedioDocente);
  const spread = validProfScores.length > 1
    ? Number((Math.max(...validProfScores) - Math.min(...validProfScores)).toFixed(2))
    : 0;

  return {
    promedioCurso,
    spread,
    isHighDispersion: spread >= 0.5,
    hasValidSections,
    docentes
  };
}

