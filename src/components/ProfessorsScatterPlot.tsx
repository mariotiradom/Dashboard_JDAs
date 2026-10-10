import React, { useMemo } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell
} from 'recharts';
import { Users, Info, Award, AlertCircle } from 'lucide-react';
import type { SurveyRecord } from '../services/googleSheets';
import { aggregateProfessorsScatter, type ProfessorScatterPoint } from '../utils/scatterAggregation';
import { getTier } from '../utils/sectionVariance';

interface Props {
  data: SurveyRecord[];
  daName: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: ProfessorScatterPoint;
  }>;
}

const CustomScatterTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0].payload;
  const tier = getTier(p.promedio);
  const respPct = p.totalMatriculados > 0
    ? ((p.totalEstudiantes / p.totalMatriculados) * 100).toFixed(0)
    : '0';

  return (
    <div
      style={{
        backgroundColor: 'var(--rea-blanco, #ffffff)',
        borderRadius: '10px',
        padding: '12px 14px',
        boxShadow: 'var(--shadow-lg, 0 8px 30px rgba(32, 78, 207, 0.12))',
        border: '1px solid var(--border-color, #dde3f7)',
        maxWidth: '290px',
        fontSize: '0.82rem',
        color: 'var(--text-primary, #111827)'
      }}
    >
      <div style={{ fontWeight: 700, fontSize: '0.92rem', marginBottom: '4px', color: 'var(--text-primary)' }}>
        {p.professor}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
        <span
          style={{
            fontSize: '0.7rem',
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: '999px',
            backgroundColor: tier.bg,
            color: tier.color
          }}
        >
          {tier.label}
        </span>
        <span style={{ fontWeight: 700, fontSize: '0.95rem', color: tier.color }}>
          {p.promedio.toFixed(2)} <span style={{ fontSize: '0.72rem', fontWeight: 500, color: 'var(--text-muted)' }}>/ 5.0</span>
        </span>
      </div>

      <div style={{ borderTop: '1px solid var(--border-color, #dde3f7)', paddingTop: '6px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
        <div>
          <strong style={{ color: 'var(--text-secondary)' }}>Alumnos Matriculados:</strong>{' '}
          <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{p.totalMatriculados}</span>
        </div>
        <div>
          <strong style={{ color: 'var(--text-secondary)' }}>Respuestas a Encuesta:</strong>{' '}
          <span>{p.totalEstudiantes}</span> ({respPct}% participación)
        </div>
        <div>
          <strong style={{ color: 'var(--text-secondary)' }}>Secciones válidas:</strong>{' '}
          <span style={{ fontWeight: 600 }}>{p.seccionesCount}</span>
        </div>
        <div>
          <strong style={{ color: 'var(--text-secondary)' }}>Cursos ({p.cursos.length}):</strong>{' '}
          <span style={{ color: 'var(--text-muted)' }}>{p.cursos.join(', ')}</span>
        </div>
      </div>
    </div>
  );
};

export const ProfessorsScatterPlot: React.FC<Props> = ({ data, daName }) => {
  const result = useMemo(() => aggregateProfessorsScatter(data), [data]);
  const { points, avgScore, medianStudents, yMin, yTicks } = result;

  // Quadrant distribution count (based on enrolled student volume and professor score)
  const quadrants = useMemo(() => {
    let q1 = 0; // High Volume, High Score
    let q2 = 0; // Low Volume, High Score
    let q3 = 0; // Low Volume, Low Score
    let q4 = 0; // High Volume, Low Score

    points.forEach(p => {
      const isHighVol = p.totalMatriculados >= medianStudents;
      const isHighScore = p.promedio >= avgScore;

      if (isHighVol && isHighScore) q1++;
      else if (!isHighVol && isHighScore) q2++;
      else if (!isHighVol && !isHighScore) q3++;
      else q4++;
    });

    return { q1, q2, q3, q4 };
  }, [points, avgScore, medianStudents]);

  if (points.length === 0) {
    return (
      <div className="card mt-4">
        <h3 className="chart-title">Volumen de Alumnos vs. Desempeño Docente</h3>
        <p className="dashboard-subtitle" style={{ fontSize: '0.85rem' }}>
          No hay docentes con secciones válidas (≥ 55% participación) para mostrar en este período.
        </p>
      </div>
    );
  }

  return (
    <div className="card mt-4">
      <div className="flex-between" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.75rem' }}>
        <div>
          <h3 className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <Users size={18} color="var(--primary)" />
            Relación: Total de Matriculados vs. Puntaje Docente
          </h3>
          <p className="dashboard-subtitle" style={{ fontSize: '0.82rem', margin: 0 }}>
            Matriculados vs. puntaje docente en <strong>{daName}</strong> (secciones válidas ≥ 55%).
          </p>
        </div>

        {/* Quick Quadrants Summary Pills */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: 600,
              padding: '3px 8px',
              borderRadius: '6px',
              background: 'rgba(61,209,178,0.12)',
              color: 'var(--rea-turquesa)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
            title="Alta matrícula y alto puntaje"
          >
            <Award size={12} /> Alta Matrícula / Alto Score: {quadrants.q1}
          </span>
          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: 600,
              padding: '3px 8px',
              borderRadius: '6px',
              background: 'rgba(242,103,73,0.12)',
              color: 'var(--rea-naranja-intenso)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
            title="Alta matrícula y bajo puntaje"
          >
            <AlertCircle size={12} /> Alta Matrícula / Bajo Score: {quadrants.q4}
          </span>
        </div>
      </div>

      {/* Chart container */}
      <div style={{ position: 'relative', width: '100%', height: 380, marginTop: '1rem' }}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color, #dde3f7)" />

            <XAxis
              type="number"
              dataKey="totalMatriculados"
              name="Estudiantes Matriculados"
              tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
              label={{
                value: 'Total de Estudiantes Matriculados (Base de Datos)',
                position: 'insideBottom',
                offset: -12,
                fill: 'var(--text-secondary)',
                fontSize: 12
              }}
            />

            <YAxis
              type="number"
              dataKey="promedio"
              name="Puntaje Docente"
              domain={[yMin, 5]}
              ticks={yTicks}
              tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
              label={{
                value: 'Puntaje Promedio',
                angle: -90,
                position: 'insideLeft',
                offset: 5,
                fill: 'var(--text-secondary)',
                fontSize: 12
              }}
            />

            <Tooltip content={<CustomScatterTooltip />} cursor={{ strokeDasharray: '3 3' }} />

            {/* Reference horizontal line: Department average score */}
            <ReferenceLine
              y={avgScore}
              stroke="var(--primary)"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: `Promedio DA: ${avgScore.toFixed(2)}`,
                position: 'top',
                fill: 'var(--primary)',
                fontSize: 11,
                fontWeight: 600
              }}
            />

            {/* Reference vertical line: Median enrolled student volume */}
            <ReferenceLine
              x={medianStudents}
              stroke="var(--rea-goldenrod)"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: `Mediana matriculados: ${medianStudents}`,
                position: 'insideTopRight',
                fill: 'var(--rea-goldenrod)',
                fontSize: 11,
                fontWeight: 600
              }}
            />

            <Scatter name="Docentes" data={points}>
              {points.map((p, index) => {
                const tier = getTier(p.promedio);
                return (
                  <Cell
                    key={`scatter-cell-${index}`}
                    fill={tier.color}
                    fillOpacity={0.8}
                    stroke="var(--rea-blanco, #ffffff)"
                    strokeWidth={1.5}
                    r={5}
                  />
                );
              })}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Explanatory quadrant guide & benchmark indicators */}
      <div
        style={{
          marginTop: '1rem',
          padding: '10px 14px',
          borderRadius: '8px',
          backgroundColor: 'rgba(32, 78, 207, 0.04)',
          border: '1px solid var(--border-color, #dde3f7)',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1rem',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.78rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
          <Info size={15} color="var(--primary)" />
          <span>
            <strong>Línea azul:</strong> Promedio del DA (<strong>{avgScore.toFixed(2)}</strong>) |{' '}
            <strong>Línea dorada:</strong> Mediana de matriculados (<strong>{medianStudents}</strong>)
          </span>
        </div>

        <div style={{ display: 'flex', gap: '1rem', color: 'var(--text-muted)' }}>
          <span>Docentes analizados: <strong style={{ color: 'var(--text-primary)' }}>{points.length}</strong></span>
          <span>Alta matrícula + Alto score: <strong style={{ color: 'var(--rea-turquesa)' }}>{quadrants.q1}</strong></span>
        </div>
      </div>
    </div>
  );
};

export default ProfessorsScatterPlot;
