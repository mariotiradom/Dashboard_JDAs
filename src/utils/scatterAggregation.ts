import type { SurveyRecord } from '../services/googleSheets';
import { mean } from './statistics';

export interface ProfessorScatterPoint {
  professor: string;
  totalEstudiantes: number; // Sum of student responses in valid sections
  totalMatriculados: number; // Sum of enrolled students in valid sections (from enrollment database)
  promedio: number; // Average professor score
  seccionesCount: number;
  cursos: string[];
}

export interface ScatterAggregationResult {
  points: ProfessorScatterPoint[];
  avgScore: number; // Department average score
  medianStudents: number; // Median enrolled count
  avgStudents: number; // Mean enrolled count
  minStudents: number;
  maxStudents: number;
  minScore: number;
  maxScore: number;
  yMin: number; // Lower integer floor near the lowest score
  yTicks: number[]; // Evenly spaced tick marks for Y-axis
}

/**
 * Aggregates survey records by professor for scatter plot analysis.
 * Filters out sections below reliability threshold (isValid = false, i.e., coverage < 60%).
 */
export function aggregateProfessorsScatter(records: SurveyRecord[]): ScatterAggregationResult {
  // 1. Filter by reliability threshold (coverage >= 60%)
  const validRecords = records.filter(r => r.isValid);

  if (validRecords.length === 0) {
    return {
      points: [],
      avgScore: 0,
      medianStudents: 0,
      avgStudents: 0,
      minStudents: 0,
      maxStudents: 0,
      minScore: 0,
      maxScore: 5,
      yMin: 1,
      yTicks: [1, 2, 3, 4, 5]
    };
  }

  // 2. Group by professor name
  const profMap = new Map<string, {
    totalEstudiantes: number;
    totalMatriculados: number;
    scores: number[];
    cursos: Set<string>;
    seccionesCount: number;
  }>();

  validRecords.forEach(r => {
    if (!profMap.has(r.professor)) {
      profMap.set(r.professor, {
        totalEstudiantes: 0,
        totalMatriculados: 0,
        scores: [],
        cursos: new Set<string>(),
        seccionesCount: 0
      });
    }

    const entry = profMap.get(r.professor)!;
    entry.totalEstudiantes += r.responses;
    entry.totalMatriculados += r.enrolled;
    entry.scores.push(r.puntajeProfesor);
    entry.cursos.add(r.courseName);
    entry.seccionesCount += 1;
  });

  const points: ProfessorScatterPoint[] = Array.from(profMap.entries()).map(([professor, data]) => {
    const promedio = Number(mean(data.scores).toFixed(2));
    return {
      professor,
      totalEstudiantes: data.totalEstudiantes,
      totalMatriculados: data.totalMatriculados,
      promedio,
      seccionesCount: data.seccionesCount,
      cursos: Array.from(data.cursos).sort()
    };
  });

  // Calculate score benchmarks
  const allScores = points.map(p => p.promedio);
  const avgScore = Number(mean(allScores).toFixed(2));
  const minScore = Math.min(...allScores);
  const maxScore = Math.max(...allScores);

  // Dynamic Y-axis lower integer tick near lowest score
  // E.g., if lowest score is 3.12, floor is 3. Domain [3, 5], ticks [3, 3.5, 4, 4.5, 5]
  const floorMin = Math.floor(minScore);
  const yMin = Math.max(0, Math.min(4, floorMin));

  const yTicks: number[] = [];
  // Build 0.5 step ticks from yMin to 5
  for (let t = yMin; t <= 5.001; t = Number((t + 0.5).toFixed(1))) {
    yTicks.push(t);
  }

  // Calculate enrolled student benchmarks (X-axis)
  const enrolledCounts = points.map(p => p.totalMatriculados).sort((a, b) => a - b);
  const mid = Math.floor(enrolledCounts.length / 2);
  const medianStudents = enrolledCounts.length % 2 !== 0
    ? enrolledCounts[mid]
    : Math.round((enrolledCounts[mid - 1] + enrolledCounts[mid]) / 2);

  const avgStudents = Math.round(mean(enrolledCounts));
  const minStudents = enrolledCounts[0] ?? 0;
  const maxStudents = enrolledCounts[enrolledCounts.length - 1] ?? 100;

  return {
    points,
    avgScore,
    medianStudents,
    avgStudents,
    minStudents,
    maxStudents,
    minScore,
    maxScore,
    yMin,
    yTicks
  };
}
