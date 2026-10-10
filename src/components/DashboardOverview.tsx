import { useState, useMemo } from 'react';
import type { SurveyRecord } from '../services/googleSheets';
import { Users, BookOpen, CheckCircle, TrendingUp, Trophy } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';
import { mean } from '../utils/statistics';
import ProfessorsScatterPlot from './ProfessorsScatterPlot';

interface Props {
  data: SurveyRecord[];
  daName: string;
}

const MEDAL_CLASSES = ['gold', 'silver', 'bronze', 'normal', 'normal'];

// ── 4-tier score classification ──────────────────────────────────────────────
type Tier = { label: string; color: string; bg: string };

function getTier(score: number): Tier {
  if (score >= 4.5) return { label: 'Sobresaliente', color: 'var(--rea-turquesa)',       bg: 'rgba(61,209,178,0.12)' };
  if (score >= 4.0) return { label: 'Notable',       color: 'var(--primary)',             bg: 'rgba(32,78,207,0.10)' };
  if (score >= 3.5) return { label: 'Aceptable',     color: 'var(--rea-goldenrod)',       bg: 'rgba(234,152,54,0.12)' };
  return              { label: 'En Riesgo',           color: 'var(--rea-naranja-intenso)', bg: 'rgba(242,103,73,0.12)' };
}

const TIER_LEGEND: { range: string; tier: Tier }[] = [
  { range: '≥ 4.5', tier: getTier(4.5) },
  { range: '≥ 4.0', tier: getTier(4.0) },
  { range: '≥ 3.5', tier: getTier(3.5) },
  { range: '< 3.5', tier: getTier(0)   },
];

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

  // ═══ DA average & below-average professors ═══
  const daAvg = profScores.length > 0 ? mean(profScores.map(p => p.score)) : 0;
  const belowAvg = [...profScores]
    .filter(p => p.score < daAvg)
    .sort((a, b) => a.score - b.score); // worst first

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
          Puntaje promedio por docente (secciones válidas ≥ 60% participación) — promedio del DA:{' '}
          <strong style={{ color: 'var(--primary)' }}>{daAvg.toFixed(2)}</strong>
        </p>
        <ResponsiveContainer width="100%" height={Math.max(300, profScores.length * 40)}>
          <BarChart data={profScores} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-color)" />
            <XAxis type="number" domain={[0, 5]} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
            <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
            <RechartsTooltip
              cursor={{ fill: 'rgba(0,0,0,0.03)' }}
              contentStyle={{ borderRadius: '8px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-md)', fontSize: '0.85rem' }}
              formatter={(value: any) => {
                const score = typeof value === 'number' ? value : 0;
                const { label } = getTier(score);
                return [`${score.toFixed(2)} — ${label}`, 'Puntaje Docente'];
              }}
            />
            <Bar dataKey="score" radius={[0, 6, 6, 0]}>
              {profScores.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getTier(entry.score).color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* 4-tier legend */}
        <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', marginTop: '1rem', fontSize: '0.8rem', flexWrap: 'wrap' }}>
          {TIER_LEGEND.map(({ range, tier }) => (
            <div key={tier.label} className="flex-center" style={{ gap: '0.4rem' }}>
              <div style={{ width: 10, height: 10, backgroundColor: tier.color, borderRadius: 2 }} />
              <span style={{ color: tier.color, fontWeight: 600 }}>{tier.label}</span>
              <span style={{ color: 'var(--text-muted)' }}>({range})</span>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ Dispersión: Volumen de Estudiantes vs Puntaje Docente ═══ */}
      <ProfessorsScatterPlot data={data} daName={daName} />

      {/* ═══ Docentes Bajo el Promedio ═══ */}
      {belowAvg.length > 0 && (
        <div className="card mt-4" style={{ borderLeft: '4px solid var(--rea-naranja-intenso)' }}>
          <h3 className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: 'var(--rea-naranja-intenso)', fontSize: '1.1rem' }}>↓</span>
            Docentes Bajo el Promedio del DA
            <span style={{
              fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)',
              background: 'var(--rea-rojo-claro)', padding: '2px 8px', borderRadius: '99px', marginLeft: '0.25rem'
            }}>
              {belowAvg.length} {belowAvg.length === 1 ? 'docente' : 'docentes'}
            </span>
          </h3>
          <p className="dashboard-subtitle" style={{ fontSize: '0.8rem', marginBottom: '1.25rem', marginTop: '-0.5rem' }}>
            Puntaje por debajo del promedio del DA ({daAvg.toFixed(2)}), ordenados de menor a mayor. Solo secciones válidas.
          </p>
          <div className="ranking-list">
            {belowAvg.map((prof, idx) => {
              const tier = getTier(prof.score);
              const delta = prof.score - daAvg;
              return (
                <div className="ranking-item" key={prof.name}>
                  <div
                    className="ranking-position normal"
                    style={{ background: tier.bg, color: tier.color, border: `1px solid ${tier.color}`, fontWeight: 700 }}
                  >
                    {idx + 1}
                  </div>
                  <div className="ranking-name">
                    {prof.name}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.15rem' }}>
                      <span style={{
                        fontSize: '0.7rem', fontWeight: 600, padding: '1px 6px', borderRadius: '99px',
                        background: tier.bg, color: tier.color
                      }}>
                        {tier.label}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {prof.sections} {prof.sections === 1 ? 'sección' : 'secciones'}
                      </span>
                    </div>
                  </div>
                  <div className="ranking-bar-bg">
                    <div className="ranking-bar-fill" style={{
                      width: `${(prof.score / 5) * 100}%`,
                      background: `linear-gradient(90deg, ${tier.color}99, ${tier.color})`
                    }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: '64px' }}>
                    <span className="ranking-score" style={{ color: tier.color }}>{prof.score.toFixed(2)}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--rea-naranja-intenso)', fontWeight: 600 }}>
                      {delta.toFixed(2)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardOverview;
