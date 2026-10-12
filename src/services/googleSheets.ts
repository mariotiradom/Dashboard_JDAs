import { mean } from '../utils/statistics';
import { isCicloBeforeOrEqual } from '../utils/cycles';

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
  docenteAyuda: number;
  docenteMotiv: number;
  docenteRetro: number;
  docenteEstim: number;
  docenteInteres: number;
  docenteRespeto: number;
  docentePromedio: number;
  puntajeProfesor: number;
  comentarios?: string[];
}

export interface SurveyRecord extends SurveyResponseRaw {
  coverage: number;
  isValid: boolean;
  isOutlier: boolean;
  puntajeProfesor: number;
  puntajeTotal?: number;
}

function calculateMetrics(raw: SurveyResponseRaw): SurveyRecord {
  const coverage = raw.enrolled > 0 ? raw.responses / raw.enrolled : 0;
  const isValid = coverage >= 0.55;

  const puntajeProfesor = raw.docentePromedio;

  return {
    ...raw,
    coverage,
    isValid,
    isOutlier: false, // Calculated later
    puntajeProfesor,
    puntajeTotal: puntajeProfesor
  };
}

export async function fetchSurveyData(): Promise<SurveyRecord[]> {
  try {
    const response = await fetch(`/survey_data_v2.json?v=${new Date().getTime()}`);
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    const data: SurveyResponseRaw[] = await response.json();
    const records = data.map(calculateMetrics);
    
    // Calcular isOutlier por profesor de manera retrospectiva (solo ciclos <= ciclo de la sección)
    const profs = Array.from(new Set(records.map(r => r.professor)));
    for (const prof of profs) {
      const profRecords = records.filter(r => r.professor === prof);
      profRecords.forEach(r => {
        // Histórico retrospectivo: secciones válidas del docente hasta el ciclo actual
        const historicalRecords = profRecords.filter(
          other => isCicloBeforeOrEqual(other.ciclo, r.ciclo) && other.isValid
        );

        if (historicalRecords.length > 0) {
          const scores = historicalRecords.map(h => h.puntajeProfesor);
          const retroMean = mean(scores);
          r.isOutlier = Math.abs(r.puntajeProfesor - retroMean) > 1.0;
        } else {
          r.isOutlier = false;
        }
      });
    }
    
    return records;
  } catch (error) {
    console.error('Error fetching survey data:', error);
    return [];
  }
}

