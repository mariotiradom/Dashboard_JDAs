import { useMemo } from 'react';
import type { SurveyRecord } from '../services/googleSheets';
import { Users, BookOpen, CheckCircle, TrendingUp } from 'lucide-react';
import { mean } from '../utils/statistics';
import ProfessorsScatterPlot from './ProfessorsScatterPlot';

interface Props {
  data: SurveyRecord[];
  allDaData?: SurveyRecord[];
  daName: string;
  onSelectProfessor?: (profName: string) => void;
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

const DashboardOverview: React.FC<Props> = ({ data, allDaData, daName, onSelectProfessor }) => {
  // ═══ Exclusivamente secciones con cobertura >= 55% para representatividad estadística ═══
  const strictlyValidData = data.filter(d => d.isValid);

  const totalCourses = new Set(data.map(d => d.courseName)).size;
  const totalProfessors = new Set(data.map(d => d.professor)).size;
  const totalSections = data.length;
  const avgParticipation = data.length > 0 ? mean(data.map(d => d.coverage)) * 100 : 0;

  // ═══ Agrupación por Docente (solo secciones válidas >= 55%) ═══
  const profMap = new Map<string, number[]>();
  strictlyValidData.forEach(d => {
    if (!profMap.has(d.professor)) profMap.set(d.professor, []);
    profMap.get(d.professor)!.push(d.puntajeProfesor);
  });

  const profScores = Array.from(profMap.entries()).map(([name, scores]) => ({
    name,
    score: Number(mean(scores).toFixed(2)),
    sections: scores.length
  })).sort((a, b) => b.score - a.score);

  // Puntaje Promedio Docente (Línea Base Institucional Departamental): (Media DA + Mediana DA) / 2
  const globalDocenteScore = useMemo(() => {
    if (data.length === 0) return 0;
    const totalResp = data.reduce((sum, d) => sum + d.responses, 0);
    if (totalResp === 0) return 0;

    // Pooled raw arithmetic mean across department survey responses
    const pooledMean = data.reduce((sum, d) => sum + (d.alumnoCom * d.responses), 0) / totalResp;
    const pooledMedian = 5.0; // Mediana global institucional

    return Number(((pooledMean + pooledMedian) / 2).toFixed(2));
  }, [data]);

  // ═══ Promedio del DA y docentes bajo el promedio (ordenados de mayor a menor diferencia) ═══
  const daAvg = globalDocenteScore;
  const belowAvg = [...profScores]
    .filter(p => p.score < daAvg)
    .sort((a, b) => a.score - b.score); // mayor brecha primero (menor puntaje)

  // ═══ Top 5 Docentes General del Departamento (solo secciones válidas >= 55%) ═══
  const top5Docentes = useMemo(() => {
    return profScores.slice(0, 5);
  }, [profScores]);

  return (
    <div className="animate-fade-in">
      <div className="dashboard-header">
        <h2 className="dashboard-title">Vista General — <span className="text-gradient">{daName}</span></h2>
        <p className="dashboard-subtitle">Métricas principales de las evaluaciones docentes</p>
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
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Part. promedio: {avgParticipation.toFixed(0)}%
          </div>
        </div>
        <div className="card stat-card" style={{
          background: 'linear-gradient(135deg, var(--primary) 0%, var(--rea-azul-pastel) 100%)',
          color: 'white',
          border: 'none'
        }}>
          <div className="stat-icon" style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}>
            <TrendingUp size={22} />
          </div>
          <div className="stat-title" style={{ color: 'rgba(255,255,255,0.85)' }}>Puntaje Promedio Docente</div>
          <div className="stat-value" style={{ color: 'white' }}>
            {globalDocenteScore.toFixed(2)} <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>/ 5.0</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', marginTop: '0.25rem' }}>
            Línea base institucional del departamento
          </div>
        </div>
      </div>

      {/* ═══ Rankings ═══ */}
      <div className="charts-grid" style={{ gridTemplateColumns: '1fr' }}>
        {/* Top 5 General */}
        <div className="card chart-container">
          <h3 className="chart-title">
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BookOpen size={18} color="var(--rea-naranja-intenso)" />
              Top Docentes del Departamento
            </span>
          </h3>
          <p className="dashboard-subtitle" style={{ fontSize: '0.8rem', marginBottom: '1rem', marginTop: '-0.5rem' }}>
            Mejores profesores evaluados en <strong>{daName}</strong> con participación ≥ 55%
          </p>

          {top5Docentes.length === 0 ? (
            <div className="flex-center" style={{ height: '140px', color: 'var(--text-muted)' }}>
              No hay docentes con secciones representativas para el período seleccionado
            </div>
          ) : (
            <div className="ranking-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem' }}>
              {top5Docentes.map((prof, idx) => (
                <div 
                  className="ranking-item" 
                  key={prof.name}
                  onClick={() => onSelectProfessor?.(prof.name)}
                  style={{ cursor: onSelectProfessor ? 'pointer' : 'default' }}
                  title="Clic para ver ficha de Desempeño Docente"
                >
                  <div className={`ranking-position ${MEDAL_CLASSES[idx] || 'normal'}`}>{idx + 1}</div>
                  <div className="ranking-name">
                    {prof.name}
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                      {prof.sections} {prof.sections === 1 ? 'sección válida' : 'secciones válidas'}
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

      {/* ═══ Dispersión: Frecuencia de Secciones Válidas vs Puntaje Promedio ═══ */}
      <ProfessorsScatterPlot 
        data={allDaData && allDaData.length > 0 ? allDaData : data} 
        daName={daName} 
        onSelectProfessor={onSelectProfessor}
      />

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
            Docentes con puntaje por debajo del promedio institucional {daAvg.toFixed(2)}, ordenados de mayor a menor diferencia
          </p>
          <div className="ranking-list">
            {belowAvg.map((prof, idx) => {
              const tier = getTier(prof.score);
              const delta = prof.score - daAvg;
              return (
                <div 
                  className="ranking-item" 
                  key={prof.name}
                  onClick={() => onSelectProfessor?.(prof.name)}
                  style={{ cursor: onSelectProfessor ? 'pointer' : 'default' }}
                  title="Clic para ver ficha de Desempeño Docente"
                >
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
                        {prof.sections} {prof.sections === 1 ? 'sección válida' : 'secciones válidas'}
                      </span>
                    </div>
                  </div>
                  <div className="ranking-bar-bg">
                    <div className="ranking-bar-fill" style={{
                      width: `${(prof.score / 5) * 100}%`,
                      background: `linear-gradient(90deg, ${tier.color}99, ${tier.color})`
                    }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: '85px' }}>
                    <span className="ranking-score" style={{ color: tier.color }}>{prof.score.toFixed(2)}</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--rea-naranja-intenso)', fontWeight: 600 }} title="Diferencia con el promedio">
                      Δ {delta.toFixed(2)}
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
