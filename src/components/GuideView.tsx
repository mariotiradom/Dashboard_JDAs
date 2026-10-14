import React from 'react';
import { HelpCircle, BarChart2, CheckCircle2, AlertTriangle, Layers, Users, BookOpen, Filter, ArrowRight } from 'lucide-react';

interface Props {
  onNavigateTab: (tab: 'overview' | 'professors' | 'courses') => void;
}

export const GuideView: React.FC<Props> = ({ onNavigateTab }) => {
  return (
    <div className="animate-fade-in" style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Encabezado */}
      <div className="dashboard-header mb-4">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              backgroundColor: 'rgba(32, 78, 207, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--primary)'
            }}
          >
            <HelpCircle size={24} />
          </div>
          <h2 className="dashboard-title" style={{ margin: 0 }}>Guía de Uso y Metodología</h2>
        </div>
        <p className="dashboard-subtitle">
          Manual operativo para coordinadores y Jefes de Departamento Académico (JDA). Conoce cómo interpretar los indicadores y aprovechar las funcionalidades del Dashboard.
        </p>
      </div>

      {/* Grid de Secciones */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        {/* 1. Criterio de Representatividad (Regla del 55%) */}
        <div className="card" style={{ borderLeft: '4px solid var(--primary)' }}>
          <h3 className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <CheckCircle2 size={20} color="var(--primary)" />
            1. Criterio de Representatividad Estadística (Umbral del 55%)
          </h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1rem' }}>
            Para garantizar que las decisiones académicas se tomen con datos válidos y no con muestras sesgadas, el sistema aplica un estricto filtro de representatividad:
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            <div style={{ padding: '0.85rem 1rem', borderRadius: '8px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#166534', marginBottom: '4px' }}>
                Secciones Representativas (≥ 55% de participación)
              </div>
              <div style={{ fontSize: '0.82rem', color: '#15803d', lineHeight: 1.5 }}>
                Sus puntajes se incluyen en el cálculo de la media departamental, el promedio del curso, el ranking y la dispersión. En las tablas de desglose cuentan con un <strong>sombreado verde suave</strong> para rápida identificación.
              </div>
            </div>
            <div style={{ padding: '0.85rem 1rem', borderRadius: '8px', backgroundColor: '#f8fafc', border: '1px dashed #cbd5e1' }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#64748b', marginBottom: '4px' }}>
                Baja Cobertura (&lt; 55% de participación)
              </div>
              <div style={{ fontSize: '0.82rem', color: '#64748b', lineHeight: 1.5 }}>
                Se muestran en <strong>gris</strong> para fines de auditoría, pero <strong>no alteran los promedios ni penalizan</strong> al docente o curso.
              </div>
            </div>
          </div>
        </div>

        {/* 2. Código de Colores y Desviación de la Media */}
        <div className="card">
          <h3 className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <BarChart2 size={20} color="var(--primary)" />
            2. Interpretación Visual y Código de Colores
          </h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1rem' }}>
            En los gráficos de barras horizontales (por curso y por sección), la posición de cada barra se evalúa directamente frente a la <strong>Línea de Media</strong>:
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem', borderRadius: '8px', backgroundColor: 'var(--bg-secondary, #f8fafc)' }}>
              <div style={{ width: '16px', height: '16px', borderRadius: '4px', backgroundColor: 'var(--rea-turquesa)', flexShrink: 0 }} />
              <div>
                <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>Verde azulado (Sobre la media):</strong>
                <span style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', marginLeft: '0.4rem' }}>
                  El puntaje obtenido supera el promedio de referencia.
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem', borderRadius: '8px', backgroundColor: 'var(--bg-secondary, #f8fafc)' }}>
              <div style={{ width: '16px', height: '16px', borderRadius: '4px', backgroundColor: 'var(--rea-naranja-intenso)', flexShrink: 0 }} />
              <div>
                <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>Naranja / Ámbar (Bajo la media):</strong>
                <span style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', marginLeft: '0.4rem' }}>
                  El puntaje está por debajo del promedio del curso o departamento.
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem', borderRadius: '8px', backgroundColor: 'var(--bg-secondary, #f8fafc)' }}>
              <div style={{ width: '16px', height: '16px', borderRadius: '4px', backgroundColor: '#cbd5e1', flexShrink: 0 }} />
              <div>
                <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>Gris claro (Baja Cobertura):</strong>
                <span style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', marginLeft: '0.4rem' }}>
                  No alcanzó el 55% de participación. Su resultado no es estadísticamente concluyente.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Indicador de Dispersión */}
        <div className="card" style={{ borderLeft: '4px solid var(--rea-naranja-intenso)' }}>
          <h3 className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <AlertTriangle size={20} color="var(--rea-naranja-intenso)" />
            3. Dispersión entre Secciones y Docentes
          </h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '0.75rem' }}>
            La <strong>Dispersión</strong> mide la brecha existente entre la sección con el puntaje más alto y la de menor puntaje dentro de un mismo curso:
          </p>
          <div style={{ padding: '0.85rem 1.1rem', borderRadius: '8px', backgroundColor: 'rgba(242, 103, 73, 0.08)', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
            <strong>Alerta de Dispersión Alta (≥ 0.50 puntos):</strong> Señala una brecha notable en la experiencia de aprendizaje entre alumnos de distintas secciones de la misma asignatura. Esto permite al JDA intervenir oportunamente para homogenizar criterios pedagógicos y metodológicos.
          </div>
        </div>

        {/* 4. Vistas y Navegación */}
        <div className="card">
          <h3 className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <Layers size={20} color="var(--primary)" />
            4. Las 3 Vistas de Análisis
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            <div 
              style={{ 
                padding: '1rem', 
                borderRadius: '8px', 
                border: '1px solid var(--border-color)', 
                backgroundColor: 'var(--surface-color)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.5rem' }}>
                  <BarChart2 size={18} />
                  Vista General
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                  Resumen macro del departamento: promedio global, tasa de cobertura, top docentes, docentes con dificultades para llegar a la meta de participación y docentes bajo el promedio.
                </p>
              </div>
              <button 
                onClick={() => onNavigateTab('overview')}
                style={{ 
                  marginTop: '1rem', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.4rem', 
                  fontSize: '0.8rem', 
                  color: 'var(--primary)', 
                  background: 'none', 
                  border: 'none', 
                  cursor: 'pointer', 
                  fontWeight: 600,
                  padding: 0
                }}
              >
                Ir a Vista General <ArrowRight size={14} />
              </button>
            </div>

            <div 
              style={{ 
                padding: '1rem', 
                borderRadius: '8px', 
                border: '1px solid var(--border-color)', 
                backgroundColor: 'var(--surface-color)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.5rem' }}>
                  <Users size={18} />
                  Desempeño Docente
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                  Ficha detallada por docente: radar de dimensiones pedagógicas, evolución cronológica retrospectiva y desglose por sección.
                </p>
              </div>
              <button 
                onClick={() => onNavigateTab('professors')}
                style={{ 
                  marginTop: '1rem', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.4rem', 
                  fontSize: '0.8rem', 
                  color: 'var(--primary)', 
                  background: 'none', 
                  border: 'none', 
                  cursor: 'pointer', 
                  fontWeight: 600,
                  padding: 0
                }}
              >
                Ir a Desempeño Docente <ArrowRight size={14} />
              </button>
            </div>

            <div 
              style={{ 
                padding: '1rem', 
                borderRadius: '8px', 
                border: '1px solid var(--border-color)', 
                backgroundColor: 'var(--surface-color)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '0.5rem' }}>
                  <BookOpen size={18} />
                  Análisis por Curso
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                  Comparativa de la plana docente dentro de un mismo curso, evaluando si las secciones se mantienen homogéneas respecto a la media.
                </p>
              </div>
              <button 
                onClick={() => onNavigateTab('courses')}
                style={{ 
                  marginTop: '1rem', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.4rem', 
                  fontSize: '0.8rem', 
                  color: 'var(--primary)', 
                  background: 'none', 
                  border: 'none', 
                  cursor: 'pointer', 
                  fontWeight: 600,
                  padding: 0
                }}
              >
                Ir a Análisis por Curso <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* 5. Selector de Periodos y Retrospectividad */}
        <div className="card">
          <h3 className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Filter size={20} color="var(--primary)" />
            5. Filtro de Periodos y Análisis Retrospectivo
          </h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            El selector de periodos superior te permite alternar entre:
          </p>
          <ul style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6, paddingLeft: '1.25rem', marginTop: '0.5rem' }}>
            <li><strong>Ciclos específicos (ej. 26-2, 26-1):</strong> Muestra los resultados concretos de ese periodo lectivo. Cualquier cálculo comparativo histórico se realiza con retrospectividad estricta (hacia atrás en el tiempo), sin contaminarse con ciclos futuros.</li>
            <li><strong>Histórico:</strong> Consolida todos los ciclos evaluados para identificar tendencias a largo plazo y consistencia en el desempeño de los docentes.</li>
          </ul>
        </div>

      </div>
    </div>
  );
};

export default GuideView;

