import { useState, useMemo } from 'react';
import type { SurveyRecord } from '../services/googleSheets';
import { mean } from '../utils/statistics';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';
import { BookOpen } from 'lucide-react';
import SearchBar from './SearchBar';

interface Props {
  data: SurveyRecord[];
}

const CourseView: React.FC<Props> = ({ data }) => {
  const courses = Array.from(new Set(data.map(d => d.courseName))).sort();
  const [selectedCourse, setSelectedCourse] = useState<string>(courses[0] || '');
  const [legendTooltip, setLegendTooltip] = useState<{show: boolean, x: number, y: number, text: string}>({show: false, x: 0, y: 0, text: ''});

  const activeCourse = (courses.includes(selectedCourse) ? selectedCourse : courses[0]) || '';

  const courseData = useMemo(() => {
    return data.filter(d => d.courseName === activeCourse);
  }, [data, activeCourse]);

  const validCourseData = useMemo(() => {
    return courseData.filter(d => !(d.isOutlier && !d.isValid));
  }, [courseData]);

  // Promedio del curso basado en el puntaje docente
  const courseProfScore = validCourseData.length > 0 ? mean(validCourseData.map(d => d.puntajeProfesor)) : 0;
  
  // Agrupar por profesor que dicta este curso
  const profMap = new Map<string, number[]>();
  validCourseData.forEach(d => {
    if (!profMap.has(d.professor)) profMap.set(d.professor, []);
    profMap.get(d.professor)!.push(d.puntajeProfesor);
  });

  const profScores = Array.from(profMap.entries()).map(([name, scores]) => ({
    name,
    score: Number(mean(scores).toFixed(2))
  })).sort((a, b) => b.score - a.score);

  if (!activeCourse) {
    return <div>No hay cursos disponibles en este departamento.</div>;
  }

  return (
    <div className="animate-fade-in">
      <div className="dashboard-header flex-between" style={{ alignItems: 'flex-start' }}>
        <div>
          <h2 className="dashboard-title">Análisis por Curso</h2>
          <p className="dashboard-subtitle">Evaluación de la plana docente por asignatura</p>
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

      <div className="stats-grid">
        <div className="card stat-card" style={{ borderTop: '4px solid var(--primary)' }}>
          <div className="stat-title">Puntaje Docente Promedio del Curso</div>
          <div className="stat-value text-gradient">{courseProfScore.toFixed(2)}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-title">Secciones Evaluadas</div>
          <div className="stat-value">{courseData.length}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-title">Docentes Asignados</div>
          <div className="stat-value">{profScores.length}</div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="card chart-container" style={{ gridColumn: 'span 2' }}>
          <h3 className="chart-title">Desempeño Docente en {activeCourse}</h3>
          <p className="dashboard-subtitle" style={{ fontSize: '0.85rem', marginBottom: '1.5rem', marginTop: '-0.5rem' }}>
            Comparativa del <strong>Puntaje Docente</strong> promedio entre los profesores que dictan esta asignatura (solo secciones válidas).
          </p>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={profScores} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
              <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
              <YAxis domain={[0, 5]} tick={{ fill: 'var(--text-secondary)' }} />
              <RechartsTooltip 
                cursor={{ fill: 'rgba(0,0,0,0.03)' }}
                contentStyle={{ borderRadius: '8px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-md)' }}
                formatter={(value: any) => [typeof value === 'number' ? value.toFixed(2) : value, 'Puntaje Docente']}
              />
              <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                {profScores.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.score >= 4.5 ? 'var(--rea-turquesa)' : entry.score >= 3.5 ? 'var(--primary)' : 'var(--rea-naranja-intenso)'} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', marginTop: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <div className="flex-center" style={{ gap: '0.5rem' }}>
              <div style={{ width: 12, height: 12, backgroundColor: 'var(--rea-turquesa)', borderRadius: 3 }}></div> Excelente (≥4.5)
            </div>
            <div className="flex-center" style={{ gap: '0.5rem' }}>
              <div style={{ width: 12, height: 12, backgroundColor: 'var(--primary)', borderRadius: 3 }}></div> Bueno (≥3.5)
            </div>
            <div className="flex-center" style={{ gap: '0.5rem' }}>
              <div style={{ width: 12, height: 12, backgroundColor: 'var(--rea-naranja-intenso)', borderRadius: 3 }}></div> Requiere Atención (&lt;3.5)
            </div>
          </div>
        </div>
      </div>
      
      <div className="card mt-4">
        <h3 className="chart-title">Detalle de Secciones</h3>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Sección</th>
                <th>Código</th>
                <th>Profesor</th>
                <th>Matriculados</th>
                <th>Participación</th>
                <th>Puntaje Docente</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {courseData.sort((a,b) => a.section.localeCompare(b.section)).map((row, idx) => (
                <tr key={idx} className={!row.isValid ? 'row-invalid' : ''}>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{row.section}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{row.courseCode}</td>
                  <td style={{ fontWeight: 500 }}>{row.professor}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{row.enrolled}</td>
                  <td>
                    {(row.coverage * 100).toFixed(1)}%
                    {!row.isValid && 
                      <span 
                        className="badge badge-warning" 
                        style={{ marginLeft: '0.5rem', fontSize: '0.65rem', cursor: 'help' }}
                        onMouseEnter={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setLegendTooltip({
                            show: true,
                            x: rect.left + rect.width / 2,
                            y: rect.top,
                            text: 'EP por debajo del 60%'
                          });
                        }}
                        onMouseLeave={() => setLegendTooltip({ ...legendTooltip, show: false })}
                      >
                        Baja
                      </span>
                    }
                  </td>
                  <td style={{ 
                    fontWeight: row.isValid ? 700 : 500, 
                    color: row.isValid ? 'var(--primary)' : 'inherit',
                    fontSize: '1.05rem'
                  }}>
                    {row.puntajeProfesor.toFixed(2)}
                  </td>
                  <td>
                     {row.isValid ? (
                      <span className="badge badge-success">Válido</span>
                    ) : (
                      <span className="badge badge-warning">Excluido</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {legendTooltip.show && (
        <div style={{
          position: 'fixed', left: legendTooltip.x, top: legendTooltip.y,
          transform: 'translate(-50%, -100%)', marginTop: '-10px',
          backgroundColor: 'white', padding: '8px 12px', borderRadius: '6px',
          boxShadow: 'var(--shadow-md)', border: '1px solid var(--border-color)',
          fontSize: '0.8rem', color: 'var(--text-primary)', zIndex: 1000,
          pointerEvents: 'none', whiteSpace: 'nowrap'
        }}>
          {legendTooltip.text}
          <div style={{
            position: 'absolute', bottom: '-5px', left: '50%', transform: 'translateX(-50%)',
            borderWidth: '5px 5px 0', borderStyle: 'solid',
            borderColor: 'white transparent transparent transparent'
          }}></div>
        </div>
      )}
    </div>
  );
};

export default CourseView;
