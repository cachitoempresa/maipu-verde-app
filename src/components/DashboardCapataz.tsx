import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import {
  ClipboardCheck, Truck, Droplets, LogOut,
  ArrowLeft, Loader2, History, Route, Clock, Users,
  MessageSquare, Camera, AlertTriangle, Sprout,
  Scissors, Trash2, Hammer, Eye, Map as MapIcon // Corregido: Importado Map como MapIcon
} from 'lucide-react';

// Importación de módulos compartidos
import { AttendanceModule } from './AttendanceModule';
import { MapModule } from './MapModule';
import { TeamManagement } from './TeamManagement';
import { VehicleReportForm } from './VehicleReportForm';

// --- INTERFACES ---
import { GreenArea } from '../types';

interface UnifiedActivity {
  id: string | number;
  source: string;
  type: string;
  area_name: string;
  description: string;
  created_at: string;
}

interface MenuCardProps {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  color: string;
}

export function DashboardCapataz({ user, onLogout }: { user: { email: string }; onLogout: () => void }) {
  const [activeModule, setActiveModule] = useState<string | null>(null);
  const [areas, setAreas] = useState<GreenArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [unifiedHistory, setUnifiedHistory] = useState<UnifiedActivity[]>([]);
  const [mapFilter, setMapFilter] = useState<string | null>(null);

  // Definición de capas operativas
  const MAP_LAYERS = [
    { id: 'EMERGENCIA', icon: AlertTriangle, color: 'text-red-500', activeBg: 'bg-red-600', label: 'ITS' },
    { id: 'CORTE', icon: Sprout, color: 'text-emerald-500', activeBg: 'bg-emerald-600', label: 'Corte' },
    { id: 'RIEGO', icon: Droplets, color: 'text-blue-500', activeBg: 'bg-blue-600', label: 'Riego' },
    { id: 'PODA', icon: Scissors, color: 'text-amber-500', activeBg: 'bg-amber-600', label: 'Poda' },
    { id: 'ASEO', icon: Trash2, color: 'text-slate-500', activeBg: 'bg-slate-600', label: 'Aseo' },
    { id: 'REPARACIÓN', icon: Hammer, color: 'text-indigo-500', activeBg: 'bg-indigo-600', label: 'Infra' },
  ];

  const fetchEverything = useCallback(async () => {
    try {
      setLoading(true);

      // 1. Cargar todas las áreas
      const { data: allAreas, error } = await supabase.from('green_areas').select('*').not('path', 'is', null);
      if (error) throw error;
      setAreas(allAreas as GreenArea[] || []);

      // 2. Cargar historial
      const [requestsRes, logsRes] = await Promise.all([
        supabase.from('requests').select('*').eq('sender', user.email),
        supabase.from('logs').select('*, green_areas(name)').eq('operator_email', user.email)
      ]);

      const combined: UnifiedActivity[] = [
        ...(requestsRes.data || []).map((r: any) => ({ id: r.id, source: 'SOLICITUD', type: 'REPORTE', area_name: 'Incidencia', description: r.description, created_at: r.created_at })),
        ...(logsRes.data || []).map((l: any) => ({ id: l.id, source: 'MAPA', type: l.activity_type, area_name: l.green_areas?.name || 'Registro', description: l.description, created_at: l.created_at }))
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setUnifiedHistory(combined);
    } catch (err) {
      console.error("Error cargando datos:", err);
    } finally {
      setLoading(false);
    }
  }, [user.email]);

  useEffect(() => { fetchEverything(); }, [fetchEverything]);

  // Áreas específicas de la ruta para el botón gigante
  const areasEnRuta = areas.filter(a => a.route_id !== null);

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-[#10A34F]" size={40} /></div>;

  return (
    <div className="min-h-screen bg-[#F1F5F9] flex flex-col font-sans">
      <header className="bg-[#10A34F] p-5 text-white flex justify-between items-center shadow-xl sticky top-0 z-[100] rounded-b-[2rem]">
        <div className="flex flex-col">
          <span className="font-black italic text-xl tracking-tighter leading-none">MAIPÚ VERDE</span>
          <span className="text-[8px] font-bold uppercase tracking-widest opacity-80">Capataz Terreno</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setActiveModule('HISTORIAL')} className="relative bg-white/20 p-2 rounded-xl">
            <History size={24} />
            <span className="absolute -top-1 -right-1 bg-red-500 text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-[#10A34F]">{unifiedHistory.length}</span>
          </button>
          <button onClick={onLogout} className="bg-red-600 p-2 rounded-xl shadow-lg active:scale-90 transition-all"><LogOut size={24} /></button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        {!activeModule ? (
          <main className="p-6 grid grid-cols-2 gap-4 animate-in fade-in zoom-in-95">
            {/* ACCESO RUTA DE CORTE */}
            <button
              onClick={() => setActiveModule('MAPA_RUTA')}
              className="col-span-2 bg-[#8B5CF6] text-white p-8 rounded-[3.5rem] shadow-2xl flex flex-col items-center justify-center active:scale-95 relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
              <Route size={60} className="mb-2" />
              <span className="font-black text-lg uppercase italic tracking-tighter">Ejecutar Ruta de Corte</span>
              <div className="mt-2 bg-white/20 px-4 py-1 rounded-full text-[10px] font-black uppercase flex items-center gap-2">
                <Clock size={12} /> {areasEnRuta.length} Plazas Hoy
              </div>
            </button>

            {/* ACCESO MAPA OPERATIVO */}
            <MenuCard onClick={() => setActiveModule('MAPA_GENERAL')} icon={<MapIcon size={44} />} label="Mapa Operativo" color="bg-[#FF914D]" />

            <MenuCard onClick={() => setActiveModule('ASISTENCIA')} icon={<ClipboardCheck size={44} />} label="Asistencia" color="bg-[#FF914D]" />
            <MenuCard onClick={() => setActiveModule('EQUIPO')} icon={<Users size={44} />} label="Mi Equipo" color="bg-[#0F172A]" />
            <MenuCard onClick={() => setActiveModule('VEHICULO')} icon={<Truck size={44} />} label="Vehículo" color="bg-[#0F172A]" />
            <MenuCard onClick={() => setActiveModule('CHARLA')} icon={<MessageSquare size={44} />} label="Charla" color="bg-[#0F172A]" />
          </main>
        ) : (
          <div className="p-6 h-full flex flex-col">
            {!['MAPA_RUTA', 'MAPA_GENERAL'].includes(activeModule) && (
              <button onClick={() => setActiveModule(null)} className="mb-6 flex items-center gap-3 font-black text-xs uppercase text-slate-500 bg-white px-6 py-4 rounded-2xl shadow-md active:scale-95 w-fit">
                <ArrowLeft size={20} /> Volver
              </button>
            )}

            <div className="flex-1">
              {activeModule === 'MAPA_RUTA' && (
                <div className="fixed inset-0 z-[200] bg-white">
                  <button onClick={() => setActiveModule(null)} className="absolute top-6 left-6 z-[1001] bg-[#0F172A] text-white p-4 rounded-2xl shadow-2xl flex items-center gap-2 active:scale-90 border border-white/20">
                    <ArrowLeft size={24} /> <span className="font-black text-xs uppercase">Cerrar Ruta</span>
                  </button>
                  <MapModule areas={areasEnRuta} userEmail={user.email} onAreaUpdate={fetchEverything} isCatastroMode={false} onOpenInfra={() => { }} onOpenVehicleReport={() => setActiveModule('VEHICULO')} />
                </div>
              )}

              {activeModule === 'MAPA_GENERAL' && (
                <div className="fixed inset-0 z-[200] bg-white">
                  <div className="bg-[#0F172A] p-4 text-white flex justify-between items-center shadow-xl relative z-[1001]">
                    <button onClick={() => { setActiveModule(null); setMapFilter(null); }} className="flex items-center gap-2 font-black text-[10px] uppercase bg-white/10 px-4 py-2 rounded-xl"><ArrowLeft size={16} /> Salir</button>
                    <span className="font-black uppercase italic text-xs text-emerald-400">Capas de Gestión</span>
                  </div>

                  <div className="absolute top-24 right-4 z-[1000] flex flex-col gap-2 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                    <button onClick={() => setMapFilter(null)} className={`p-4 rounded-2xl shadow-2xl border-2 transition-all ${!mapFilter ? 'bg-blue-600 border-blue-400 text-white scale-110' : 'bg-white border-slate-200 text-slate-400'}`}><Eye size={24} /></button>
                    {MAP_LAYERS.map((layer) => (
                      <button
                        key={layer.id}
                        onClick={() => setMapFilter(mapFilter === layer.id ? null : layer.id)}
                        className={`p-4 rounded-2xl shadow-2xl border-2 transition-all flex flex-col items-center gap-1 ${mapFilter === layer.id ? `${layer.activeBg} border-white/50 text-white scale-110` : `bg-white border-slate-200 ${layer.color}`}`}
                      >
                        <layer.icon size={24} />
                        <span className="text-[6px] font-black uppercase">{layer.label}</span>
                      </button>
                    ))}
                  </div>

                  <MapModule
                    areas={areas}
                    userEmail={user.email}
                    mapFilter={mapFilter}
                    onAreaUpdate={fetchEverything}
                    isCatastroMode={false}
                    onOpenInfra={() => { }}
                    onOpenVehicleReport={() => setActiveModule('VEHICULO')}
                  />
                </div>
              )}

              {activeModule === 'ASISTENCIA' && <AttendanceModule userEmail={user.email} onClose={() => setActiveModule(null)} />}
              {activeModule === 'EQUIPO' && <TeamManagement userEmail={user.email} onClose={() => setActiveModule(null)} />}
              {activeModule === 'VEHICULO' && <VehicleReportForm userEmail={user.email} onClose={() => setActiveModule(null)} />}

              {activeModule === 'CHARLA' && (
                <div className="bg-white p-8 rounded-[3rem] shadow-xl text-center space-y-6">
                  <div className="bg-blue-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto text-blue-600"><MessageSquare size={40} /></div>
                  <h3 className="text-2xl font-black uppercase italic">Charla de Seguridad</h3>
                  <p className="text-slate-500 font-medium">Capture una fotografía del equipo recibiendo la charla de seguridad diaria.</p>
                  <button className="w-full py-6 bg-blue-600 text-white rounded-[2rem] font-black uppercase flex items-center justify-center gap-3 active:scale-95 shadow-lg">
                    <Camera size={24} /> Tomar Fotografía
                  </button>
                </div>
              )}

              {activeModule === 'HISTORIAL' && (
                <div className="space-y-4">
                  <h3 className="font-black text-xl uppercase italic text-slate-800">Mi Actividad</h3>
                  {unifiedHistory.map((item, idx) => (
                    <div key={idx} className="bg-white rounded-[2rem] p-5 shadow-lg border-l-[8px] border-l-[#10A34F]">
                      <div className="flex justify-between items-start mb-1">
                        <h4 className="font-black text-slate-800 text-sm uppercase">{item.area_name}</h4>
                        <span className="text-[8px] font-black text-slate-400">{new Date(item.created_at).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-[10px] font-black text-emerald-600 uppercase mb-2">{item.type}</p>
                      <p className="text-[11px] text-slate-600 italic">"{item.description}"</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MenuCard({ onClick, icon, label, color }: MenuCardProps) {
  return (
    <button onClick={onClick} className={`${color} text-white p-6 rounded-[3.5rem] shadow-xl aspect-square flex flex-col items-center justify-center transition-all active:scale-90 relative overflow-hidden group`}>
      <div className="absolute top-0 right-0 w-12 h-12 bg-white/5 rounded-bl-[2rem]"></div>
      {icon}
      <span className="font-black text-[11px] mt-3 uppercase tracking-tighter text-center leading-none">{label}</span>
    </button>
  );
}