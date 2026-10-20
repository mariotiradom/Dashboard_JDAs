import { useState, useMemo } from 'react';
import type { SurveyRecord } from '../services/googleSheets';
import { mean } from '../utils/statistics';
import { computeSectionVariance, computeHistoricalCourseVariance } from '../utils/sectionVariance';
import { BookOpen } from 'lucide-react';
import SearchBar from './SearchBar';
import SectionVarianceCard from './SectionVarianceCard';

interface Props {
  data: SurveyRecord[];
  availableCiclos: string[];
  activeCiclo?: string;
  onSelectProfessor?: (profName: string) => void;
}

const CourseView: React.FC<Props> = ({ data, activeCiclo, onSelectProfessor }) => {
  const isHistorical = activeCiclo === 'Histórico';

  // Solo cursos y secciones con al menos 1 respuesta registrada (>0% cobertura)
  const evaluableData = useMemo(() => {
    return data.filter(d => d.responses > 0);
  }, [data]);

  const courses = useMemo(() => {
    return Array.from(new Set(evaluableData.map(d => d.courseName))).sort();
  }, [evaluableData]);

  const [selectedCourse, setSelectedCourse] = useState<string>(courses[0] || '');

  const activeCourse = (courses.includes(selectedCourse) ? selectedCourse : courses[0]) || '';

  // All records for the active course
  const courseData = useMemo(() => {
    return evaluableData.filter(d => d.courseName === activeCourse);
  }, [evaluableData, activeCourse]);

  // Consolidar por sección única para evitar duplicar secciones con múltiples docentes
  const uniqueSections = useMemo(() => {
    const map = new Map<string, SurveyRecord[]>();
    courseData.forEach(d => {
      const cleanLabel = d.section.replace(/[[\]()]/g, '').trim().split(' ')[0] || d.section;
      const key = `${d.ciclo}_${cleanLabel}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(d);
    });

    return Array.from(map.values()).map(secRows => {
      const first = secRows[0];
      const allProfs = Array.from(new Set(secRows.map(r => r.professor)));
      const scores = secRows.map(r => r.puntajeProfesor);
      return {
        ...first,
        professor: allProfs.join(', '),
        puntajeProfesor: Number(mean(scores).toFixed(2))
      };
    });
  }, [courseData]);

  // Secciones evaluables (cobertura >= 55% para asegurar representatividad estadística)
  const validSections = useMemo(() => {
    return uniqueSections.filter(d => d.isValid);
  }, [uniqueSections]);

  // Overall curso baseline (promedioCurso across unique valid sections)
  const promedioCurso = useMemo(() => {
    return validSections.length > 0 ? Number(mean(validSections.map(d => d.puntajeProfesor)).toFixed(2)) : 0;
  }, [validSections]);

  // Varianza entre secciones para el curso activo (en ciclo específico)
  const varianceData = useMemo(() => {
    if (isHistorical) return [];
    return computeSectionVariance(courseData);
  }, [courseData, isHistorical]);

  // Varianza histórica agrupada por docente (en vista histórica)
  const historicalVariance = useMemo(() => {
    if (!isHistorical) return null;
    return computeHistoricalCourseVariance(courseData);
  }, [courseData, isHistorical]);

  // Docentes únicos en secciones válidas
  const profCount = useMemo(() => {
    const profs = new Set(courseData.filter(d => d.isValid).map(d => d.professor));
    return profs.size;
  }, [courseData]);

  if (!activeCourse) {
    return <div>No hay cursos disponibles en este departamento.</div>;
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="dashboard-header flex-between" style={{ alignItems: 'flex-start' }}>
        <div>
          <h2 className="dashboard-title">Análisis por Curso</h2>
          <p className="dashboard-subtitle">Evaluación de la plana docente y varianza entre secciones</p>
        </div>

        <div style={{ width: '350px' }}>
          <SearchBar
            items={courses}
            value={activeCourse}
            onChange={setSelectedCourse}
            placeholder="Buscar curso..."
            icon={<BookOpen size={18} />}
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="card stat-card" style={{ borderTop: '4px solid var(--primary)' }}>
          <div className="stat-title">Puntaje Promedio del Curso</div>
          <div className="stat-value text-gradient">{promedioCurso.toFixed(2)}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Línea base representativa
          </div>
        </div>
        <div className="card stat-card">
          <div className="stat-title">Secciones Evaluadas</div>
          <div className="stat-value">{uniqueSections.length}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            {validSections.length} representativas
          </div>
        </div>
        <div className="card stat-card">
          <div className="stat-title">Docentes Asignados</div>
          <div className="stat-value">{profCount}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Docentes en secciones válidas
          </div>
        </div>
      </div>

      {/* ═══ Varianza entre Secciones / Docentes ═══ */}
      <SectionVarianceCard 
        courseName={activeCourse} 
        varianceData={varianceData}
        historicalVariance={historicalVariance}
        isHistorical={isHistorical}
        onSelectProfessor={onSelectProfessor}
      />
    </div>
  );
};

export default CourseView;
