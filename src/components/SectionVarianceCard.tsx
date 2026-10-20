import { AlertTriangle, Layers, Info } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ReferenceLine,
  Cell,
  LabelList
} from 'recharts';
import type { CourseVariance, HistoricalCourseVariance } from '../utils/sectionVariance';

interface Props {
  courseName: string;
  varianceData: CourseVariance[];
  historicalVariance?: HistoricalCourseVariance | null;
  isHistorical?: boolean;
  onSelectProfessor?: (profName: string) => void;
}

interface CustomChartTooltipProps {
  active?: boolean;
  payload?: any[];
  promedioCurso: number;
}

const CustomChartTooltip: React.FC<CustomChartTooltipProps> = ({ active, payload, promedioCurso }) => {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload;
  const isPositive = data.delta >= 0;
  const deltaColor = isPositive ? 'var(--rea-turquesa)' : 'var(--rea-naranja-intenso)';
  const deltaText = isPositive ? `+${data.delta.toFixed(2)} sobre la media` : `${data.delta.toFixed(2)} bajo la media`;

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
        minWidth: '220px'
      }}
    >
      <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '4px' }}>
        {data.sectionLabel ? `Sección ${data.sectionLabel}` : data.professor}
      </div>
      {data.sectionLabel && (
        <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginBottom: '6px' }}>
          <strong>Docente{data.professors && data.professors.length > 1 ? 's' : ''}:</strong> {data.professor}
        </div>
      )}
      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '6px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
        <div>
          <strong>Puntaje:</strong> <span style={{ fontWeight: 700 }}>{data.puntaje.toFixed(2)}</span> / 5.0
        </div>
        <div>
          <strong>Participación:</strong> {Math.round(data.coverage * 100)}%
        </div>
        {data.isValid && promedioCurso > 0 && (
          <div style={{ color: deltaColor, fontWeight: 600 }}>
            {deltaText}
          </div>
        )}
        {!data.isValid && (
          <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
            Baja Cobertura • Excluido del promedio
          </div>
        )}
      </div>
    </div>
  );
};

export const SectionVarianceCard: React.FC<Props> = ({
  courseName,
  varianceData,
  historicalVariance,
  isHistorical = false,
  onSelectProfessor
}) => {
  // ══════════════════════════════════════════════════════════════════════════════
  // CASO 1: VISTA HISTÓRICA (Consolidado por docente sin mencionar secciones)
  // ══════════════════════════════════════════════════════════════════════════════
  if (isHistorical) {
    if (!historicalVariance || historicalVariance.docentes.length === 0) {
      return (
        <div className="card mt-4">
          <h3 className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Layers size={20} color="var(--primary)" />
            Varianza Histórica entre Docentes: <span className="text-gradient" style={{ fontWeight: 800 }}>{courseName}</span>
          </h3>
          <p className="dashboard-subtitle" style={{ fontSize: '0.85rem' }}>
            No hay registros disponibles en este curso para realizar la comparativa histórica.
          </p>
        </div>
      );
    }

    const { promedioCurso, spread, isHighDispersion, hasValidSections, docentes } = historicalVariance;

    const chartData = docentes.map(doc => ({
      ...doc,
      label: doc.professor,
      puntaje: doc.promedioDocente,
      coverage: doc.avgCoverage,
      sectionLabel: ''
    }));

    return (
      <div className="card mt-4">
        {/* Header con foco en el curso */}
        <div className="flex-between mb-3" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h3 className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <Layers size={20} color="var(--primary)" />
              Varianza Histórica entre Docentes: <span className="text-gradient" style={{ fontWeight: 800 }}>{courseName}</span>
            </h3>
            <p className="dashboard-subtitle" style={{ fontSize: '0.82rem', margin: 0 }}>
              Comparación horizontal del desempeño docente histórico respecto a la media del curso
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {hasValidSections && (
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Promedio histórico del curso: <strong style={{ color: 'var(--primary)' }}>{promedioCurso.toFixed(2)}</strong>
              </span>
            )}
            {docentes.filter(d => d.isValid).length > 1 && (
              isHighDispersion ? (
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
                  title="Diferencia máxima entre docentes ≥ 0.5 puntos"
                >
                  <AlertTriangle size={14} />
                  Dispersión Alta: {spread.toFixed(2)}
                </span>
              ) : (
                <span
                  className="badge badge-success"
                  style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                  title="Diferencia máxima entre docentes < 0.5 puntos"
                >
                  Dispersión Baja: {spread.toFixed(2)}
                </span>
              )
            )}
          </div>
        </div>

        {/* Gráfico Horizontal de Barras */}
        <div style={{ width: '100%', minHeight: '240px', marginTop: '1rem' }}>
          <ResponsiveContainer width="100%" height={Math.max(240, chartData.length * 52)}>
            <BarChart
              layout="vertical"
              data={chartData}
              margin={{ top: 20, right: 65, left: 15, bottom: 5 }}
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
                dataKey="label"
                width={170}
                tick={{ fill: 'var(--text-primary)', fontSize: 12, fontWeight: 600 }}
              />
              <RechartsTooltip
                content={<CustomChartTooltip promedioCurso={promedioCurso} />}
                cursor={{ fill: 'rgba(32, 78, 207, 0.04)' }}
              />
              {hasValidSections && (
                <ReferenceLine
                  x={promedioCurso}
                  stroke="var(--primary)"
                  strokeDasharray="4 4"
                  strokeWidth={2}
                  label={{
                    value: `Media: ${promedioCurso.toFixed(2)}`,
                    position: 'top',
                    fill: 'var(--primary)',
                    fontSize: 11,
                    fontWeight: 700
                  }}
                />
              )}
              <Bar
                dataKey="puntaje"
                radius={[0, 6, 6, 0]}
                barSize={24}
                style={{ cursor: onSelectProfessor ? 'pointer' : 'default' }}
                onClick={(entry: any) => {
                  if (entry && entry.professor) {
                    onSelectProfessor?.(entry.professor);
                  }
                }}
              >
                {chartData.map((entry, index) => {
                  let fill = '#cbd5e1';
                  if (entry.isValid && hasValidSections) {
                    fill = entry.delta >= 0 ? 'var(--rea-turquesa)' : 'var(--rea-naranja-intenso)';
                  }
                  return <Cell key={`cell-${index}`} fill={fill} />;
                })}
                <LabelList
                  dataKey="puntaje"
                  position="right"
                  formatter={(val: any) => typeof val === 'number' ? val.toFixed(2) : val}
                  style={{ fill: 'var(--text-primary)', fontSize: 12, fontWeight: 700 }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Leyenda del gráfico */}
        <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', marginTop: '1rem', fontSize: '0.82rem', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
          <div className="flex-center" style={{ gap: '0.4rem' }}>
            <div style={{ width: 12, height: 12, backgroundColor: 'var(--rea-turquesa)', borderRadius: 3 }}></div> Sobre la media
          </div>
          <div className="flex-center" style={{ gap: '0.4rem' }}>
            <div style={{ width: 12, height: 12, backgroundColor: 'var(--rea-naranja-intenso)', borderRadius: 3 }}></div> Bajo la media
          </div>
          <div className="flex-center" style={{ gap: '0.4rem' }}>
            <div style={{ width: 12, height: 12, backgroundColor: '#cbd5e1', borderRadius: 3 }}></div> Baja Cobertura
          </div>
        </div>

        {/* Footer explicativo */}
        <div style={{ marginTop: '1.25rem', fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Info size={14} color="var(--primary)" />
          <span>La dispersión histórica corresponde a la diferencia entre el docente con mayor y menor promedio en este curso ({spread.toFixed(2)}). Haz clic en una barra para ver la ficha del docente.</span>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // CASO 2: VISTA POR CICLO ESPECÍFICO (Secciones del curso en el ciclo)
  // ══════════════════════════════════════════════════════════════════════════════
  if (!varianceData || varianceData.length === 0) {
    return (
      <div className="card mt-4">
        <h3 className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Layers size={20} color="var(--primary)" />
          Varianza entre Secciones: <span className="text-gradient" style={{ fontWeight: 800 }}>{courseName}</span>
        </h3>
        <p className="dashboard-subtitle" style={{ fontSize: '0.85rem' }}>
          No hay secciones registradas para este curso en el período seleccionado.
        </p>
      </div>
    );
  }

  const currentVariance = varianceData[0];
  const { promedioCurso, spread, isHighDispersion, hasValidSections, secciones } = currentVariance;

  // Formato de etiqueta por sección (ej. "A — Vasquez Ore / Benites Sanchez" o "C — Maehara Aliaga")
  const chartData = secciones.map(sec => {
    let profLabel = sec.professor;
    if (sec.professors && sec.professors.length > 1) {
      profLabel = sec.professors
        .map(p => p.split(' ').slice(0, 2).join(' '))
        .join(' / ');
    }
    return {
      ...sec,
      label: `${sec.sectionLabel} — ${profLabel}`,
      puntaje: sec.promedioSeccion,
    };
  });

  return (
    <div className="card mt-4">
      {/* Header con foco en el curso */}
      <div className="flex-between mb-3" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h3 className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <Layers size={20} color="var(--primary)" />
            Varianza entre Secciones: <span className="text-gradient" style={{ fontWeight: 800 }}>{courseName}</span>
          </h3>
          <p className="dashboard-subtitle" style={{ fontSize: '0.82rem', margin: 0 }}>
            Comparación horizontal del desempeño docente respecto a la media del curso
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {hasValidSections && (
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Promedio del curso: <strong style={{ color: 'var(--primary)' }}>{promedioCurso.toFixed(2)}</strong>
            </span>
          )}
          {secciones.filter(s => s.isValid).length > 1 && (
            isHighDispersion ? (
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
                title="Diferencia máxima entre secciones ≥ 0.5 puntos"
              >
                <AlertTriangle size={14} />
                Dispersión Alta: {spread.toFixed(2)}
              </span>
            ) : (
              <span
                className="badge badge-success"
                style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                title="Diferencia máxima entre secciones < 0.5 puntos"
              >
                Dispersión Baja: {spread.toFixed(2)}
              </span>
            )
          )}
        </div>
      </div>

      {/* Gráfico Horizontal de Barras */}
      <div style={{ width: '100%', minHeight: '240px', marginTop: '1rem' }}>
        <ResponsiveContainer width="100%" height={Math.max(240, chartData.length * 52)}>
          <BarChart
            layout="vertical"
            data={chartData}
            margin={{ top: 20, right: 65, left: 15, bottom: 5 }}
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
              dataKey="label"
              width={200}
              tick={{ fill: 'var(--text-primary)', fontSize: 12, fontWeight: 600 }}
            />
            <RechartsTooltip
              content={<CustomChartTooltip promedioCurso={promedioCurso} />}
              cursor={{ fill: 'rgba(32, 78, 207, 0.04)' }}
            />
            {hasValidSections && (
              <ReferenceLine
                x={promedioCurso}
                stroke="var(--primary)"
                strokeDasharray="4 4"
                strokeWidth={2}
                label={{
                  value: `Media: ${promedioCurso.toFixed(2)}`,
                  position: 'top',
                  fill: 'var(--primary)',
                  fontSize: 11,
                  fontWeight: 700
                }}
              />
            )}
            <Bar
              dataKey="puntaje"
              radius={[0, 6, 6, 0]}
              barSize={24}
              style={{ cursor: onSelectProfessor ? 'pointer' : 'default' }}
              onClick={(entry: any) => {
                if (entry) {
                  if (entry.professors && entry.professors.length > 0) {
                    onSelectProfessor?.(entry.professors[0]);
                  } else if (entry.professor) {
                    onSelectProfessor?.(entry.professor);
                  }
                }
              }}
            >
              {chartData.map((entry, index) => {
                let fill = '#cbd5e1';
                if (entry.isValid && hasValidSections) {
                  fill = entry.delta >= 0 ? 'var(--rea-turquesa)' : 'var(--rea-naranja-intenso)';
                }
                return <Cell key={`cell-${index}`} fill={fill} />;
              })}
              <LabelList
                dataKey="puntaje"
                position="right"
                formatter={(val: any) => typeof val === 'number' ? val.toFixed(2) : val}
                style={{ fill: 'var(--text-primary)', fontSize: 12, fontWeight: 700 }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Leyenda del gráfico */}
      <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', marginTop: '1rem', fontSize: '0.82rem', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
        <div className="flex-center" style={{ gap: '0.4rem' }}>
          <div style={{ width: 12, height: 12, backgroundColor: 'var(--rea-turquesa)', borderRadius: 3 }}></div> Sobre la media del curso
        </div>
        <div className="flex-center" style={{ gap: '0.4rem' }}>
          <div style={{ width: 12, height: 12, backgroundColor: 'var(--rea-naranja-intenso)', borderRadius: 3 }}></div> Bajo la media del curso
        </div>
        <div className="flex-center" style={{ gap: '0.4rem' }}>
          <div style={{ width: 12, height: 12, backgroundColor: '#cbd5e1', borderRadius: 3 }}></div> Baja Cobertura
        </div>
      </div>

      {/* Footer explicativo */}
      <div style={{ marginTop: '1.25rem', fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <Info size={14} color="var(--primary)" />
        <span>La dispersión es la brecha entre la sección con mayor y menor puntaje ({spread.toFixed(2)}). Si es ≥ 0.50 se considera alta disparidad. Haz clic en una barra para ver la ficha del docente.</span>
      </div>
    </div>
  );
};

export default SectionVarianceCard;
