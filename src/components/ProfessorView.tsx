import { useState, useMemo, useEffect } from 'react';
import type { SurveyRecord } from '../services/googleSheets';
import { mean, detectOutliers } from '../utils/statistics';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, CartesianGrid, XAxis, YAxis, Bar, Cell } from 'recharts';
import { AlertTriangle, User, Filter } from 'lucide-react';
import SearchBar from './SearchBar';

interface Props {
  data: SurveyRecord[];
}

const ProfessorView: React.FC<Props> = ({ data }) => {
  const professors = Array.from(new Set(data.map(d => d.professor))).sort();
  const [selectedProf, setSelectedProf] = useState<string>(professors[0] || '');
  const [selectedSection, setSelectedSection] = useState<string>('Todas las secciones');

  const activeProf = (professors.includes(selectedProf) ? selectedProf : professors[0]) || '';

  // Reset section filter when professor changes
  useEffect(() => {
    setSelectedSection('Todas las secciones');
  }, [activeProf]);

  const allProfData = useMemo(() => {
    return data.filter(d => d.professor === activeProf);
  }, [data, activeProf]);

  const availableSections = useMemo(() => {
    return ['Todas las secciones', ...Array.from(new Set(allProfData.map(d => d.courseCode))).sort()];
  }, [allProfData]);

  const profData = useMemo(() => {
    if (selectedSection === 'Todas las secciones') return allProfData;
    return allProfData.filter(d => d.courseCode === selectedSection);
  }, [allProfData, selectedSection]);

  const validProfData = useMemo(() => {
    return profData;
  }, [profData]);

  // Cálculos estadísticos (solo válidos)
  const profScore = validProfData.length > 0 ? mean(validProfData.map(d => d.puntajeProfesor)) : 0;
  const motivScore = validProfData.length > 0 ? mean(validProfData.map(d => d.docenteMotiv)) : 0;
  const evalScore = validProfData.length > 0 ? mean(validProfData.map(d => d.docenteEval)) : 0;
  const puntScore = validProfData.length > 0 ? mean(validProfData.map(d => d.docentePunt)) : 0;
  const comScore = validProfData.length > 0 ? mean(validProfData.map(d => d.docenteCom)) : 0;

  const radarData = [
    { subject: 'Motivación', A: motivScore, fullMark: 5 },
    { subject: 'Evaluaciones', A: evalScore, fullMark: 5 },
    { subject: 'Puntualidad', A: puntScore, fullMark: 5 },
    { subject: 'Comunicación', A: comScore, fullMark: 5 },
  ];

  // Detección de Valores Atípicos (evaluado sobre TODAS las secciones del profe para no perder el contexto del Z-score)
  const validScoresGlobal = allProfData.map(d => d.puntajeProfesor);
  const outlierFlagsGlobal = detectOutliers(validScoresGlobal);
  const validDataWithOutliersGlobal = allProfData.map((d, i) => ({
    ...d,
    isOutlier: outlierFlagsGlobal[i]
  }));
  
  // Filter the table data based on selection
  let tableData = [...validDataWithOutliersGlobal];
  if (selectedSection !== 'Todas las secciones') {
    tableData = tableData.filter(d => d.courseCode === selectedSection);
  }

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
          <div className="stat-title">Puntaje Docente General</div>
          <div className="stat-value text-gradient" style={{ fontSize: '4.5rem', margin: '1rem 0', lineHeight: 1 }}>
            {profScore.toFixed(2)}
          </div>
          <div className="badge badge-primary">Promedio sobre 5.0</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '1rem' }}>
            {validProfData.length} {validProfData.length === 1 ? 'sección válida' : 'secciones válidas'} {selectedSection !== 'Todas las secciones' ? 'en esta vista' : ''}
          </div>
        </div>
        
        <div className="card chart-container">
          <h3 className="chart-title" style={{ fontSize: '1.05rem', marginBottom: '0.5rem' }}>Desglose por Dimensiones</h3>
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
        </div>
      </div>

      <div className="card mt-4">
        <h3 className="chart-title">Análisis de Secciones y Detección de Anomalías</h3>
        <p className="text-muted" style={{ marginBottom: '1.5rem', fontSize: '0.85rem' }}>
          Se resaltan en <span style={{ color: 'var(--danger-dark)', fontWeight: 600 }}>rojo</span> aquellas secciones donde el puntaje del docente difiere estadísticamente (Z-Score / MAD) de su promedio habitual. Las filas opacas indican participación menor al 50%.
        </p>

        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Sección</th>
                <th>Curso</th>
                <th>Matriculados</th>
                <th>Respuestas</th>
                <th>Participación</th>
                <th>Puntaje Docente</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {tableData.sort((a,b) => a.courseCode.localeCompare(b.courseCode)).map((row, idx) => (
                <tr key={idx} className={`${row.isOutlier ? 'row-outlier' : ''} ${!row.isValid ? 'row-invalid' : ''}`}>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{row.section}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{row.courseName} <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>({row.courseCode})</span></td>
                  <td>{row.enrolled}</td>
                  <td>{row.responses}</td>
                  <td>
                    {(row.coverage * 100).toFixed(1)}%
                    {!row.isValid && <span className="badge badge-warning" style={{ marginLeft: '0.5rem' }}>Baja Cobertura</span>}
                  </td>
                  <td style={{ 
                    fontWeight: 700, 
                    color: row.isOutlier ? 'var(--danger-dark)' : (row.isValid ? 'var(--primary)' : 'inherit'),
                    fontSize: '1.05rem'
                  }}>
                    {row.puntajeProfesor.toFixed(2)}
                  </td>
                  <td>
                    {row.isOutlier && (
                      <div className="badge badge-danger" style={{ display: 'flex', gap: '4px' }}>
                        <AlertTriangle size={12} /> Valor Atípico
                      </div>
                    )}
                    {!row.isOutlier && row.isValid && (
                      <div className="badge badge-success">Normal</div>
                    )}
                    {!row.isValid && (
                      <div className="badge badge-warning" title="Excluido del cálculo general">Excluido</div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Visualización en gráfico de barras de las secciones */}
      <div className="card mt-4">
        <h3 className="chart-title">Distribución de Puntaje Docente por Sección</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={tableData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
            <XAxis dataKey="courseCode" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
            <YAxis domain={[0, 5]} tick={{ fill: 'var(--text-secondary)' }} />
            <RechartsTooltip 
              cursor={{ fill: 'rgba(0,0,0,0.03)' }}
              contentStyle={{ borderRadius: '8px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-md)' }}
              formatter={(value: any, name: any) => {
                const val = typeof value === 'number' ? value : 0;
                if (name === "puntajeProfesor") return [val.toFixed(2), "Puntaje Docente"];
                return [val, name];
              }}
            />
            <Bar dataKey="puntajeProfesor" radius={[4, 4, 0, 0]}>
              {tableData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={!entry.isValid ? 'var(--border-color)' : (entry.isOutlier ? 'var(--rea-naranja-intenso)' : 'var(--rea-azul-pastel)')} 
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', marginTop: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          <div className="flex-center" style={{ gap: '0.5rem' }}>
            <div style={{ width: 12, height: 12, backgroundColor: 'var(--rea-azul-pastel)', borderRadius: 3 }}></div> Normal
          </div>
          <div className="flex-center legend-item" style={{ gap: '0.5rem' }}>
            <div style={{ width: 12, height: 12, backgroundColor: 'var(--rea-naranja-intenso)', borderRadius: 3 }}></div> Atípico
            <div className="legend-tooltip">Fuera del rango de promedio estimado, prestar atención</div>
          </div>
          <div className="flex-center legend-item" style={{ gap: '0.5rem' }}>
            <div style={{ width: 12, height: 12, backgroundColor: 'var(--border-color)', borderRadius: 3 }}></div> Baja Cobertura
            <div className="legend-tooltip">EP por debajo del 60%</div>
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
