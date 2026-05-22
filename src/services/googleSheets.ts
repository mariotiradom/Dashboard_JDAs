import { mean } from '../utils/statistics';

export interface SurveyResponseRaw {
  courseCode: string;
  courseName: string;
  section: string;
  ciclo: string;
  professor: string;
  departamento: string;
  enrolled: number;
  responses: number;
  // Alumno
  alumnoCom: number;
  alumnoPunt: number;
  alumnoResp: number;
  alumnoDedic: number;
  // Curso
  cursoIncent: number;
  cursoObj: number;
  cursoRec: number;
  cursoDist: number;
  // Docente
  docenteMotiv: number;
  docenteEval: number;
  docentePunt: number;
  docenteCom: number;
  comentarios?: string[];
}

export interface SurveyRecord extends SurveyResponseRaw {
  coverage: number;
  isValid: boolean;
  puntajeAlumno: number;
  puntajeCurso: number;
  puntajeProfesor: number;
  puntajeTotal: number;
}

function calculateMetrics(raw: SurveyResponseRaw): SurveyRecord {
  const coverage = raw.responses / raw.enrolled;
  const isValid = coverage >= 0.6;

  const puntajeAlumno = mean([raw.alumnoCom, raw.alumnoPunt, raw.alumnoResp, raw.alumnoDedic]);
  const puntajeCurso = mean([raw.cursoIncent, raw.cursoObj, raw.cursoRec, raw.cursoDist]);
  const puntajeProfesor = mean([raw.docenteMotiv, raw.docenteEval, raw.docentePunt, raw.docenteCom]);

  const puntajeTotal = mean([puntajeAlumno, puntajeCurso, puntajeProfesor]);

  return {
    ...raw,
    coverage,
    isValid,
    puntajeAlumno,
    puntajeCurso,
    puntajeProfesor,
    puntajeTotal
  };
}

export async function fetchSurveyData(): Promise<SurveyRecord[]> {
  try {
    const response = await fetch(`/survey_data.json?v=${new Date().getTime()}`);
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    const data: SurveyResponseRaw[] = await response.json();
    return data.map(calculateMetrics);
  } catch (error) {
    console.error('Error fetching survey data:', error);
    return [];
  }
}

