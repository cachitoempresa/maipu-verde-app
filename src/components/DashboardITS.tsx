import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Map as MapIcon, 
  MessageSquare, 
  AlertTriangle, 
  Bell, 
  Menu, 
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { MapModule } from './MapModule';

// --- INTERFACES ---
interface GreenArea {
  id: number;
  name: string;
  code: string;
  path: [number, number][];
  current_status: string;
}

interface ActiveRoute {
  id: number;
  zone_name: string;
  operator_email: string;
  status: string;
}

interface DashboardITSProps {
  user: { email: string };
  onLogout: () => void;
}

export function DashboardITS({ user, onLogout }: DashboardITSProps) {
  const [activeModule, setActiveModule] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [areas, setAreas] = useState<GreenArea[]>([]);
  const [selectedAreaForSOS, setSelectedAreaForSOS] = useState<GreenArea | null>(null);
  const [routes, setRoutes] = useState<ActiveRoute[]>([]);

  // Función para actualización instantánea
  const updateAreaLocal = useCallback((areaId: number, newStatus: string) => {
    setAreas(current => current.map(a => a.id === areaId ? { ...a, current_status: newStatus } : a));
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [aData, rData] = await Promise.all([
        supabase.from('green_areas').select('*').not('path', 'is', null),
        supabase.from('cutting_routes').select('*').eq('status', 'EN_PROCESO')
      ]);
      if (aData.data) setAreas(aData.data as GreenArea[]);
      if (rData.data) setRoutes(rData.data as ActiveRoute[]);
    } catch (e) { 
      console.error(e); 
    } finally { 
      setLoading(false); 
    }
  }, []);

  useEffect(() => {
    fetchData();
    const channel = supabase.channel('its-live-sync')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'green_areas' }, (p) => {
        const newArea = p.new as GreenArea;
        updateAreaLocal(newArea.id, newArea.current_status);
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchData, updateAreaLocal]);

  const handleConfirmSOS = async () => {
    if (!selectedAreaForSOS) return;
    try {
      setLoading(true);
      await supabase.from('requests').insert([{
        sender: user.email,
        description: `🚨 SOS: Emergencia en ${selectedAreaForSOS.name}`,
        status: 'PENDIENTE',
        type: 'EMERGENCIA',
        area_id: selectedAreaForSOS.id
      }]);
      alert(`Emergencia reportada en ${selectedAreaForSOS.name}`);
      setActiveModule(null);
      setSelectedAreaForSOS(null);
    } catch (e) { 
        console.error(e); 
    } finally { 
        setLoading(false); 
        fetchData(); 
    }
  };

  if (loading && !activeModule) return (
    <div className="h-screen flex items-center justify-center bg-slate-50">
      <Loader2 className="animate-spin text-[#10A34F]" size={40} />
    </div>
  );

  return (
    <div className="h-screen bg-[#E5E7EB] flex flex-col font-sans overflow-hidden">
      
      <header className="bg-[#10A34F] p-4 flex justify-between items-center shadow-lg shrink-0 z-[1001]">
        <button onClick={() => activeModule ? setActiveModule(null) : onLogout()} className="text-white p-2">
          {activeModule ? <ArrowLeft size={28} /> : <Menu size={28} />}
        </button>
        <div className="flex flex-col items-center">
          <img src="/logo-empresa.png" alt="Logo" className="h-10 w-auto invert brightness-0" />
          <span className="text-[10px] text-white/80 font-black mt-1 uppercase tracking-widest">ITS Maipú</span>
        </div>
        <button className="text-white p-2 relative">
          <Bell size={28} />
          <span className="absolute top-2 right-2 w-3 h-3 bg-red-500 rounded-full border-2 border-[#10A34F]"></span>
        </button>
      </header>

      <div className="flex-1 overflow-hidden relative">
        {!activeModule ? (
          <main className="p-8 flex flex-col items-center gap-6 animate-in fade-in zoom-in-95 h-full">
            <h2 className="text-slate-500 font-black uppercase tracking-widest text-[10px] mt-4 italic">Panel de Fiscalización</h2>
            
            <div className="grid grid-cols-2 gap-6 w-full max-w-sm">
              <button onClick={() => setActiveModule('MAPA')} className="bg-[#FF914D] aspect-square rounded-[2rem] shadow-[0_8px_0_0_#e67e3a] active:shadow-none active:translate-y-1 flex flex-col items-center justify-center text-white border-4 border-white/20 transition-all">
                <span className="font-black uppercase text-[10px] mb-2 tracking-widest">Mapa</span>
                <MapIcon size={44} fill="white" />
              </button>

              <button onClick={() => setActiveModule('SOLICITUD')} className="bg-[#FF914D] aspect-square rounded-[2rem] shadow-[0_8px_0_0_#e67e3a] active:shadow-none active:translate-y-1 flex flex-col items-center justify-center text-white border-4 border-white/20 transition-all">
                <span className="font-black uppercase text-[10px] mb-2 tracking-widest">Solicitud</span>
                <MessageSquare size={44} fill="white" />
              </button>
            </div>

            <button 
              onClick={() => setActiveModule('SOS_MODE')}
              className="w-full max-w-[320px] bg-[#D10000] py-8 rounded-[3rem] shadow-[0_10px_0_0_#9e0000] active:shadow-none active:translate-y-1 transition-all flex flex-col items-center justify-center text-white border-4 border-white/20 mt-4"
            >
              <span className="font-black uppercase text-2xl mb-1 italic">SOS</span>
              <AlertTriangle size={64} fill="white" />
              <p className="text-[9px] font-black opacity-80 mt-2 uppercase tracking-[0.2em]">Presiona para ubicar en mapa</p>
            </button>

            <button onClick={() => setActiveModule('RUTAS')} className="mt-8 flex items-center gap-2 text-slate-400 font-black uppercase text-[9px] tracking-widest underline decoration-2 decoration-[#10A34F]">
               Revisar Rutas de Corte
            </button>
          </main>
        ) : (
          <div className="h-full flex flex-col">
            {activeModule === 'SOS_MODE' && (
              <div className="h-full relative">
                <div className="absolute top-4 left-4 right-4 z-[1000] bg-red-600 text-white p-4 rounded-2xl shadow-2xl border-2 border-white animate-bounce text-center">
                   <p className="text-xs font-black uppercase italic tracking-tighter">¡Toca en el mapa el lugar de la Emergencia!</p>
                </div>

                <MapModule 
                  areas={areas} 
                  userEmail={user.email} 
                  userRole="ITS"
                  onAreaUpdate={updateAreaLocal}
                  onSelectArea={(area: GreenArea) => setSelectedAreaForSOS(area)} 
                />

                {selectedAreaForSOS && (
                  <div className="absolute bottom-10 left-6 right-6 z-[1000] animate-in slide-in-from-bottom">
                    <div className="bg-white p-6 rounded-[2.5rem] shadow-2xl border-4 border-red-600">
                      <h4 className="font-black text-slate-800 uppercase text-center text-lg leading-tight mb-6">
                        {selectedAreaForSOS.name}
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <button onClick={() => setSelectedAreaForSOS(null)} className="bg-slate-100 text-slate-500 py-4 rounded-2xl font-black uppercase text-[10px]">Cancelar</button>
                        <button onClick={handleConfirmSOS} className="bg-red-600 text-white py-4 rounded-2xl font-black uppercase text-[10px] shadow-lg">Enviar Alerta</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeModule === 'MAPA' && (
              <MapModule 
                areas={areas} 
                userEmail={user.email} 
                userRole="ITS" 
                onAreaUpdate={updateAreaLocal} 
              />
            )}
            
            {activeModule === 'RUTAS' && (
              <div className="p-6 space-y-4 overflow-y-auto bg-slate-100 h-full">
                {routes.length > 0 ? routes.map((r) => (
                  <div key={r.id} className="bg-white p-6 rounded-[2.5rem] shadow-sm border-l-8 border-[#10A34F] flex justify-between items-center">
                    <div>
                      <h4 className="font-black text-slate-800 uppercase text-xs">{r.zone_name}</h4>
                      <p className="text-[9px] text-slate-400 font-black uppercase mt-1">Corte: {r.operator_email.split('@')[0]}</p>
                    </div>
                    <Clock className="text-[#10A34F]" size={20} />
                  </div>
                )) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 font-bold uppercase text-xs p-10 text-center">
                        No hay rutas de corte activas en este momento
                    </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <footer className="h-16 bg-[#10A34F] shrink-0 shadow-inner flex items-center justify-around px-8">
          <CheckCircle2 size={28} className="text-white/40" />
          <MapIcon size={32} className="text-white" />
          <Clock size={28} className="text-white/40" />
      </footer>
    </div>
  );
}