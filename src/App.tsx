import { useState } from 'react';
import { Login } from './components/Login';
import { DashboardSupervisor } from './components/DashboardSupervisor';
import { LibroObras } from './components/LibroObras';
import { ReporteIncidente } from './components/ReporteIncidente';

// --- RECUPERAMOS TU MAPA AVANZADO ---
// En lugar de MapaRutas, usamos MapModule que veo en tu lista de archivos
import { MapModule } from './components/MapModule'; 

function App() {
  const [user, setUser] = useState<{name: string; email: string; role: string} | null>(null);
  const [currentView, setCurrentView] = useState('dashboard');

  const handleLoginSuccess = (userData: {name: string; email: string; role: string}) => {
    setUser(userData);
    setCurrentView('dashboard');
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentView('dashboard');
  };

  const renderContent = () => {
    if (!user) {
      return <Login onLoginSuccess={handleLoginSuccess} />;
    }

    switch (currentView) {
      case 'dashboard':
        return (
          <DashboardSupervisor 
            user={user} 
            onLogout={handleLogout} 
            onNavigate={(view) => setCurrentView(view)} 
          />
        );
      
      case 'libro_obras':
        return <LibroObras user={user} onBack={() => setCurrentView('dashboard')} />;
      
      // --- AQUÍ ESTÁ EL CAMBIO CLAVE ---
      case 'mapa':
        // Usamos tu componente avanzado. 
        // Nota: Asumo que MapModule acepta 'onBack'. Si te da error, avísame.
        return <MapModule onBack={() => setCurrentView('dashboard')} />;
      
      case 'reporte_incidente':
        return <ReporteIncidente user={user} onBack={() => setCurrentView('dashboard')} />;
        
      default:
        return <DashboardSupervisor user={user} onLogout={handleLogout} />;
    }
  };

  return (
    <div>{renderContent()}</div>
  );
}

export default App;