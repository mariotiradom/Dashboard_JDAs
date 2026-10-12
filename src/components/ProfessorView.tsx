import { useState, useMemo, useEffect } from 'react';
import type { SurveyRecord } from '../services/googleSheets';
import { mean } from '../utils/statistics';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, CartesianGrid, XAxis, YAxis, Bar, Cell, ReferenceLine } from 'recharts';
import { AlertTriangle, User, Filter } from 'lucide-react';
import SearchBar from './SearchBar';

interface Props {
  data: SurveyRecord[];
  availableCiclos: string[];
  initialProfessor?: string;
  activeCiclo?: string;
}

const ProfessorView: React.FC<Props> = ({ data, availableCiclos, initialProfessor, activeCiclo }) => {
  const isHistorical = activeCiclo === 'Histórico';
  const professors = Array.from(new Set(data.map(d => d.professor))).sort();
  const [selectedProf, setSelectedProf] = useState<string>(
    initialProfessor && professors.includes(initialProfessor) ? initialProfessor : (professors[0] || '')
  );
  const [selectedSection, setSelectedSection] = useState<string>('Todas las secciones');

  // Sync selected professor when initialProfessor prop changes
  useEffect(() => {
    if (initialProfessor && professors.includes(initialProfessor)) {
      setSelectedProf(initialProfessor);
    }
  }, [initialProfessor, professors]);

  const activeProf = (professors.includes(selectedProf) ? selectedProf : professors[0]) || '';

  // Reset section filter when professor changes
  useEffect(() => {
    setSelectedSection('Todas las secciones');
  }, [activeProf]);

  const allProfData = useMemo(() => {
    return data.filter(d => d.professor === activeProf);
  }, [data, activeProf]);

  const availableSections = useMemo(() => {
    const visibleData = allProfData.filter(d => availableCiclos.includes(d.ciclo || ''));
    return ['Todas las secciones', ...Array.from(new Set(visibleData.map(d => d.courseCode))).sort()];
  }, [allProfData, availableCiclos]);

  const profData = useMemo(() => {
    if (selectedSection === 'Todas las secciones') return allProfData;
    return allProfData.filter(d => d.courseCode === selectedSection);
  }, [allProfData, selectedSection]);

  // Secciones estrictamente válidas (>= 55% de participación para asegurar representatividad estadística)
  const validProfData = useMemo(() => {
    return profData.filter(d => d.isValid);
  }, [profData]);

  const hasValidData = validProfData.length > 0;

  // Cálculos estadísticos (únicamente secciones que superan el umbral del 55%)
  const profScore = hasValidData ? mean(validProfData.map(d => d.puntajeProfesor)) : null;
  const ayudaScore = hasValidData ? mean(validProfData.map(d => d.docenteAyuda)) : 0;
  const motivScore = hasValidData ? mean(validProfData.map(d => d.docenteMotiv)) : 0;
  const retroScore = hasValidData ? mean(validProfData.map(d => d.docenteRetro)) : 0;
  const estimScore = hasValidData ? mean(validProfData.map(d => d.docenteEstim)) : 0;
  const interesScore = hasValidData ? mean(validProfData.map(d => d.docenteInteres)) : 0;
  const respetoScore = hasValidData ? mean(validProfData.map(d => d.docenteRespeto)) : 0;

  const radarData = [
    { subject: 'Ayuda', A: ayudaScore, fullMark: 5 },
    { subject: 'Motivación', A: motivScore, fullMark: 5 },
    { subject: 'Retroalimentación', A: retroScore, fullMark: 5 },
    { subject: 'Estimulación', A: estimScore, fullMark: 5 },
    { subject: 'Interés', A: interesScore, fullMark: 5 },
    { subject: 'Respeto', A: respetoScore, fullMark: 5 },
  ];

  // Filter the table data based on selection
  let tableData = [...allProfData].filter(d => availableCiclos.includes(d.ciclo || ''));
  if (selectedSection !== 'Todas las secciones') {
    tableData = tableData.filter(d => d.courseCode === selectedSection);
  }

  // Preparar datos para el gráfico de barras horizontales con etiquetas limpias de Curso y Sección
  const chartData = useMemo(() => {
    return tableData.map(entry => {
      const cleanSection = entry.section.replace(/[[\]()]/g, '').trim().split(' ')[0] || entry.section;
      const chartLabel = isHistorical
        ? `${entry.courseCode} Sec. ${cleanSection} • ${entry.ciclo}`
        : `${entry.courseCode} Sec. ${cleanSection}`;
      return {
        ...entry,
        chartLabel,
        cleanSection
      };
    });
  }, [tableData, isHistorical]);

  if (!activeProf) {
    return <div>No hay docentes disponibles en este departamento.</div>;
  }

  return (
    <div className="animate-fade-in">
      <div className="dashboard-header flex-between" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 className="dashboard-title">Desempeño Docente</h2>
          <p className="dashboard-subtitle">Análisis detallado por profesor y detección de desviaciones</p>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ width: '350px' }}>
            <SearchBar 
              items={professors} 
              value={activeProf} 
              onChange={setSelectedProf} 
              placeholder="Buscar docente..."
              icon={<User size={18} />}
            />
          </div>
          {availableSections.length > 2 && (
            <div style={{ width: '250px' }}>
              <SearchBar 
                items={availableSections} 
                value={selectedSection} 
                onChange={setSelectedSection} 
                placeholder="Filtrar sección..."
                icon={<Filter size={18} />}
              />
            </div>
          )}
        </div>
      </div>

      <div className="stats-grid">
        <div className="card flex-center" style={{ flexDirection: 'column', textAlign: 'center', background: 'var(--surface-color)', borderTop: '4px solid var(--primary)' }}>
          <div className="stat-title">Puntaje Promedio Docente</div>
          {profScore !== null ? (
            <>
              <div className="stat-value text-gradient" style={{ fontSize: '4.5rem', margin: '1rem 0', lineHeight: 1 }}>
                {profScore.toFixed(2)}
              </div>
              <div className="badge badge-primary">Promedio sobre 5.0</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '1rem' }}>
                {validProfData.length} {validProfData.length === 1 ? 'sección válida' : 'secciones válidas'} {selectedSection !== 'Todas las secciones' ? 'en esta vista' : ''}
              </div>
            </>
          ) : (
            <div style={{ padding: '2rem 1rem' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>—</div>
              <div className="badge badge-warning" style={{ whiteSpace: 'normal', lineHeight: 1.3, padding: '6px 12px' }}>
                Sin secciones representativas
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.8rem' }}>
                No se muestra puntaje por falta de representatividad estadística.
              </div>
            </div>
          )}
        </div>
        
        <div className="card chart-container">
          <h3 className="chart-title" style={{ fontSize: '1.05rem', marginBottom: '0.5rem' }}>Desglose por Dimensiones</h3>
          {hasValidData ? (
            <ResponsiveContainer width="100%" height={260}>
              <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                <PolarGrid stroke="var(--border-color)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-secondary)', fontSize: 12, fontWeight: 500 }} />
                <PolarRadiusAxis angle={30} domain={[0, 5]} tick={{ fill: 'var(--text-muted)' }} />
                <Radar name={activeProf} dataKey="A" stroke="var(--primary)" strokeWidth={2} fill="var(--primary-light)" fillOpacity={0.4} />
                <RechartsTooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: 'var(--shadow-md)' }}
                  formatter={(value: any) => [typeof value === 'number' ? value.toFixed(2) : value, 'Puntaje']}
                />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex-center" style={{ height: '240px', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>
              No hay secciones con más del 55% de participación para calcular las dimensiones de este período.
            </div>
          )}
        </div>
      </div>

      <div className="card mt-4">
        <h3 className="chart-title">Análisis de Secciones y Detección de Desviaciones</h3>
        <p className="text-muted" style={{ marginBottom: '1.5rem', fontSize: '0.85rem' }}>
          El puntaje promedio docente se calcula únicamente con secciones que superan el umbral del 55% de participación. Se resaltan en <span style={{ color: 'var(--danger-dark)', fontWeight: 600 }}>rojo</span> aquellas secciones con <strong>desviación atípica</strong> respecto al histórico personal consolidado del docente. Las secciones con baja cobertura se muestran atenuadas en gris y se excluyen del promedio.
        </p>

        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead className="table-header">
              <tr>
                <th>SECCIÓN</th>
                <th>CURSO</th>
                <th>PARTICIPACIÓN</th>
                <th>PUNTAJE<br/>DOCENTE</th>
                <th>ESTADO</th>
              </tr>
            </thead>
            <tbody>
              {tableData.sort((a,b) => a.courseCode.localeCompare(b.courseCode)).map((row, idx) => (
                <tr key={idx} className={`${row.isOutlier && row.isValid ? 'row-outlier' : ''} ${!row.isValid ? 'row-invalid' : ''}`}>
                  <td style={{ fontWeight: 600 }}>{row.section.replace(/[[\]()]/g, '').trim()}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{row.courseName} <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>{row.courseCode}</span></td>
                  <td style={{ color: row.isValid ? 'inherit' : 'var(--rea-naranja)' }}>
                    {(row.coverage * 100).toFixed(1)}%
                    {!row.isValid && <span className="badge badge-warning" style={{ marginLeft: '0.5rem' }}>Baja Cobertura</span>}
                  </td>
                  <td style={{ 
                    fontWeight: 700, 
                    color: !row.isValid ? 'var(--text-muted)' : (row.isOutlier ? 'var(--danger-dark)' : 'var(--primary)'),
                    fontSize: '1.05rem'
                  }}>
                    {row.puntajeProfesor.toFixed(2)}
                  </td>
                  <td>
                    {!row.isValid ? (
                      <div className="badge badge-warning" title="Excluido del puntaje promedio por tener menos del 55% de participación">
                        Baja Cobertura
                      </div>
                    ) : row.isOutlier ? (
                      <div className="badge badge-danger" style={{ display: 'flex', gap: '4px' }} title="Difiere en más de 1.0 punto del promedio histórico personal del docente">
                        <AlertTriangle size={12} /> Desviación Atípica
                      </div>
                    ) : (
                      <div className="badge badge-success">Consistente</div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Visualización en gráfico de barras horizontales de las secciones */}
      <div className="card mt-4">
        <h3 className="chart-title">Distribución de Puntaje Docente por Sección</h3>
        <p className="text-muted" style={{ fontSize: '0.82rem', marginBottom: '1rem', marginTop: '-0.3rem' }}>
          Comparación horizontal por curso y sección. Los valores en rojo indican secciones atípicas que divergen en más de 1 punto de su media histórica personal.
        </p>
        <div style={{ width: '100%', minHeight: '220px' }}>
          <ResponsiveContainer width="100%" height={Math.max(220, chartData.length * 48)}>
            <BarChart 
              layout="vertical" 
              data={chartData} 
              margin={{ top: 15, right: 35, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-color)" />
              <XAxis 
                type="number" 
                domain={[0, 5]} 
                ticks={[0, 1, 2, 3, 4, 5]} 
                tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} 
              />
              <YAxis 
                type="category" 
                dataKey="chartLabel" 
                width={isHistorical ? 175 : 130} 
                tick={{ fill: 'var(--text-primary)', fontSize: 12, fontWeight: 600 }} 
              />
              <RechartsTooltip 
                cursor={{ fill: 'rgba(32, 78, 207, 0.04)' }}
                contentStyle={{ borderRadius: '8px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-md)', fontSize: '0.82rem' }}
                formatter={(value: any, _name: any, item: any) => {
                  const val = typeof value === 'number' ? value.toFixed(2) : value;
                  const row = item?.payload;
                  const partText = row ? `${Math.round(row.coverage * 100)}% participación` : '';
                  const statusText = !row?.isValid ? 'Baja Cobertura' : (row?.isOutlier ? 'Desviación Atípica' : 'Consistente');
                  return [`${val} • ${partText} • ${statusText}`, 'Puntaje'];
                }}
              />
              {profScore !== null && (
                <ReferenceLine 
                  x={profScore} 
                  stroke="var(--primary)" 
                  strokeDasharray="4 4" 
                  strokeWidth={1.5} 
                  label={{ 
                    value: `Media Docente: ${profScore.toFixed(2)}`, 
                    position: 'top', 
                    fill: 'var(--primary)', 
                    fontSize: 11, 
                    fontWeight: 600 
                  }} 
                />
              )}
              <Bar dataKey="puntajeProfesor" radius={[0, 6, 6, 0]} barSize={22}>
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={!entry.isValid ? '#cbd5e1' : (entry.isOutlier ? 'var(--rea-naranja-intenso)' : 'var(--rea-azul-pastel)')} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', marginTop: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
          <div className="flex-center" style={{ gap: '0.5rem' }}>
            <div style={{ width: 12, height: 12, backgroundColor: 'var(--rea-azul-pastel)', borderRadius: 3 }}></div> Consistente
          </div>
          <div className="flex-center legend-item" style={{ gap: '0.5rem' }}>
            <div style={{ width: 12, height: 12, backgroundColor: 'var(--rea-naranja-intenso)', borderRadius: 3 }}></div> Desviación Atípica
            <div className="legend-tooltip">Difiere en más de 1.0 punto respecto a su promedio histórico consolidado</div>
          </div>
          <div className="flex-center legend-item" style={{ gap: '0.5rem' }}>
            <div style={{ width: 12, height: 12, backgroundColor: '#cbd5e1', borderRadius: 3 }}></div> Baja Cobertura
            <div className="legend-tooltip">Excluido del promedio docente por muestra no representativa</div>
          </div>
        </div>
      </div>

      {/* Sección de Comentarios */}
      <div className="card mt-4">
        <h3 className="chart-title">Comentarios de Estudiantes</h3>
        <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          {Array.from(new Set(profData.flatMap(d => d.comentarios || []))).length > 0 ? (
            Array.from(new Set(profData.flatMap(d => d.comentarios || []))).map((comentario, idx) => (
              <div key={idx} style={{ padding: '1rem', backgroundColor: 'var(--bg-color)', borderRadius: 'var(--radius-md)', borderLeft: '4px solid var(--primary-light)', color: 'var(--text-secondary)' }}>
                "{comentario}"
              </div>
            ))
          ) : (
            <div style={{ padding: '1rem', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center' }}>
              No hay comentarios disponibles para este docente.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfessorView;
