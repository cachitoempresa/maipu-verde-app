import { useState } from 'react';
import { LayoutDashboard, Map, ClipboardList, Menu } from 'lucide-react';

// --- IMPORTACIÓN DE COMPONENTES ---
import { DatabaseSeeder } from './components/DatabaseSeeder';
import { DashboardStats } from './components/DashboardStats';
import { ServiceLogForm } from './components/ServiceLogForm';
import { RecentLogs } from './components/RecentLogs';
import { MapModule } from './components/MapModule';

// 👇 DESCOMENTA ESTA LÍNEA SI NECESITAS VOLVER A IMPORTAR EL KML
//import { KmlImporter } from './components/KmlImporter';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <>
      {/* 👇 DESCOMENTA ESTA LÍNEA PARA VER LA PANTALLA DE IMPORTACIÓN */}
      {/*<KmlImporter /> */}

      <div className="min-h-screen bg-gray-50 flex flex-col">
        
        {/* ================= HEADER (ENCABEZADO) ================= */}
        <header className="bg-maipu-800 text-white shadow-lg z-50 sticky top-0">
          <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="bg-white p-1 rounded-full shadow-md">
                <div className="w-8 h-8 bg-maipu-600 rounded-full flex items-center justify-center font-bold text-white text-sm">
                  M
                </div>
              </div>
              <div>
                <h1 className="text-lg font-bold leading-tight">Áreas Verdes Zona 1</h1>
                <p className="text-xs text-maipu-100 font-light">Gestión Operativa & Fiscalización</p>
              </div>
            </div>
            <button className="p-2 hover:bg-maipu-700 rounded-lg lg:hidden transition-colors">
              <Menu size={24} />
            </button>
          </div>
        </header>

        {/* ================= CONTENIDO PRINCIPAL ================= */}
        <main className="flex-1 max-w-7xl mx-auto w-full p-4">
          
          {/* --- BARRA DE NAVEGACIÓN (TABS) --- */}
          <div className="grid grid-cols-3 gap-3 md:gap-4 mb-6">
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={`p-3 md:p-4 rounded-xl border flex flex-col items-center gap-2 transition-all duration-200 ${
                activeTab === 'dashboard' 
                  ? 'bg-maipu-50 border-maipu-500 text-maipu-800 ring-2 ring-maipu-500 ring-opacity-50 shadow-sm' 
                  : 'bg-white border-gray-200 text-gray-500 hover:border-maipu-300 hover:bg-gray-50'
              }`}
            >
              <LayoutDashboard size={24} />
              <span className="text-xs md:text-sm font-medium">Resumen</span>
            </button>

            <button 
              onClick={() => setActiveTab('bitacora')}
              className={`p-3 md:p-4 rounded-xl border flex flex-col items-center gap-2 transition-all duration-200 ${
                activeTab === 'bitacora' 
                  ? 'bg-maipu-50 border-maipu-500 text-maipu-800 ring-2 ring-maipu-500 ring-opacity-50 shadow-sm' 
                  : 'bg-white border-gray-200 text-gray-500 hover:border-maipu-300 hover:bg-gray-50'
              }`}
            >
              <ClipboardList size={24} />
              <span className="text-xs md:text-sm font-medium">Bitácora</span>
            </button>

            <button 
              onClick={() => setActiveTab('mapa')}
              className={`p-3 md:p-4 rounded-xl border flex flex-col items-center gap-2 transition-all duration-200 ${
                activeTab === 'mapa' 
                  ? 'bg-maipu-50 border-maipu-500 text-maipu-800 ring-2 ring-maipu-500 ring-opacity-50 shadow-sm' 
                  : 'bg-white border-gray-200 text-gray-500 hover:border-maipu-300 hover:bg-gray-50'
              }`}
            >
              <Map size={24} />
              <span className="text-xs md:text-sm font-medium">Mapa</span>
            </button>
          </div>

          {/* --- ÁREA DE PANTALLAS --- */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-6 min-h-[500px]">
            
            {/* Título Dinámico */}
            <h2 className="text-xl font-bold text-gray-800 mb-6 border-b pb-4 flex items-center gap-2">
              {activeTab === 'dashboard' && '📊 Panel de Control General'}
              {activeTab === 'bitacora' && '📋 Libro de Obras Digital'}
              {activeTab === 'mapa' && '🗺️ Cartografía Georreferenciada'}
            </h2>
            
            {/* 1. VISTA: DASHBOARD */}
            {activeTab === 'dashboard' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <DatabaseSeeder />
                <DashboardStats />
                <div className="mt-8 p-6 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-center">
                  <p className="text-gray-500 text-sm">
                    Estado del sistema: <strong>En Línea (Modo Offline Activo)</strong>
                  </p>
                </div>
              </div>
            )}

            {/* 2. VISTA: BITÁCORA */}
            {activeTab === 'bitacora' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-8">
                 <ServiceLogForm />
                 <div className="my-8 flex items-center gap-4">
                   <div className="h-px bg-gray-200 flex-1"></div>
                   <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Historial del Día</span>
                   <div className="h-px bg-gray-200 flex-1"></div>
                 </div>
                 <RecentLogs />
              </div>
            )}

            {/* 3. VISTA: MAPA (Ahora con Polígonos) */}
            {activeTab === 'mapa' && (
              <div className="animate-in fade-in zoom-in-95 duration-300">
                <MapModule />
                <p className="text-center text-xs text-gray-400 mt-3 flex items-center justify-center gap-1">
                  <Map size={14} />
                  Visualizando catastro oficial Zona 1 (Polígonos).
                </p>
              </div>
            )}

          </div>

        </main>
      </div>
    </>
  );
}

export default App;