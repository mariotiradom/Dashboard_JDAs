import React from 'react';
import { AlertTriangle, Layers } from 'lucide-react';
import type { CourseVariance } from '../utils/sectionVariance';
import { getTier } from '../utils/sectionVariance';

interface Props {
  courseName: string;
  varianceData: CourseVariance[];
}

export const SectionVarianceCard: React.FC<Props> = ({ courseName, varianceData }) => {
  if (!varianceData || varianceData.length === 0) {
    return null;
  }

  return (
    <div className="card mt-4">
      <div className="flex-between mb-3" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h3 className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <Layers size={18} color="var(--primary)" />
            Varianza entre Secciones — <span style={{ color: 'var(--text-secondary)' }}>{courseName}</span>
          </h3>
          <p className="dashboard-subtitle" style={{ fontSize: '0.85rem', margin: 0 }}>
            Comparación del puntaje docente entre secciones válidas (≥60% participación) para identificar disparidades.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1rem' }}>
        {varianceData.map((cycleVariance) => {
          if (cycleVariance.secciones.length <= 1) {
            return null;
          }

          const { ciclo, promedioCurso, spread, isHighDispersion, secciones } = cycleVariance;

          return (
            <div
              key={ciclo}
              style={{
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '1rem',
                backgroundColor: 'rgba(255, 255, 255, 0.4)'
              }}
            >
              {/* Header per ciclo */}
              <div className="flex-between" style={{ alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                    Ciclo {ciclo}
                  </span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Promedio del curso:{' '}
                    <strong style={{ color: 'var(--primary)' }}>{promedioCurso.toFixed(2)}</strong>
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {isHighDispersion ? (
                    <span
                      className="badge badge-warning"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        fontSize: '0.75rem',
                        padding: '4px 8px',
                        backgroundColor: 'var(--rea-rojo-claro)',
                        color: 'var(--rea-naranja-intenso)',
                        fontWeight: 600
                      }}
                    >
                      <AlertTriangle size={14} />
                      Dispersión Alta: {spread.toFixed(2)}
                    </span>
                  ) : (
                    <span
                      className="badge badge-success"
                      style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                    >
                      Dispersión Baja: {spread.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>

              {/* Rows per section */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {secciones.map((sec) => {
                  const tier = getTier(sec.promedioSeccion);
                  const isPositive = sec.delta >= 0;
                  const deltaColor = isPositive ? 'var(--rea-turquesa)' : 'var(--rea-naranja-intenso)';
                  const formattedDelta = `${isPositive ? '+' : ''}${sec.delta.toFixed(2)}`;
                  const baselinePct = (promedioCurso / 5) * 100;
                  const fillPct = (sec.promedioSeccion / 5) * 100;

                  return (
                    <div
                      key={sec.section}
                      className="ranking-item"
                      style={{
                        padding: '0.5rem 0.75rem',
                        borderRadius: '6px',
                        backgroundColor: 'var(--bg-secondary, #fafbfc)',
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem'
                      }}
                    >
                      {/* Section indicator */}
                      <div
                        className="ranking-position normal"
                        style={{
                          width: '28px',
                          height: '28px',
                          fontSize: '0.85rem',
                          background: tier.bg,
                          color: tier.color,
                          border: `1px solid ${tier.color}`,
                          fontWeight: 700
                        }}
                      >
                        {sec.sectionLabel}
                      </div>

                      {/* Professor & metadata */}
                      <div style={{ flex: '1 1 200px', minWidth: '150px' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                          {sec.professor}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          Participación: {(sec.coverage * 100).toFixed(0)}%
                        </div>
                      </div>

                      {/* Bar + Course Baseline Guideline */}
                      <div
                        className="ranking-bar-bg"
                        style={{
                          flex: '2 1 220px',
                          position: 'relative',
                          height: '14px',
                          borderRadius: '7px',
                          background: '#e5e7eb',
                          overflow: 'visible'
                        }}
                      >
                        {/* Section Score Bar */}
                        <div
                          className="ranking-bar-fill"
                          style={{
                            width: `${fillPct}%`,
                            background: `linear-gradient(90deg, ${tier.color}aa, ${tier.color})`,
                            height: '100%',
                            borderRadius: '7px'
                          }}
                        />

                        {/* Baseline indicator */}
                        <div
                          style={{
                            position: 'absolute',
                            left: `${baselinePct}%`,
                            top: '-4px',
                            bottom: '-4px',
                            width: '2px',
                            backgroundColor: 'var(--text-primary)',
                            zIndex: 2,
                            borderRadius: '1px'
                          }}
                          title={`Promedio Curso: ${promedioCurso.toFixed(2)}`}
                        />
                      </div>

                      {/* Section Score & Delta */}
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'flex-end',
                          minWidth: '70px',
                          textAlign: 'right'
                        }}
                      >
                        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: tier.color }}>
                          {sec.promedioSeccion.toFixed(2)}
                        </span>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: deltaColor
                          }}
                        >
                          ({formattedDelta})
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SectionVarianceCard;
