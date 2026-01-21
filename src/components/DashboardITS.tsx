import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Map as MapIcon, ClipboardCheck, LogOut, Bell } from 'lucide-react';
import { MapModule } from './MapModule';
import { AttendanceModule } from './AttendanceModule';

// --- INTERFAZ PARA ÁREAS ---
interface GreenArea { 
  id: number; 
  name: string; 
  code: string; 
  path: [number, number][]; 
  current_status: string; 
}

export function DashboardITS({ user, onLogout }: { user: { email: string }; onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState('map');
  const [areas, setAreas] = useState<GreenArea[]>([]);

  // --- FUNCIÓN PARA CARGAR ÁREAS ---
  const fetchAreas = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('green_areas')
        .select('*')
        .not('path', 'is', null)
        .order('name');
      
      if (error) throw error;
      if (data) setAreas(data as GreenArea[]);
    } catch (err) {
      console.error("Error al obtener áreas:", err);
    }
  }, []);

  useEffect(() => {
    // Definimos una función interna asíncrona para satisfacer al linter
    // Esto evita el "cascading render" al separar la ejecución
    const loadInitialData = async () => {
      await fetchAreas();
    };

    loadInitialData();
    
    // Suscripción Realtime para ver cambios en vivo
    const channel = supabase.channel('supervisor-sync')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'green_areas' 
      }, () => {
        fetchAreas();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAreas]);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* SIDEBAR (Supervisor) */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col shadow-2xl z-[100]">
        <div className="p-6 flex flex-col items-center border-b border-slate-800">
           <img src="/logo-empresa.png" alt="Logo Sol Poniente" className="h-16 w-auto mb-2 drop-shadow-lg" />
           <span className="text-[10px] font-black tracking-[0.3em] uppercase text-emerald-400">Supervisor</span>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <button 
            onClick={() => setActiveTab('map')} 
            className={`w-full flex items-center gap-3 p-4 rounded-2xl font-bold transition-all ${activeTab === 'map' ? 'bg-emerald-600 shadow-lg' : 'hover:bg-slate-800 text-slate-400'}`}
          >
            <MapIcon size={20}/> Mapa General
          </button>
          <button 
            onClick={() => setActiveTab('asistencia')} 
            className={`w-full flex items-center gap-3 p-4 rounded-2xl font-bold transition-all ${activeTab === 'asistencia' ? 'bg-emerald-600 shadow-lg' : 'hover:bg-slate-800 text-slate-400'}`}
          >
            <ClipboardCheck size={20}/> Asistencia
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button onClick={onLogout} className="w-full flex items-center gap-3 p-4 rounded-2xl font-bold text-red-400 hover:bg-red-500/10 transition-all">
            <LogOut size={20}/> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 flex flex-col relative">
        <header className="h-16 bg-white border-b flex items-center justify-between px-8 shadow-sm">
           <h2 className="font-black text-slate-800 uppercase italic tracking-tight">Panel de Control ITS</h2>
           <div className="flex items-center gap-4">
              <span className="text-xs font-bold text-slate-400">{user.email}</span>
              <button className="p-2 bg-slate-100 rounded-full text-slate-500 relative">
                <Bell size={20} />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
           </div>
        </header>

        <div className="flex-1 relative overflow-hidden">
          {activeTab === 'map' && (
            <MapModule 
              userRole="Supervisor" 
              areas={areas} 
              mapFilter={null} 
            />
          )}
          
          {activeTab === 'asistencia' && (
            <div className="p-8 h-full overflow-y-auto">
              <AttendanceModule userEmail={user.email} onClose={() => setActiveTab('map')} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}