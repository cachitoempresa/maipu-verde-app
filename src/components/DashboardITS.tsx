import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Map as MapIcon, 
  ClipboardCheck, 
  LogOut, 
  Bell,
  Loader2
} from 'lucide-react';

// Importamos los módulos locales
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
  const [loading, setLoading] = useState(true);

  // --- FUNCIÓN PARA CARGAR ÁREAS (Sincronizada con el Mapa) ---
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
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Carga inicial asíncrona para evitar alertas de ESLint
    const init = async () => {
      await fetchAreas();
    };
    init();
    
    // Suscripción Realtime: El Supervisor ve los cambios del Capataz al instante
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

  // Pantalla de carga profesional
  if (loading && areas.length === 0) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-900">
        <Loader2 className="animate-spin text-emerald-500 mb-4" size={48} />
        <div className="text-emerald-400 font-black uppercase tracking-[0.3em] text-xs">
          Sincronizando Sistema ITS
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-900">
      {/* SIDEBAR */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col shadow-2xl z-[100]">
        <div className="p-8 flex flex-col items-center border-b border-slate-800">
           <img src="/logo-empresa.png" alt="Sol Poniente" className="h-16 w-auto mb-3 drop-shadow-lg" />
           <div className="bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
              <span className="text-[9px] font-black tracking-[0.2em] uppercase text-emerald-400">Supervisor</span>
           </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 mt-4">
          <button 
            onClick={() => setActiveTab('map')} 
            className={`w-full flex items-center gap-3 p-4 rounded-2xl font-black text-[11px] uppercase tracking-wider transition-all ${activeTab === 'map' ? 'bg-emerald-600 shadow-lg text-white' : 'hover:bg-slate-800 text-slate-400'}`}
          >
            <MapIcon size={18}/> Mapa General
          </button>
          <button 
            onClick={() => setActiveTab('asistencia')} 
            className={`w-full flex items-center gap-3 p-4 rounded-2xl font-black text-[11px] uppercase tracking-wider transition-all ${activeTab === 'asistencia' ? 'bg-emerald-600 shadow-lg text-white' : 'hover:bg-slate-800 text-slate-400'}`}
          >
            <ClipboardCheck size={18}/> Asistencia
          </button>
        </nav>

        <div className="p-6 border-t border-slate-800">
          <button 
            onClick={onLogout} 
            className="w-full flex items-center justify-center gap-3 p-4 rounded-2xl font-black text-[11px] uppercase bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all"
          >
            <LogOut size={16}/> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 flex flex-col relative">
        <header className="h-16 bg-white border-b flex items-center justify-between px-10 shadow-sm z-50">
           <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              <h2 className="font-black text-slate-800 uppercase italic tracking-tight text-sm">Panel de Gestión ITS</h2>
           </div>
           
           <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Supervisor en línea</p>
                <p className="text-xs font-bold text-slate-700">{user.email}</p>
              </div>
              <button className="p-2.5 bg-slate-100 rounded-xl text-slate-500 relative hover:bg-slate-200 transition-colors">
                <Bell size={20} />
                <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
              </button>
           </div>
        </header>

        <div className="flex-1 relative overflow-hidden bg-white">
          {activeTab === 'map' && (
            <MapModule 
              userRole="Supervisor" 
              areas={areas} 
              userEmail={user.email}
            />
          )}
          
          {activeTab === 'asistencia' && (
            <div className="p-10 h-full overflow-y-auto bg-slate-50">
              <div className="max-w-5xl mx-auto">
                <AttendanceModule userEmail={user.email} onClose={() => setActiveTab('map')} />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}