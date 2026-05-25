import { useState, useEffect } from 'react';
import { LayoutDashboard, Users, BookOpen, Loader2, LogOut } from 'lucide-react';
import { fetchSurveyData } from './services/googleSheets';
import type { SurveyRecord } from './services/googleSheets';
import DashboardOverview from './components/DashboardOverview';
import ProfessorView from './components/ProfessorView';
import CourseView from './components/CourseView';
import AccessGate from './components/AccessGate';
import SplashScreen from './components/SplashScreen';
import type { DepartamentoAcademico } from './config/daConfig';

function App() {
  const [activeTab, setActiveTab] = useState<'overview' | 'professors' | 'courses'>('overview');
  const [data, setData] = useState<SurveyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [authenticatedDA, setAuthenticatedDA] = useState<DepartamentoAcademico | null>(null);
  const [selectedCiclo, setSelectedCiclo] = useState<string>('');

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const result = await fetchSurveyData();
        setData(result);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (!authenticatedDA) {
    return <AccessGate onAuthenticated={setAuthenticatedDA} />;
  }

  // Filtrar los datos para que solo correspondan al DA autenticado
  const daData = data.filter(d => d.departamento === authenticatedDA?.name);

  // Filtro Global de Ciclo
  const allCycles = Array.from(new Set(daData.map(d => d.ciclo).filter(Boolean)))
    .filter(c => !c.startsWith('24-'))
    .sort().reverse();
  const availableCiclos = allCycles.slice(0, 4);

  const activeCiclo = selectedCiclo || (availableCiclos[0] || '');

  const filteredData = activeCiclo === 'Histórico' 
    ? daData 
    : daData.filter(d => d.ciclo === activeCiclo);

  const renderContent = () => {
    if (loading) {
      return (
        <div className="loading-container">
          <Loader2 className="animate-spin" size={48} color="var(--primary)" />
          <span>Cargando datos de {authenticatedDA.name}...</span>
        </div>
      );
    }

    if (filteredData.length === 0 && activeCiclo !== availableCiclos[0]) {
      return (
        <div className="flex-center" style={{ height: '100%', flexDirection: 'column', color: 'var(--text-muted)' }}>
          <BookOpen size={64} style={{ marginBottom: '1rem', opacity: 0.5 }} />
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Sin Datos</h2>
          <p>No se encontraron registros para el departamento de {authenticatedDA.name} en el ciclo {activeCiclo}.</p>
        </div>
      );
    }
    
    // Si es el ciclo actual y no hay datos, mostramos un mensaje amigable
    if (filteredData.length === 0 && activeCiclo === availableCiclos[0]) {
      return (
        <div className="flex-center" style={{ height: '100%', flexDirection: 'column', color: 'var(--text-muted)' }}>
          <BookOpen size={64} style={{ marginBottom: '1rem', opacity: 0.5 }} />
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Ciclo {activeCiclo}</h2>
          <p>Aún no hay datos disponibles para el ciclo actual. Seleccione "Histórico" u otro ciclo en el filtro superior.</p>
        </div>
      );
    }

    switch (activeTab) {
      case 'overview':
        return <DashboardOverview data={filteredData} daName={authenticatedDA.name} availableCiclos={availableCiclos} />;
      case 'professors':
        return <ProfessorView data={filteredData} availableCiclos={availableCiclos} />;
      case 'courses':
        return <CourseView data={filteredData} availableCiclos={availableCiclos} />;
      default:
        return <DashboardOverview data={filteredData} daName={authenticatedDA.name} availableCiclos={availableCiclos} />;
    }
  };

  return (
    <div className="app-container">
      <SplashScreen />

      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <img src="/rea-logo.png" alt="Programa REA" style={{ width: '120px', marginBottom: '0.5rem' }} />
          <h1 style={{ color: 'white', fontSize: '1.25rem', fontWeight: 800, marginTop: '0.5rem' }}>
            Dashboard JDA
          </h1>
          <div className="sidebar-da-name">{authenticatedDA.name}</div>
        </div>
        
        <nav className="sidebar-nav">
          <div 
            className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <LayoutDashboard size={20} />
            <span>Vista General</span>
          </div>
          <div 
            className={`nav-item ${activeTab === 'professors' ? 'active' : ''}`}
            onClick={() => setActiveTab('professors')}
          >
            <Users size={20} />
            <span>Desempeño Docente</span>
          </div>
          <div 
            className={`nav-item ${activeTab === 'courses' ? 'active' : ''}`}
            onClick={() => setActiveTab('courses')}
          >
            <BookOpen size={20} />
            <span>Análisis por Curso</span>
          </div>
        </nav>

        <div className="sidebar-footer">
          <button className="logout-btn" onClick={() => setAuthenticatedDA(null)}>
            <LogOut size={16} />
            Cambiar DA / Salir
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        <div style={{ padding: '1rem 2.5rem 0', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', background: 'var(--surface-color)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Periodo:</span>
            <select 
              className="course-selector-mini"
              value={activeCiclo}
              onChange={(e) => setSelectedCiclo(e.target.value)}
              style={{ padding: '0.4rem 2rem 0.4rem 1rem', fontSize: '0.9rem', backgroundColor: 'var(--bg-color)' }}
            >
              {availableCiclos.length > 0 && (
                <option value={availableCiclos[0]}>Ciclo actual ({availableCiclos[0]})</option>
              )}
              {availableCiclos.slice(1).map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
              <option value="Histórico">Histórico</option>
            </select>
          </div>
        </div>
        <div className="animate-fade-in-up" style={{ maxWidth: '1400px', margin: '0 auto', height: 'calc(100% - 60px)', overflowY: 'auto', paddingBottom: '2rem' }}>
          {renderContent()}
        </div>
      </main>
    </div>
  );
}

export default App;
