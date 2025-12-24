import { useState } from 'react';
import { LayoutDashboard, Map, ClipboardList, TreePine } from 'lucide-react';
import { MapModule } from './components/MapModule';
import { ServiceLogForm } from './components/ServiceLogForm';
import { RecentLogs } from './components/RecentLogs';
import { StatsDashboard } from './components/StatsDashboard';
import { DatabaseSeeder } from './components/DatabaseSeeder';
// 👇 Importamos el nuevo botón de Excel
import { ExcelExport } from './components/ExcelExport';

function App() {
  const [activeTab, setActiveTab] = useState<'resumen' | 'mapa' | 'bitacora'>('resumen');

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      
      {/* --- HEADER (Barra Superior) --- */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-maipu-600 p-2 rounded-lg text-white">
              <TreePine size={24} />
            </div>
            <div>
              <h1 className="text-xl font-black text-gray-800 tracking-tight leading-none">MAIPÚ VERDE</h1>
              <p className="text-xs text-gray-500 font-medium">Gestión Operativa de Áreas Verdes</p>
            </div>
          </div>
          <div className="text-xs font-bold text-maipu-600 bg-maipu-50 px-3 py-1 rounded-full border border-maipu-100">
            v1.0.0
          </div>
        </div>
      </header>

      {/* --- CONTENIDO PRINCIPAL --- */}
      <main className="flex-1 p-4 pb-24 max-w-3xl mx-auto w-full">
        
        {/* 1. VISTA: RESUMEN (DASHBOARD) */}
        {activeTab === 'resumen' && (
          <div className="animate-in fade-in zoom-in duration-300 space-y-6">
            <StatsDashboard />
            <DatabaseSeeder />
          </div>
        )}

        {/* 2. VISTA: MAPA */}
        {activeTab === 'mapa' && (
           <div className="animate-in fade-in duration-500">
             <MapModule />
           </div>
        )}

        {/* 3. VISTA: BITÁCORA (FORMULARIO + EXCEL + HISTORIAL) */}
        {activeTab === 'bitacora' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-8">
             
             {/* BOTÓN EXCEL: Lo ponemos primero para acceso rápido */}
             <div className="mb-6">
                <ExcelExport />
             </div>

             {/* Formulario de Ingreso */}
             <ServiceLogForm />

             {/* Separador Visual */}
             <div className="my-8 flex items-center gap-4">
               <div className="h-px bg-gray-200 flex-1"></div>
               <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Historial del Día</span>
               <div className="h-px bg-gray-200 flex-1"></div>
             </div>

             {/* Lista de últimos registros */}
             <RecentLogs />
          </div>
        )}

      </main>

      {/* --- BARRA DE NAVEGACIÓN INFERIOR (MÓVIL) --- */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe pt-2 px-6 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-50">
        <div className="max-w-md mx-auto flex justify-between items-center h-16">
          
          <button 
            onClick={() => setActiveTab('resumen')}
            className={`flex flex-col items-center gap-1 transition-all w-20 ${activeTab === 'resumen' ? 'text-maipu-600 scale-110' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <LayoutDashboard size={activeTab === 'resumen' ? 26 : 24} strokeWidth={activeTab === 'resumen' ? 2.5 : 2} />
            <span className="text-[10px] font-bold">Resumen</span>
          </button>

          <button 
            onClick={() => setActiveTab('mapa')}
            className={`flex flex-col items-center gap-1 transition-all w-20 ${activeTab === 'mapa' ? 'text-maipu-600 scale-110' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <Map size={activeTab === 'mapa' ? 26 : 24} strokeWidth={activeTab === 'mapa' ? 2.5 : 2} />
            <span className="text-[10px] font-bold">Mapa</span>
          </button>

          <button 
            onClick={() => setActiveTab('bitacora')}
            className={`flex flex-col items-center gap-1 transition-all w-20 ${activeTab === 'bitacora' ? 'text-maipu-600 scale-110' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <ClipboardList size={activeTab === 'bitacora' ? 26 : 24} strokeWidth={activeTab === 'bitacora' ? 2.5 : 2} />
            <span className="text-[10px] font-bold">Bitácora</span>
          </button>

        </div>
      </nav>

    </div>
  );
}

export default App;