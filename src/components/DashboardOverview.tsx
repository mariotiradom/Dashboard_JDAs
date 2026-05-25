import { useState, useMemo } from 'react';
import type { SurveyRecord } from '../services/googleSheets';
import { Users, BookOpen, CheckCircle, TrendingUp, Trophy } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';
import { mean } from '../utils/statistics';

interface Props {
  data: SurveyRecord[];
  daName: string;
}

const MEDAL_CLASSES = ['gold', 'silver', 'bronze', 'normal', 'normal'];

const DashboardOverview: React.FC<Props> = ({ data, daName }) => {
  const validData = data.filter(d => d.isValid);

  const totalCourses = new Set(data.map(d => d.courseName)).size;
  const totalProfessors = new Set(data.map(d => d.professor)).size;
  const totalSections = data.length;
  const avgParticipation = data.length > 0 ? mean(data.map(d => d.coverage)) * 100 : 0;

  // ═══ Promedio global usando SOLO puntajeProfesor (sin alumnos) ═══
  const globalScore = validData.length > 0 ? mean(validData.map(d => d.puntajeProfesor)) : 0;

  // ═══ Top 5 Profesores del DA (usando puntajeProfesor) ═══
  const profMap = new Map<string, number[]>();
  validData.forEach(d => {
    if (!profMap.has(d.professor)) profMap.set(d.professor, []);
    profMap.get(d.professor)!.push(d.puntajeProfesor);
  });

  const profScores = Array.from(profMap.entries()).map(([name, scores]) => ({
    name,
    score: Number(mean(scores).toFixed(2)),
    sections: scores.length
  })).sort((a, b) => b.score - a.score);

  const top5DA = profScores.slice(0, 5);

  // ═══ Top 5 por Curso ═══
  const courses = Array.from(new Set(data.map(d => d.courseName))).sort();
  const [selectedCourse, setSelectedCourse] = useState('');
  const activeCourse = selectedCourse || courses[0] || '';

  const top5Course = useMemo(() => {
    const courseValid = validData.filter(d => d.courseName === activeCourse);
    const map = new Map<string, number[]>();
    courseValid.forEach(d => {
      if (!map.has(d.professor)) map.set(d.professor, []);
      map.get(d.professor)!.push(d.puntajeProfesor);
    });
    return Array.from(map.entries()).map(([name, scores]) => ({
      name,
      score: Number(mean(scores).toFixed(2)),
      sections: scores.length
    })).sort((a, b) => b.score - a.score).slice(0, 5);
  }, [validData, activeCourse]);

  return (
    <div className="animate-fade-in">
      <div className="dashboard-header">
        <h2 className="dashboard-title">Vista General — <span className="text-gradient">{daName}</span></h2>
        <p className="dashboard-subtitle">Métricas principales de las evaluaciones docentes (solo categoría Profesores)</p>
      </div>

      {/* ═══ Stats Cards ═══ */}
      <div className="stats-grid">
        <div className="card stat-card">
          <div className="stat-icon"><BookOpen size={22} /></div>
          <div className="stat-title">Cursos Evaluados</div>
          <div className="stat-value">{totalCourses}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-icon"><Users size={22} /></div>
          <div className="stat-title">Docentes Evaluados</div>
          <div className="stat-value">{totalProfessors}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-icon"><CheckCircle size={22} /></div>
          <div className="stat-title">Secciones Evaluadas</div>
          <div className="stat-value">{totalSections}</div>
        </div>
        <div className="card stat-card" style={{
          background: 'linear-gradient(135deg, var(--primary) 0%, var(--rea-azul-pastel) 100%)',
          color: 'white',
          border: 'none'
        }}>
          <div className="stat-icon" style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}>
            <TrendingUp size={22} />
          </div>
          <div className="stat-title" style={{ color: 'rgba(255,255,255,0.8)' }}>Puntaje Global Docente</div>
          <div className="stat-value" style={{ color: 'white' }}>
            {globalScore.toFixed(2)} <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>/ 5.0</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', marginTop: '0.25rem' }}>
            Participación: {avgParticipation.toFixed(0)}%
          </div>
        </div>
      </div>

      {/* ═══ Rankings ═══ */}
      <div className="charts-grid">
        {/* Top 5 por DA */}
        <div className="card chart-container">
          <h3 className="chart-title">
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Trophy size={18} color="var(--rea-goldenrod)" />
              Top 5 Docentes del DA
            </span>
          </h3>
          <p className="dashboard-subtitle" style={{ fontSize: '0.8rem', marginBottom: '1rem', marginTop: '-0.5rem' }}>
            Ranking basado en el promedio de la categoría Profesores (secciones válidas)
          </p>
          <div className="ranking-list">
            {top5DA.map((prof, idx) => (
              <div className="ranking-item" key={prof.name}>
                <div className={`ranking-position ${MEDAL_CLASSES[idx]}`}>{idx + 1}</div>
                <div className="ranking-name">
                  {prof.name}
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                    {prof.sections} {prof.sections === 1 ? 'sección' : 'secciones'}
                  </div>
                </div>
                <div className="ranking-bar-bg">
                  <div className="ranking-bar-fill" style={{ width: `${(prof.score / 5) * 100}%` }} />
                </div>
                <div className="ranking-score">{prof.score.toFixed(2)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Top 5 por Curso */}
        <div className="card chart-container">
          <h3 className="chart-title">
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BookOpen size={18} color="var(--rea-naranja-intenso)" />
              Top 5 Docentes por Curso
            </span>
            <select
              className="course-selector-mini"
              value={activeCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
            >
              {courses.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </h3>
          <p className="dashboard-subtitle" style={{ fontSize: '0.8rem', marginBottom: '1rem', marginTop: '-0.5rem' }}>
            Mejores profesores en <strong>{activeCourse}</strong>
          </p>

          {top5Course.length === 0 ? (
            <div className="flex-center" style={{ height: '200px', color: 'var(--text-muted)' }}>
              No hay datos válidos para este curso
            </div>
          ) : (
            <div className="ranking-list">
              {top5Course.map((prof, idx) => (
                <div className="ranking-item" key={prof.name}>
                  <div className={`ranking-position ${MEDAL_CLASSES[idx]}`}>{idx + 1}</div>
                  <div className="ranking-name">
                    {prof.name}
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                      {prof.sections} {prof.sections === 1 ? 'sección' : 'secciones'}
                    </div>
                  </div>
                  <div className="ranking-bar-bg">
                    <div className="ranking-bar-fill" style={{
                      width: `${(prof.score / 5) * 100}%`,
                      background: 'linear-gradient(90deg, var(--rea-goldenrod), var(--rea-naranja-intenso))'
                    }} />
                  </div>
                  <div className="ranking-score" style={{ color: 'var(--rea-naranja-intenso)' }}>{prof.score.toFixed(2)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ═══ Bar Chart - Todos los profesores ═══ */}
      <div className="card mt-4">
        <h3 className="chart-title">Comparativa General de Docentes</h3>
        <p className="dashboard-subtitle" style={{ fontSize: '0.8rem', marginBottom: '1.5rem', marginTop: '-0.5rem' }}>
          Puntaje promedio de la categoría Profesores por docente (solo secciones válidas ≥ 50% participación)
        </p>
        <ResponsiveContainer width="100%" height={Math.max(300, profScores.length * 40)}>
          <BarChart data={profScores} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-color)" />
            <XAxis type="number" domain={[0, 5]} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
            <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
            <RechartsTooltip
              cursor={{ fill: 'rgba(0,0,0,0.03)' }}
              contentStyle={{ borderRadius: '8px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-md)', fontSize: '0.85rem' }}
              formatter={(value: any) => [typeof value === 'number' ? value.toFixed(2) : value, 'Puntaje Docente']}
            />
            <Bar dataKey="score" radius={[0, 6, 6, 0]}>
              {profScores.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.score >= 4.5 ? 'var(--rea-turquesa)' : entry.score >= 3.5 ? 'var(--primary)' : 'var(--rea-naranja-intenso)'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          <div className="flex-center" style={{ gap: '0.4rem' }}><div style={{ width: 10, height: 10, backgroundColor: 'var(--rea-turquesa)', borderRadius: 2 }}></div> Excelente (≥4.5)</div>
          <div className="flex-center" style={{ gap: '0.4rem' }}><div style={{ width: 10, height: 10, backgroundColor: 'var(--primary)', borderRadius: 2 }}></div> Bueno (≥3.5)</div>
          <div className="flex-center" style={{ gap: '0.4rem' }}><div style={{ width: 10, height: 10, backgroundColor: 'var(--rea-naranja-intenso)', borderRadius: 2 }}></div> Requiere Atención (&lt;3.5)</div>
        </div>
      </div>
    </div>
  );
};

export default DashboardOverview;
