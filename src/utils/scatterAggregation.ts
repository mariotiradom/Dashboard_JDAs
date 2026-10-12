import type { SurveyRecord } from '../services/googleSheets';
import { mean } from './statistics';

export interface ProfessorScatterPoint {
  professor: string;
  veces55: number; // Cantidad de secciones donde alcanzó >= 55% de participación
  totalSecciones: number; // Total de secciones dictadas históricamente
  totalMatriculados: number; // Suma de alumnos matriculados en secciones válidas
  totalEstudiantes: number; // Suma de respuestas en secciones válidas
  promedio: number; // Puntaje promedio en las secciones válidas
  cursos: string[];
}

export interface ScatterAggregationResult {
  points: ProfessorScatterPoint[];
  avgScore: number; // Department average score across valid sections
  medianVeces: number; // Median times reaching >= 55%
  avgVeces: number; // Mean times reaching >= 55%
  minVeces: number;
  maxVeces: number;
  minScore: number;
  maxScore: number;
  yMin: number;
  yTicks: number[];
  xTicks: number[];
}

/**
 * Aggregates survey records by professor for historical scatter plot analysis.
 * Plots 'veces con >= 55%' on X-axis and 'Puntaje Promedio' on Y-axis.
 */
export function aggregateProfessorsScatter(records: SurveyRecord[]): ScatterAggregationResult {
  if (!records || records.length === 0) {
    return {
      points: [],
      avgScore: 0,
      medianVeces: 0,
      avgVeces: 0,
      minVeces: 0,
      maxVeces: 0,
      minScore: 0,
      maxScore: 5,
      yMin: 1,
      yTicks: [1, 2, 3, 4, 5],
      xTicks: [0, 1, 2, 3]
    };
  }

  // Group all records by professor
  const profAllMap = new Map<string, SurveyRecord[]>();
  records.forEach(r => {
    if (!profAllMap.has(r.professor)) profAllMap.set(r.professor, []);
    profAllMap.get(r.professor)!.push(r);
  });

  const points: ProfessorScatterPoint[] = [];

  profAllMap.forEach((allRows, professor) => {
    const validRows = allRows.filter(r => r.isValid);
    // Solo mostramos docentes con al menos una sección válida para que el promedio sea representativo
    if (validRows.length === 0) return;

    const scores = validRows.map(r => r.puntajeProfesor);
    const promedio = Number(mean(scores).toFixed(2));
    const totalMatriculados = validRows.reduce((sum, r) => sum + r.enrolled, 0);
    const totalEstudiantes = validRows.reduce((sum, r) => sum + r.responses, 0);
    const cursos = Array.from(new Set(validRows.map(r => r.courseName))).sort();

    points.push({
      professor,
      veces55: validRows.length,
      totalSecciones: allRows.length,
      totalMatriculados,
      totalEstudiantes,
      promedio,
      cursos
    });
  });

  if (points.length === 0) {
    return {
      points: [],
      avgScore: 0,
      medianVeces: 0,
      avgVeces: 0,
      minVeces: 0,
      maxVeces: 0,
      minScore: 0,
      maxScore: 5,
      yMin: 1,
      yTicks: [1, 2, 3, 4, 5],
      xTicks: [0, 1, 2, 3]
    };
  }

  // Calculate score benchmarks
  const allScores = points.map(p => p.promedio);
  const avgScore = Number(mean(allScores).toFixed(2));
  const minScore = Math.min(...allScores);
  const maxScore = Math.max(...allScores);

  const floorMin = Math.floor(minScore);
  const yMin = Math.max(0, Math.min(4, floorMin));

  const yTicks: number[] = [];
  for (let t = yMin; t <= 5.001; t = Number((t + 0.5).toFixed(1))) {
    yTicks.push(t);
  }

  // Calculate veces55 benchmarks (X-axis)
  const vecesList = points.map(p => p.veces55).sort((a, b) => a - b);
  const mid = Math.floor(vecesList.length / 2);
  const medianVeces = vecesList.length % 2 !== 0
    ? vecesList[mid]
    : Math.round((vecesList[mid - 1] + vecesList[mid]) / 2);

  const avgVeces = Number(mean(vecesList).toFixed(1));
  const minVeces = vecesList[0] ?? 0;
  const maxVeces = vecesList[vecesList.length - 1] ?? 5;

  const xTicks: number[] = [];
  const maxX = Math.max(maxVeces + 1, 3);
  for (let i = 0; i <= maxX; i++) {
    xTicks.push(i);
  }

  return {
    points,
    avgScore,
    medianVeces,
    avgVeces,
    minVeces,
    maxVeces,
    minScore,
    maxScore,
    yMin,
    yTicks,
    xTicks
  };
}
