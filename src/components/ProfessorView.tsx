import { useState, useMemo, useEffect } from 'react';
import type { SurveyRecord } from '../services/googleSheets';
import { mean } from '../utils/statistics';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, CartesianGrid, XAxis, YAxis, Bar, Cell, ReferenceLine } from 'recharts';
import { AlertTriangle, User, Filter, MessageSquare, BookOpen } from 'lucide-react';
import SearchBar from './SearchBar';

interface Props {
  data: SurveyRecord[];
  availableCiclos: string[];
  initialProfessor?: string;
  activeCiclo?: string;
}

const ProfessorView: React.FC<Props> = ({ data, availableCiclos, initialProfessor, activeCiclo }) => {
  const isHistorical = activeCiclo === 'Histórico';

  // Solo consideramos secciones con al menos 1 respuesta registrada (>0% cobertura)
  // Las secciones con 0% no se muestran ya que no cuentan con datos evaluables
  const evaluableData = useMemo(() => {
    return data.filter(d => d.responses > 0);
  }, [data]);

  const professors = useMemo(() => {
    const list = Array.from(new Set(evaluableData.map(d => d.professor))).sort();
    // Si viene un initialProfessor seleccionado (p. ej. desde la gráfica de dificultad de cobertura en Vista General),
    // lo mantenemos accesible para que la selección no se pierda aunque en este ciclo sus salones tengan 0%
    if (initialProfessor && !list.includes(initialProfessor) && data.some(d => d.professor === initialProfessor)) {
      list.push(initialProfessor);
      list.sort();
    }
    return list;
  }, [evaluableData, data, initialProfessor]);

  const [selectedProf, setSelectedProf] = useState<string>(
    initialProfessor && (professors.includes(initialProfessor) || data.some(d => d.professor === initialProfessor))
      ? initialProfessor
      : (professors[0] || '')
  );
  const [selectedSection, setSelectedSection] = useState<string>('Todas las secciones');
  const [selectedCommentCourse, setSelectedCommentCourse] = useState<string>('ALL');
  const [selectedCommentSection, setSelectedCommentSection] = useState<string>('ALL');

  // Sync selected professor when initialProfessor prop changes
  useEffect(() => {
    if (initialProfessor && (professors.includes(initialProfessor) || data.some(d => d.professor === initialProfessor))) {
      setSelectedProf(initialProfessor);
    }
  }, [initialProfessor, professors, data]);

  const activeProf = (professors.includes(selectedProf) ? selectedProf : professors[0]) || '';

  // Reset section and comment filters when professor changes
  useEffect(() => {
    setSelectedSection('Todas las secciones');
    setSelectedCommentCourse('ALL');
    setSelectedCommentSection('ALL');
  }, [activeProf]);

  const allProfData = useMemo(() => {
    // Solo mostramos cursos y secciones del docente que tengan al menos 1 respuesta (>0%)
    return data.filter(d => d.professor === activeProf && d.responses > 0);
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
        ? `${entry.courseCode} — ${cleanSection} • ${entry.ciclo}`
        : `${entry.courseCode} — ${cleanSection}`;
      return {
        ...entry,
        chartLabel,
        cleanSection
      };
    });
  }, [tableData, isHistorical]);

  // ═══ Comentarios de Estudiantes con Filtros por Curso y Sección ═══
  interface CommentItem {
    id: string;
    text: string;
    courseName: string;
    section: string;
    cleanSection: string;
    ciclo?: string;
    isValid: boolean;
  }

  const allComments = useMemo<CommentItem[]>(() => {
    const visibleData = allProfData.filter(d => availableCiclos.includes(d.ciclo || ''));
    const list: CommentItem[] = [];
    const seen = new Set<string>();

    visibleData.forEach((d, dIdx) => {
      const rawComms = d.comentarios || [];
      const cleanSec = d.section.replace(/[[\]()]/g, '').trim().split(' ')[0] || d.section;

      rawComms.forEach((text, i) => {
        const trimmed = text.trim();
        if (!trimmed) return;
        const key = `${d.courseName}|${cleanSec}|${d.ciclo || ''}|${trimmed}`;
        if (!seen.has(key)) {
          seen.add(key);
          list.push({
            id: `${d.courseCode || d.courseName}-${d.ciclo || ''}-${cleanSec}-${dIdx}-${i}`,
            text: trimmed,
            courseName: d.courseName,
            section: d.section,
            cleanSection: cleanSec,
            ciclo: d.ciclo,
            isValid: d.isValid
          });
        }
      });
    });

    return list;
  }, [allProfData, availableCiclos]);

  // Cursos del docente en el período visible
  const commentCourses = useMemo(() => {
    const visibleData = allProfData.filter(d => availableCiclos.includes(d.ciclo || ''));
    return Array.from(new Set(visibleData.map(d => d.courseName))).sort();
  }, [allProfData, availableCiclos]);

  // Secciones disponibles para el curso seleccionado (o todas si está en 'ALL')
  const availableCommentSections = useMemo(() => {
    const visibleData = allProfData.filter(d => availableCiclos.includes(d.ciclo || ''));
    const relevantRecords = selectedCommentCourse === 'ALL'
      ? visibleData
      : visibleData.filter(d => d.courseName === selectedCommentCourse);

    const sectionCounts = new Map<string, number>();
    let totalCount = 0;

    relevantRecords.forEach(d => {
      const commCount = (d.comentarios || []).length;
      const cleanSec = d.section.replace(/[[\]()]/g, '').trim().split(' ')[0] || d.section;
      sectionCounts.set(cleanSec, (sectionCounts.get(cleanSec) || 0) + commCount);
      totalCount += commCount;
    });

    const list = Array.from(sectionCounts.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([sec, count]) => ({
        key: sec,
        label: `Sección ${sec}`,
        count
      }));

    return [
      { key: 'ALL', label: 'Todas las secciones', count: totalCount },
      ...list
    ];
  }, [allProfData, availableCiclos, selectedCommentCourse]);

  // Comentarios filtrados según curso y sección elegidos
  const filteredComments = useMemo(() => {
    return allComments.filter(item => {
      if (selectedCommentCourse !== 'ALL' && item.courseName !== selectedCommentCourse) {
        return false;
      }
      if (selectedCommentSection !== 'ALL' && item.cleanSection !== selectedCommentSection) {
        return false;
      }
      return true;
    });
  }, [allComments, selectedCommentCourse, selectedCommentSection]);

  const getCourseCommentCount = (course: string) => {
    return allComments.filter(c => c.courseName === course).length;
  };

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

      {allProfData.length === 0 ? (
        <div className="card mt-4" style={{ padding: '3.5rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <AlertTriangle size={48} color="var(--rea-goldenrod)" style={{ marginBottom: '1rem', opacity: 0.85 }} />
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.6rem', color: 'var(--text-primary)' }}>
            Sin Evaluaciones Registradas en {activeCiclo || 'este período'}
          </h3>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '580px', lineHeight: 1.6, fontSize: '0.9rem', marginBottom: '1rem' }}>
            El docente <strong>{activeProf}</strong> tiene cursos asignados en el ciclo <strong>{activeCiclo}</strong>, pero ninguna sección obtuvo respuestas de los estudiantes (0% de participación).
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', maxWidth: '540px' }}>
            Estos salones se contabilizan en el reporte macro de cobertura en la <strong>Vista General</strong>. Para consultar períodos anteriores con participación registrada, seleccione <strong>Histórico</strong> en el selector de período.
          </p>
        </div>
      ) : (
        <>
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
              {tableData.sort((a,b) => a.courseCode.localeCompare(b.courseCode)).map((row, idx) => {
                const rowClass = !row.isValid 
                  ? 'row-invalid' 
                  : row.isOutlier 
                  ? 'row-outlier' 
                  : 'row-valid';
                return (
                  <tr key={idx} className={rowClass}>
                    <td style={{ fontWeight: 600 }}>{row.section.replace(/[[\]()]/g, '').trim()}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{row.courseName} <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>{row.courseCode}</span></td>
                    <td style={{ color: row.isValid ? 'inherit' : 'var(--rea-naranja)' }}>
                      {Math.round(row.coverage * 100)}%
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
                );
              })}
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
                    fill={!entry.isValid ? '#cbd5e1' : (entry.isOutlier ? 'var(--rea-naranja-intenso)' : 'var(--rea-turquesa)')} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', marginTop: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
          <div className="flex-center" style={{ gap: '0.5rem' }}>
            <div style={{ width: 12, height: 12, backgroundColor: 'var(--rea-turquesa)', borderRadius: 3 }}></div> Consistente
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

      {/* Sección de Comentarios con Filtros por Curso y Sección */}
      <div className="card mt-4">
        <div className="flex-between" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
          <div>
            <h3 className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <MessageSquare size={20} color="var(--primary)" />
              Comentarios de Estudiantes
              <span className="badge badge-primary" style={{ fontSize: '0.75rem', marginLeft: '0.25rem' }}>
                {filteredComments.length} {filteredComments.length === 1 ? 'comentario' : 'comentarios'}
              </span>
            </h3>
            <p className="dashboard-subtitle" style={{ fontSize: '0.82rem', margin: 0 }}>
              Retroalimentación cualitativa recopilada en las encuestas de opinión estudiantil
            </p>
          </div>
        </div>

        {/* Pestañas de Cursos y Filtro de Secciones */}
        {commentCourses.length > 0 && (
          <div style={{ marginBottom: '1.25rem' }}>
            {/* Pestañas de Cursos */}
            <div
              style={{
                display: 'flex',
                gap: '0.5rem',
                flexWrap: 'wrap',
                alignItems: 'center',
                paddingBottom: '0.75rem',
                borderBottom: '1px solid var(--border-color)'
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setSelectedCommentCourse('ALL');
                  setSelectedCommentSection('ALL');
                }}
                style={{
                  padding: '0.4rem 0.85rem',
                  borderRadius: 'var(--radius-full)',
                  border: selectedCommentCourse === 'ALL' ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                  backgroundColor: selectedCommentCourse === 'ALL' ? 'var(--primary)' : 'var(--bg-color)',
                  color: selectedCommentCourse === 'ALL' ? '#ffffff' : 'var(--text-secondary)',
                  fontSize: '0.82rem',
                  fontWeight: selectedCommentCourse === 'ALL' ? 600 : 500,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>Todos los cursos</span>
                <span
                  style={{
                    fontSize: '0.7rem',
                    padding: '2px 7px',
                    borderRadius: '999px',
                    backgroundColor: selectedCommentCourse === 'ALL' ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.06)',
                    color: selectedCommentCourse === 'ALL' ? '#ffffff' : 'var(--text-muted)'
                  }}
                >
                  {allComments.length}
                </span>
              </button>

              {commentCourses.map(course => {
                const count = getCourseCommentCount(course);
                const isSelected = selectedCommentCourse === course;
                return (
                  <button
                    key={course}
                    type="button"
                    onClick={() => {
                      setSelectedCommentCourse(course);
                      setSelectedCommentSection('ALL');
                    }}
                    style={{
                      padding: '0.4rem 0.85rem',
                      borderRadius: 'var(--radius-full)',
                      border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                      backgroundColor: isSelected ? 'var(--primary)' : 'var(--bg-color)',
                      color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                      fontSize: '0.82rem',
                      fontWeight: isSelected ? 600 : 500,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <BookOpen size={14} style={{ opacity: isSelected ? 0.9 : 0.6 }} />
                    <span>{course}</span>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        padding: '2px 7px',
                        borderRadius: '999px',
                        backgroundColor: isSelected ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.06)',
                        color: isSelected ? '#ffffff' : 'var(--text-muted)'
                      }}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Sub-filtro de Secciones (cuando hay opciones de sección) */}
            {availableCommentSections.length > 1 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  flexWrap: 'wrap',
                  marginTop: '0.75rem',
                  paddingLeft: '0.25rem'
                }}
              >
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, marginRight: '0.25rem' }}>
                  Sección:
                </span>
                {availableCommentSections.map(sec => {
                  const isSelected = selectedCommentSection === sec.key;
                  return (
                    <button
                      key={sec.key}
                      type="button"
                      onClick={() => setSelectedCommentSection(sec.key)}
                      style={{
                        padding: '0.25rem 0.65rem',
                        borderRadius: 'var(--radius-md)',
                        border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                        backgroundColor: isSelected ? 'rgba(32, 78, 207, 0.10)' : 'var(--surface-color)',
                        color: isSelected ? 'var(--primary)' : 'var(--text-secondary)',
                        fontSize: '0.76rem',
                        fontWeight: isSelected ? 600 : 500,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <span>{sec.label}</span>
                      <span style={{ fontSize: '0.68rem', opacity: 0.75 }}>({sec.count})</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Lista de Comentarios */}
        <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filteredComments.length > 0 ? (
            filteredComments.map((item) => (
              <div
                key={item.id}
                style={{
                  padding: '1rem 1.15rem',
                  backgroundColor: 'var(--bg-color)',
                  borderRadius: 'var(--radius-md)',
                  borderLeft: '4px solid var(--primary)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem'
                }}
              >
                <div style={{ color: 'var(--text-primary)', fontSize: '0.88rem', lineHeight: 1.55, fontStyle: 'italic' }}>
                  "{item.text}"
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', fontSize: '0.72rem', marginTop: '0.25rem' }}>
                  <span
                    className="badge badge-primary"
                    style={{ fontSize: '0.7rem', padding: '0.15rem 0.55rem' }}
                  >
                    {item.courseName}
                  </span>
                  <span
                    style={{
                      padding: '0.15rem 0.55rem',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: 'rgba(0, 0, 0, 0.05)',
                      color: 'var(--text-secondary)',
                      fontWeight: 600,
                      fontSize: '0.7rem'
                    }}
                  >
                    Sección {item.cleanSection}
                  </span>
                  {item.ciclo && (
                    <span style={{ color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.72rem' }}>
                      Ciclo {item.ciclo}
                    </span>
                  )}
                  {!item.isValid && (
                    <span className="badge badge-warning" style={{ fontSize: '0.68rem', padding: '0.1rem 0.45rem' }}>
                      Baja Cobertura
                    </span>
                  )}
                </div>
              </div>
            ))
          ) : allComments.length > 0 ? (
            <div
              style={{
                padding: '2.5rem 1rem',
                color: 'var(--text-muted)',
                textAlign: 'center',
                backgroundColor: 'var(--bg-color)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <MessageSquare size={32} style={{ opacity: 0.35, marginBottom: '0.25rem' }} />
              <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                No hay comentarios para la selección actual
              </div>
              <div style={{ fontSize: '0.8rem' }}>
                No se registraron comentarios en {selectedCommentCourse !== 'ALL' ? selectedCommentCourse : 'este filtro'} {selectedCommentSection !== 'ALL' ? `(Sección ${selectedCommentSection})` : ''}.
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedCommentCourse('ALL');
                  setSelectedCommentSection('ALL');
                }}
                style={{
                  marginTop: '0.5rem',
                  padding: '0.35rem 0.9rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--primary)',
                  backgroundColor: 'transparent',
                  color: 'var(--primary)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Ver todos los comentarios ({allComments.length})
              </button>
            </div>
          ) : (
            <div
              style={{
                padding: '2.5rem 1rem',
                color: 'var(--text-muted)',
                textAlign: 'center',
                backgroundColor: 'var(--bg-color)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <MessageSquare size={32} style={{ opacity: 0.35, marginBottom: '0.25rem' }} />
              <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                Sin comentarios disponibles
              </div>
              <div style={{ fontSize: '0.8rem' }}>
                No hay comentarios de estudiantes registrados para este docente en el período seleccionado.
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )}
</div>
  );
};

export default ProfessorView;
