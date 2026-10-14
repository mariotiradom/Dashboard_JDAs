import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Cell,
  LabelList
} from 'recharts';
import { AlertCircle, Info, ChevronDown, Search, X } from 'lucide-react';
import type { SurveyRecord } from '../services/googleSheets';

interface Props {
  data: SurveyRecord[];
  daName: string;
  onSelectProfessor?: (profName: string) => void;
}

export interface ProfessorDifficultyItem {
  professor: string;
  totalSecciones: number;
  seccionesNoValidas: number; // Cobertura < 55% o 0 respuestas
  seccionesValidas: number;   // Cobertura >= 55%
  ratioNoLlegaron: number;    // seccionesNoValidas / totalSecciones (0 a 1)
  porcentajeNoLlegaron: number; // 0 a 100
  cursos: string[];
  nivel: 'critica' | 'media' | 'baja';
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
}

const CustomDifficultyTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;
  const item: ProfessorDifficultyItem = payload[0].payload;

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        padding: '10px 14px',
        boxShadow: 'var(--shadow-md)',
        border: '1px solid var(--border-color)',
        fontSize: '0.82rem',
        color: 'var(--text-primary)',
        minWidth: '240px'
      }}
    >
      <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '4px' }}>
        {item.professor}
      </div>
      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '6px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
        <div>
          <strong>Salones que no llegaron a la meta:</strong>{' '}
          <span style={{ color: 'var(--rea-naranja-intenso)', fontWeight: 700 }}>
            {item.seccionesNoValidas} de {item.totalSecciones} ({item.porcentajeNoLlegaron.toFixed(0)}%)
          </span>
        </div>
        <div>
          <strong>Salones que sí llegaron (≥ 55%):</strong> {item.seccionesValidas}
        </div>
        <div>
          <strong>Cursos a cargo:</strong> <span style={{ color: 'var(--text-muted)' }}>{item.cursos.join(', ')}</span>
        </div>
        <div style={{ fontSize: '0.72rem', color: 'var(--primary)', marginTop: '4px', fontStyle: 'italic' }}>
          Clic para ver ficha del docente →
        </div>
      </div>
    </div>
  );
};

export const ProfessorCoverageDifficultyChart: React.FC<Props> = ({
  data,
  daName: _daName,
  onSelectProfessor
}) => {
  // Pestaña de severidad seleccionada
  const [activeSeverity, setActiveSeverity] = useState<'todos' | 'critica' | 'media' | 'baja'>('todos');
  // Modal de profundización / vista completa
  const [showFullModal, setShowFullModal] = useState(false);
  const [modalSearch, setModalSearch] = useState('');

  // ═══ Calcular ratio por docente: salones con cobertura < 55% sobre total ═══
  const { difficultyData, totalSalonesDep, salonesNoLlegaronDep } = useMemo(() => {
    const profMap = new Map<string, { total: number; invalid: number; valid: number; cursos: Set<string> }>();
    let totalSalones = 0;
    let totalInvalidos = 0;

    data.forEach(d => {
      totalSalones += 1;
      const isInvalid = !d.isValid || (d.responses === 0);
      if (isInvalid) totalInvalidos += 1;

      if (!profMap.has(d.professor)) {
        profMap.set(d.professor, { total: 0, invalid: 0, valid: 0, cursos: new Set() });
      }
      const entry = profMap.get(d.professor)!;
      entry.total += 1;
      if (isInvalid) {
        entry.invalid += 1;
      } else {
        entry.valid += 1;
      }
      if (d.courseName) entry.cursos.add(d.courseName);
    });

    const list: ProfessorDifficultyItem[] = Array.from(profMap.entries())
      .map(([professor, stats]) => {
        const ratioNoLlegaron = stats.total > 0 ? stats.invalid / stats.total : 0;
        const porcentaje = ratioNoLlegaron * 100;
        let nivel: 'critica' | 'media' | 'baja' = 'baja';
        if (porcentaje >= 75) nivel = 'critica';
        else if (porcentaje >= 50) nivel = 'media';

        return {
          professor,
          totalSecciones: stats.total,
          seccionesNoValidas: stats.invalid,
          seccionesValidas: stats.valid,
          ratioNoLlegaron,
          porcentajeNoLlegaron: porcentaje,
          cursos: Array.from(stats.cursos),
          nivel
        };
      })
      .filter(item => item.seccionesNoValidas > 0)
      .sort((a, b) => {
        if (b.ratioNoLlegaron !== a.ratioNoLlegaron) {
          return b.ratioNoLlegaron - a.ratioNoLlegaron;
        }
        return b.seccionesNoValidas - a.seccionesNoValidas;
      });

    return {
      difficultyData: list,
      totalSalonesDep: totalSalones,
      salonesNoLlegaronDep: totalInvalidos
    };
  }, [data]);

  // Contadores por nivel
  const countCritica = useMemo(() => difficultyData.filter(d => d.nivel === 'critica').length, [difficultyData]);
  const countMedia = useMemo(() => difficultyData.filter(d => d.nivel === 'media').length, [difficultyData]);
  const countBaja = useMemo(() => difficultyData.filter(d => d.nivel === 'baja').length, [difficultyData]);

  // Filtrado según la pestaña activa
  const filteredBySeverity = useMemo(() => {
    if (activeSeverity === 'todos') return difficultyData;
    return difficultyData.filter(d => d.nivel === activeSeverity);
  }, [difficultyData, activeSeverity]);

  // Se muestran los primeros 8 para mantener la gráfica estilizada y evitar saturación
  const displayItems = useMemo(() => {
    return filteredBySeverity.slice(0, 8).map(item => ({
      ...item,
      displayLabel: `${item.porcentajeNoLlegaron.toFixed(0)}% (${item.seccionesNoValidas}/${item.totalSecciones})`
    }));
  }, [filteredBySeverity]);

  // Docentes filtrados en el modal de profundización
  const modalFilteredItems = useMemo(() => {
    let items = difficultyData;
    if (activeSeverity !== 'todos') {
      items = items.filter(d => d.nivel === activeSeverity);
    }
    if (!modalSearch.trim()) return items;
    const q = modalSearch.toLowerCase().trim();
    return items.filter(d => 
      d.professor.toLowerCase().includes(q) || 
      d.cursos.some(c => c.toLowerCase().includes(q))
    );
  }, [difficultyData, activeSeverity, modalSearch]);

  const porcentajeGlobalDep = totalSalonesDep > 0 ? (salonesNoLlegaronDep / totalSalonesDep) * 100 : 0;

  if (difficultyData.length === 0) {
    return (
      <div className="card mt-4">
        <h3 className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={20} color="var(--primary)" />
          Docentes con Dificultad para Alcanzar la Meta (≥ 55% Cobertura)
        </h3>
        <p className="dashboard-subtitle" style={{ fontSize: '0.85rem' }}>
          En este periodo, el 100% de las secciones del departamento alcanzaron la meta de representatividad (≥ 55% de participación).
        </p>
      </div>
    );
  }

  return (
    <div className="card mt-4" style={{ borderLeft: '4px solid var(--rea-naranja-intenso)' }}>
      {/* Encabezado con foco institucional en Salones del Departamento */}
      <div className="flex-between mb-3" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h3 className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <AlertCircle size={20} color="var(--rea-naranja-intenso)" />
            Dificultades de Convocatoria para Alcanzar la Meta (≥ 55%)
          </h3>
          <p className="dashboard-subtitle" style={{ fontSize: '0.82rem', margin: 0 }}>
            Proporción de salones que <strong>no alcanzaron el 55% de participación</strong> sobre el total asignado por docente
          </p>
        </div>

        {/* Resumen institucional no alarmista enfocado en Salones */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          <span
            style={{
              fontSize: '0.82rem',
              color: 'var(--text-secondary)',
              backgroundColor: 'var(--bg-secondary, #f8fafc)',
              padding: '5px 12px',
              borderRadius: '999px',
              border: '1px solid var(--border-color)',
              fontWeight: 600
            }}
          >
            Salones con baja cobertura: <strong style={{ color: 'var(--rea-naranja-intenso)' }}>{salonesNoLlegaronDep}</strong> de {totalSalonesDep} ({porcentajeGlobalDep.toFixed(0)}%)
          </span>
        </div>
      </div>

      {/* Tabs de Filtro Rápido por Severidad */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.75rem', marginBottom: '0.5rem' }}>
        <button
          onClick={() => setActiveSeverity('todos')}
          style={{
            padding: '5px 12px',
            borderRadius: '6px',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer',
            border: activeSeverity === 'todos' ? '1px solid var(--primary)' : '1px solid var(--border-color)',
            backgroundColor: activeSeverity === 'todos' ? 'var(--primary)' : 'var(--surface-color)',
            color: activeSeverity === 'todos' ? '#ffffff' : 'var(--text-secondary)',
            transition: 'all 0.2s ease'
          }}
        >
          Todos ({difficultyData.length})
        </button>
        <button
          onClick={() => setActiveSeverity('critica')}
          style={{
            padding: '5px 12px',
            borderRadius: '6px',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer',
            border: activeSeverity === 'critica' ? '1px solid var(--rea-naranja-intenso)' : '1px solid var(--border-color)',
            backgroundColor: activeSeverity === 'critica' ? 'var(--rea-naranja-intenso)' : 'var(--surface-color)',
            color: activeSeverity === 'critica' ? '#ffffff' : 'var(--text-secondary)',
            transition: 'all 0.2s ease'
          }}
        >
          Dificultad Crítica ≥ 75% ({countCritica})
        </button>
        <button
          onClick={() => setActiveSeverity('media')}
          style={{
            padding: '5px 12px',
            borderRadius: '6px',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer',
            border: activeSeverity === 'media' ? '1px solid var(--rea-goldenrod)' : '1px solid var(--border-color)',
            backgroundColor: activeSeverity === 'media' ? 'var(--rea-goldenrod)' : 'var(--surface-color)',
            color: activeSeverity === 'media' ? '#ffffff' : 'var(--text-secondary)',
            transition: 'all 0.2s ease'
          }}
        >
          Dificultad Media 50% - 74% ({countMedia})
        </button>
        {countBaja > 0 && (
          <button
            onClick={() => setActiveSeverity('baja')}
            style={{
              padding: '5px 12px',
              borderRadius: '6px',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              border: activeSeverity === 'baja' ? '1px solid #64748b' : '1px solid var(--border-color)',
              backgroundColor: activeSeverity === 'baja' ? '#64748b' : 'var(--surface-color)',
              color: activeSeverity === 'baja' ? '#ffffff' : 'var(--text-secondary)',
              transition: 'all 0.2s ease'
            }}
          >
            Dificultad Baja &lt; 50% ({countBaja})
          </button>
        )}
      </div>

      {/* Gráfico de Barras Horizontales Estilizado */}
      {displayItems.length === 0 ? (
        <div className="flex-center" style={{ height: '140px', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
          No hay docentes en este rango de dificultad para el período seleccionado.
        </div>
      ) : (
        <div style={{ width: '100%', minHeight: '220px', marginTop: '0.75rem' }}>
          <ResponsiveContainer width="100%" height={Math.max(220, displayItems.length * 42)}>
            <BarChart
              layout="vertical"
              data={displayItems}
              margin={{ top: 10, right: 90, left: 15, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-color)" />
              <XAxis
                type="number"
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
                tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                tickFormatter={(v) => `${v}%`}
              />
              <YAxis
                type="category"
                dataKey="professor"
                width={185}
                tick={{ fill: 'var(--text-primary)', fontSize: 12, fontWeight: 600 }}
              />
              <RechartsTooltip
                content={<CustomDifficultyTooltip />}
                cursor={{ fill: 'rgba(242, 103, 73, 0.04)' }}
              />
              <Bar
                dataKey="porcentajeNoLlegaron"
                radius={[0, 6, 6, 0]}
                barSize={18}
                style={{ cursor: onSelectProfessor ? 'pointer' : 'default' }}
                onClick={(entry: any) => {
                  if (entry && entry.professor) {
                    onSelectProfessor?.(entry.professor);
                  }
                }}
              >
                {displayItems.map((entry, index) => {
                  const fill = entry.nivel === 'critica'
                    ? 'var(--rea-naranja-intenso)'
                    : entry.nivel === 'media'
                    ? 'var(--rea-goldenrod)'
                    : '#94a3b8';
                  return <Cell key={`cell-${index}`} fill={fill} />;
                })}
                <LabelList
                  dataKey="displayLabel"
                  position="right"
                  style={{ fill: 'var(--text-primary)', fontSize: 11, fontWeight: 700 }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Botón para Profundizar / Ver todos */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          Mostrando {displayItems.length} de {filteredBySeverity.length} docentes en esta categoría
        </div>
        {filteredBySeverity.length > displayItems.length && (
          <button
            onClick={() => setShowFullModal(true)}
            style={{
              background: 'none',
              border: '1px solid var(--primary)',
              borderRadius: '6px',
              padding: '4px 12px',
              color: 'var(--primary)',
              fontWeight: 600,
              fontSize: '0.8rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
          >
            Ver listado completo ({filteredBySeverity.length}) <ChevronDown size={14} />
          </button>
        )}
      </div>

      {/* Leyenda y Explicación */}
      <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', marginTop: '0.8rem', fontSize: '0.8rem', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
        <div className="flex-center" style={{ gap: '0.4rem' }}>
          <div style={{ width: 12, height: 12, backgroundColor: 'var(--rea-naranja-intenso)', borderRadius: 3 }}></div> Dificultad Crítica (≥ 75%)
        </div>
        <div className="flex-center" style={{ gap: '0.4rem' }}>
          <div style={{ width: 12, height: 12, backgroundColor: 'var(--rea-goldenrod)', borderRadius: 3 }}></div> Dificultad Media (50% - 74%)
        </div>
        <div className="flex-center" style={{ gap: '0.4rem' }}>
          <div style={{ width: 12, height: 12, backgroundColor: '#94a3b8', borderRadius: 3 }}></div> Dificultad Baja (&lt; 50%)
        </div>
      </div>

      <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <Info size={14} color="var(--primary)" />
        <span>Se incluyen todos los salones asignados, incluso aquellos con 0 respuestas. Haz clic en una barra para ver la ficha del docente.</span>
      </div>

      {/* ═══ Modal de Profundización / Detalle Completo ═══ */}
      {showFullModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem'
          }}
          onClick={() => setShowFullModal(false)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              maxWidth: '850px',
              width: '100%',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: 'var(--shadow-xl, 0 20px 25px -5px rgba(0, 0, 0, 0.1))',
              overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  Detalle de Convocatoria Docente — Salones sin Meta
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
                  Listado completo ordenado por ratio de salones con cobertura &lt; 55%
                </p>
              </div>
              <button
                onClick={() => setShowFullModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Search Bar */}
            <div style={{ padding: '0.85rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <Search size={16} color="var(--text-muted)" />
              <input
                type="text"
                placeholder="Buscar por docente o curso..."
                value={modalSearch}
                onChange={(e) => setModalSearch(e.target.value)}
                style={{
                  border: 'none',
                  outline: 'none',
                  width: '100%',
                  fontSize: '0.88rem',
                  fontFamily: 'inherit',
                  color: 'var(--text-primary)'
                }}
              />
              {modalSearch && (
                <button
                  onClick={() => setModalSearch('')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.75rem' }}
                >
                  Limpiar
                </button>
              )}
            </div>

            {/* Modal Table Content */}
            <div style={{ overflowY: 'auto', flex: 1, padding: '0.5rem 1.5rem 1.5rem' }}>
              <table className="data-table" style={{ width: '100%' }}>
                <thead className="table-header">
                  <tr>
                    <th>Docente</th>
                    <th style={{ textAlign: 'center' }}>Salones Sin Meta</th>
                    <th style={{ textAlign: 'center' }}>Salones Con Meta</th>
                    <th style={{ textAlign: 'center' }}>Ratio Sin Meta</th>
                    <th>Cursos Asignados</th>
                    <th style={{ textAlign: 'center' }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {modalFilteredItems.map((item) => {
                    const badgeBg = item.nivel === 'critica'
                      ? 'var(--rea-rojo-claro)'
                      : item.nivel === 'media'
                      ? 'rgba(234, 152, 54, 0.12)'
                      : '#f1f5f9';
                    const badgeColor = item.nivel === 'critica'
                      ? 'var(--rea-naranja-intenso)'
                      : item.nivel === 'media'
                      ? 'var(--rea-goldenrod)'
                      : '#64748b';

                    return (
                      <tr key={item.professor}>
                        <td style={{ fontWeight: 600, fontSize: '0.88rem' }}>{item.professor}</td>
                        <td style={{ textAlign: 'center', color: 'var(--rea-naranja-intenso)', fontWeight: 700 }}>
                          {item.seccionesNoValidas}
                        </td>
                        <td style={{ textAlign: 'center', color: '#16a34a', fontWeight: 600 }}>
                          {item.seccionesValidas}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '999px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              backgroundColor: badgeBg,
                              color: badgeColor
                            }}
                          >
                            {item.porcentajeNoLlegaron.toFixed(0)}% ({item.seccionesNoValidas}/{item.totalSecciones})
                          </span>
                        </td>
                        <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', maxWidth: '240px' }}>
                          {item.cursos.join(', ')}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            onClick={() => {
                              setShowFullModal(false);
                              onSelectProfessor?.(item.professor);
                            }}
                            style={{
                              background: 'none',
                              border: '1px solid var(--primary)',
                              borderRadius: '4px',
                              padding: '3px 8px',
                              fontSize: '0.75rem',
                              color: 'var(--primary)',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            Ver Ficha
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfessorCoverageDifficultyChart;
