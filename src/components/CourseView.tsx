import { useState, useMemo } from 'react';
import type { SurveyRecord } from '../services/googleSheets';
import { mean } from '../utils/statistics';
import { computeSectionVariance } from '../utils/sectionVariance';
import { BookOpen } from 'lucide-react';
import SearchBar from './SearchBar';
import SectionVarianceCard from './SectionVarianceCard';

interface Props {
  data: SurveyRecord[];
  availableCiclos: string[];
}

const CourseView: React.FC<Props> = ({ data }) => {
  const courses = Array.from(new Set(data.map(d => d.courseName))).sort();
  const [selectedCourse, setSelectedCourse] = useState<string>(courses[0] || '');

  const activeCourse = (courses.includes(selectedCourse) ? selectedCourse : courses[0]) || '';

  // All records for the active course
  const courseData = useMemo(() => {
    return data.filter(d => d.courseName === activeCourse);
  }, [data, activeCourse]);

  // Secciones evaluables (cobertura >= 55% para asegurar representatividad estadística)
  const validSections = useMemo(() => {
    return courseData.filter(d => d.isValid);
  }, [courseData]);

  // Overall curso baseline (promedioCurso across valid sections)
  const promedioCurso = useMemo(() => {
    return validSections.length > 0 ? Number(mean(validSections.map(d => d.puntajeProfesor)).toFixed(2)) : 0;
  }, [validSections]);

  // Varianza entre secciones para el curso activo
  const varianceData = useMemo(() => {
    return computeSectionVariance(courseData);
  }, [courseData]);

  // Docentes en secciones válidas
  const profCount = useMemo(() => {
    const profs = new Set(validSections.map(d => d.professor));
    return profs.size;
  }, [validSections]);

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
          <div className="stat-title">Promedio General del Curso</div>
          <div className="stat-value text-gradient">{promedioCurso.toFixed(2)}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Línea base (secciones válidas ≥ 55%)
          </div>
        </div>
        <div className="card stat-card">
          <div className="stat-title">Secciones Evaluadas</div>
          <div className="stat-value">{courseData.length}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            {validSections.length} válidas (≥ 55% part.)
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

      {/* ═══ Varianza entre Secciones ═══ */}
      <SectionVarianceCard courseName={activeCourse} varianceData={varianceData} />
    </div>
  );
};

export default CourseView;
