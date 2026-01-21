import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { BrandHeader } from './ui/BrandHeader';
import { MapModule } from './MapModule';
import { AttendanceModule } from './AttendanceModule'; 
import { TeamManagement } from './TeamManagement'; 
import { VehicleReportForm } from './VehicleReportForm';
import { 
  Database, Droplets, Trash2, AlertOctagon, 
  Activity, ShieldCheck, Scissors, Inbox,
  LayoutGrid, Camera, Users, UserPlus, CheckCircle2, X,
  Map as MapIcon, Clock, Sprout, Plus, Search, FileDown, Truck, ClipboardCheck
} from 'lucide-react';

// --- INTERFACES ---
interface EmailRequest { id: number; sender: string; description: string; created_at: string; status: string; }
interface GreenArea { id: number; code: string; name: string; path: [number, number][]; current_status: string; }
interface ActiveRoute { id: number; zone_name: string; created_at: string; operator_email: string; zone_id: number; }
interface DbLog { id: number; created_at: string; activity_type: string; description: string; operator_email: string; area_id: number; green_areas?: { name: string }; }
interface UserData { email: string; user_metadata?: { full_name?: string; role?: string }; }

interface FeedItem {
  id: string | number;
  dbTable: 'logs' | 'requests';
  originalId: number;
  areaId?: number;
  type: 'RIEGO' | 'ASEO' | 'PODA' | 'ITS' | 'OPERATIVO';
  title: string;
  detail: string;
  time: string;
  rawDate: string;
  author: string;
}

export function DashboardSupervisor({ user, onLogout }: { user: UserData; onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState('RESUMEN'); 
  const [areas, setAreas] = useState<GreenArea[]>([]); 
  const [mapFilter, setMapFilter] = useState<'RIEGO' | 'ASEO' | 'PODA' | 'PENDIENTES' | null>(null);
  const [emailRequests, setEmailRequests] = useState<EmailRequest[]>([]);
  const [activeRoutes, setActiveRoutes] = useState<ActiveRoute[]>([]);
  const [logs, setLogs] = useState<DbLog[]>([]);
  
  const [isAttendanceOpen, setIsAttendanceOpen] = useState(false);
  const [isVehicleReportOpen, setIsVehicleReportOpen] = useState(false);
  const [isTeamOpen, setIsTeamOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const isAdmin = ['esteban@maipu.cl', 'mjn@maipu.cl', 'admin@maipu.cl', 'salvador@maipu.cl', 'salvadortapia@maipu.cl'].includes(user.email.toLowerCase());

  const fetchAllData = useCallback(async () => {
    try {
      const [aData, rData, rtData, lData] = await Promise.all([
        supabase.from('green_areas').select('*').not('path', 'is', null),
        supabase.from('requests').select('*').or('status.eq.PENDIENTE,status.is.null').order('created_at', { ascending: false }),
        supabase.from('cutting_routes').select('*').eq('status', 'EN_PROCESO'),
        supabase.from('logs').select('*, green_areas(name)').order('created_at', { ascending: false }).limit(30)
      ]);
      if (aData.data) setAreas(aData.data);
      if (rData.data) setEmailRequests(rData.data);
      if (rtData.data) setActiveRoutes(rtData.data);
      if (lData.data) setLogs(lData.data as unknown as DbLog[]);
    } catch (e) { console.error("Sync Error", e); }
  }, []);

  useEffect(() => {
    const init = async () => { await fetchAllData(); };
    init();
    const channel = supabase.channel('maipu-v11-sync').on('postgres_changes', { event: '*', schema: 'public' }, () => fetchAllData()).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchAllData]);

  const handleResolveActivity = async (item: FeedItem) => {
    try {
      if (item.dbTable === 'requests') {
        await supabase.from('requests').update({ status: 'GESTIONADO' }).eq('id', item.originalId);
      } else {
        await supabase.from('logs').delete().eq('id', item.originalId);
      }
      if (item.areaId) {
        await supabase.from('green_areas').update({ current_status: 'OK' }).eq('id', item.areaId);
      }
      fetchAllData();
    } catch (err) { console.error("Error al resolver", err); }
  };

  const stats = useMemo(() => ({
    catastro: areas.length,
    riego: areas.filter(a => a.current_status === 'RIEGO').length,
    aseo: areas.filter(a => a.current_status === 'ASEO').length,
    poda: areas.filter(a => ['PODA', 'CORTE', 'DESMALEZADO'].includes(a.current_status)).length,
    alertas: emailRequests.length
  }), [areas, emailRequests]);

  const combinedFeed = useMemo((): FeedItem[] => {
    const feed: FeedItem[] = [];
    logs.forEach(l => {
      const act = l.activity_type?.toUpperCase() || '';
      let fType: FeedItem['type'] = 'RIEGO';
      if (act.includes('ASEO')) fType = 'ASEO'; else if (act.includes('PODA')) fType = 'PODA';
      feed.push({ 
        id: `log-${l.id}`, originalId: l.id, areaId: l.area_id, dbTable: 'logs', type: fType, 
        title: l.green_areas?.name || 'Gestión Terreno', detail: l.description || l.activity_type, 
        rawDate: l.created_at, author: l.operator_email?.split('@')[0] || 'Operario', 
        time: new Date(l.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
      });
    });
    emailRequests.forEach(r => feed.push({ 
      id: `req-${r.id}`, originalId: r.id, dbTable: 'requests', type: 'ITS', title: r.sender, 
      detail: r.description, rawDate: r.created_at, author: 'Central Mail', 
      time: new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
    }));
    return feed.sort((a, b) => new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime()).slice(0, 15);
  }, [logs, emailRequests]);

  const filteredAreasSearch = useMemo(() => {
    return areas.filter(a => a.name.toLowerCase().includes(searchTerm.toLowerCase())).slice(0, 10);
  }, [areas, searchTerm]);

  return (
    <div className="min-h-screen bg-[#F1F5F9] antialiased text-slate-900 pb-20 font-sans">
      <BrandHeader user={user} onLogout={onLogout} />
      
      {isAttendanceOpen && <AttendanceModule userEmail={user.email} onClose={() => setIsAttendanceOpen(false)} />}
      {isVehicleReportOpen && <VehicleReportForm userEmail={user.email} onClose={() => setIsVehicleReportOpen(false)} />}
      {isTeamOpen && <TeamManagement userEmail={user.email} onClose={() => setIsTeamOpen(false)} />}

      {isAssignModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-[9999]">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
            <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
              <h3 className="font-black text-sm uppercase italic flex items-center gap-2"><Plus size={16}/> Asignar Area</h3>
              <button onClick={() => setIsAssignModalOpen(false)}><X size={18}/></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 text-slate-400" size={16}/>
                <input 
                  type="text" placeholder="Buscar plaza..." 
                  className="w-full bg-slate-100 border-none rounded-xl py-2 pl-10 text-sm font-bold" 
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                {filteredAreasSearch.map(area => (
                  <button key={area.id} onClick={async () => { await supabase.from('cutting_routes').insert([{ zone_id: area.id, zone_name: area.name, status: 'EN_PROCESO', operator_email: user.email }]); setIsAssignModalOpen(false); fetchAllData(); }} className="w-full flex justify-between p-3 hover:bg-emerald-50 hover:text-emerald-700 rounded-xl text-left text-xs font-black transition-all">
                    <span>{area.name}</span><Plus size={14}/>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-6 mt-8 space-y-6">
          <nav className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
              <button onClick={() => setActiveTab('RESUMEN')} className={`px-6 py-3 rounded-2xl text-[11px] font-black transition-all flex items-center gap-2 ${activeTab === 'RESUMEN' ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-400'}`}><MapIcon size={14}/> RESUMEN</button>
              <button onClick={() => setActiveTab('OPERATIVOS')} className={`px-6 py-3 rounded-2xl text-[11px] font-black transition-all flex items-center gap-2 ${activeTab === 'OPERATIVOS' ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-400'}`}><Sprout size={14}/> OPERATIVOS</button>
              <button onClick={() => setActiveTab('CONTROL')} className={`px-6 py-3 rounded-2xl text-[11px] font-black transition-all flex items-center gap-2 ${activeTab === 'CONTROL' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400'}`}><LayoutGrid size={14}/> REGISTROS</button>
              <div className="h-6 w-px bg-slate-300 mx-2" />
              <button onClick={() => setIsVehicleReportOpen(true)} className="bg-red-600 text-white px-5 py-3 rounded-2xl text-[11px] font-black flex items-center gap-2 shadow-lg hover:bg-red-700 transition-all"><Camera size={14}/> REPORTE</button>
              <button onClick={() => setIsAttendanceOpen(true)} className="bg-white text-slate-600 border border-slate-200 px-5 py-3 rounded-2xl text-[11px] font-black shadow-sm flex items-center gap-2 hover:bg-indigo-50 transition-all"><Users size={14}/> ASISTENCIA</button>
              <button onClick={() => setIsTeamOpen(true)} className="bg-white text-blue-600 border border-blue-200 px-5 py-3 rounded-2xl text-[11px] font-black shadow-sm flex items-center gap-2 hover:bg-blue-50 transition-all"><UserPlus size={14}/> MI EQUIPO</button>
          </nav>

          {activeTab === 'RESUMEN' && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              <div className="lg:col-span-3 space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div onClick={() => setMapFilter(null)} className={`p-5 bg-white rounded-[2rem] border transition-all cursor-pointer h-32 flex flex-col justify-between ${!mapFilter ? 'border-emerald-500 shadow-md scale-[1.02]' : 'border-slate-200'}`}><Database className="text-emerald-500" size={22} /><div><span className="text-2xl font-black">{stats.catastro}</span><p className="text-[9px] font-black text-slate-400 uppercase">Catastro</p></div></div>
                    <div onClick={() => setMapFilter('RIEGO')} className={`p-5 bg-white rounded-[2rem] border transition-all cursor-pointer h-32 flex flex-col justify-between ${mapFilter === 'RIEGO' ? 'border-blue-500 shadow-md scale-[1.02]' : 'border-slate-200'}`}><Droplets className="text-blue-500" size={22} /><div><span className="text-2xl font-black">{stats.riego}</span><p className="text-[8px] font-black text-slate-400 uppercase">Falta Riego</p></div></div>
                    <div onClick={() => setMapFilter('ASEO')} className={`p-5 bg-white rounded-[2rem] border transition-all cursor-pointer h-32 flex flex-col justify-between ${mapFilter === 'ASEO' ? 'border-cyan-500 shadow-md scale-[1.02]' : 'border-slate-200'}`}><Trash2 className="text-cyan-500" size={22} /><div><span className="text-2xl font-black">{stats.aseo}</span><p className="text-[9px] font-black text-slate-400 uppercase">Falta Aseo</p></div></div>
                    <div onClick={() => setMapFilter('PODA')} className={`p-5 bg-white rounded-[2rem] border transition-all cursor-pointer h-32 flex flex-col justify-between ${mapFilter === 'PODA' ? 'border-amber-500 shadow-md scale-[1.02]' : 'border-slate-200'}`}><Scissors className="text-amber-500" size={22} /><div><span className="text-xl font-black">{stats.poda}</span><p className="text-[9px] font-black text-slate-400 uppercase">Falta Poda</p></div></div>
                    {/* SOLUCIÓN: Uso del icono Inbox en la tarjeta de Alertas */}
                    <div onClick={() => setMapFilter('PENDIENTES')} className={`p-5 bg-white rounded-[2rem] border transition-all cursor-pointer h-32 flex flex-col justify-between ${mapFilter === 'PENDIENTES' ? 'border-red-500 shadow-md scale-[1.02]' : 'border-slate-200'}`}><Inbox className="text-red-500" size={22} /><div><span className="text-2xl font-black">{stats.alertas}</span><p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Alertas <AlertOctagon size={8} className="inline"/></p></div></div>
                </div>
                <div className="h-[550px] bg-white rounded-[3rem] shadow-sm border border-slate-200 overflow-hidden relative">
                    <MapModule userRole={isAdmin ? 'Supervisor' : 'Inspector'} areas={areas} mapFilter={mapFilter} />
                </div>
              </div>

              {/* FEED MODERNO (Uso de Activity y ClipboardCheck) */}
              <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-200 h-[700px] flex flex-col">
                  <h3 className="font-black text-slate-800 flex items-center gap-2 uppercase italic text-[11px] mb-6 border-b border-slate-100 pb-4">
                    <Activity size={16} className="text-emerald-500 animate-pulse"/> Panel de Novedades
                  </h3>
                  <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-1">
                    {combinedFeed.map(item => (
                      <div key={item.id} className={`group relative p-4 bg-white rounded-2xl border-l-4 shadow-sm hover:shadow-md transition-all border border-slate-100 ${
                        item.type === 'ITS' ? 'border-l-indigo-500' : 
                        item.type === 'RIEGO' ? 'border-l-blue-500' : 
                        item.type === 'PODA' ? 'border-l-amber-500' : 'border-l-cyan-500'
                      }`}>
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-[8px] font-black text-slate-400 uppercase flex items-center gap-1"><Clock size={8}/> {item.time}</span>
                          <button onClick={() => handleResolveActivity(item)} className="bg-emerald-500 text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-md hover:bg-emerald-600 active:scale-90"><CheckCircle2 size={14}/></button>
                        </div>
                        <h4 className="font-black text-slate-800 text-[12px] leading-tight mb-1">{item.title}</h4>
                        <p className="text-[10px] text-slate-500 italic line-clamp-2 leading-relaxed mb-2">"{item.detail}"</p>
                        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-50">
                          <ClipboardCheck size={10} className="text-slate-300"/>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{item.author}</span>
                        </div>
                      </div>
                    ))}
                  </div>
              </div>
            </div>
          )}

          {activeTab === 'OPERATIVOS' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="flex items-center justify-between bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm">
                <div><h3 className="text-2xl font-black text-slate-800 flex items-center gap-3 uppercase italic"><Sprout className="text-emerald-500"/> Cuadrillas</h3><p className="text-slate-400 text-sm mt-1">Intervenciones actuales.</p></div>
                <button onClick={() => setIsAssignModalOpen(true)} className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 shadow-xl active:scale-95"><Plus size={18}/> Nueva Asignación</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeRoutes.map(route => (
                  <div key={route.id} className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm flex flex-col group">
                    <div className="flex justify-between items-start mb-6">
                      <div className="bg-emerald-500 text-white p-3 rounded-2xl shadow-lg shadow-emerald-100"><Sprout size={20}/></div>
                      <span className="text-[10px] font-black text-slate-400 flex items-center gap-1 uppercase tracking-tighter"><Clock size={12}/> {new Date(route.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                    <h4 className="text-xl font-black text-slate-800 mb-2">{route.zone_name}</h4>
                    <p className="text-xs text-slate-400 mb-8 font-bold uppercase tracking-tight">Resp: {route.operator_email.split('@')[0]}</p>
                    <button onClick={async () => { await supabase.from('cutting_routes').update({ status: 'FINALIZADO' }).eq('id', route.id); fetchAllData(); }} className="w-full py-4 bg-slate-50 text-slate-400 font-black text-[10px] uppercase rounded-2xl hover:text-red-500 hover:bg-red-50 transition-all">Finalizar</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'CONTROL' && (
            <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-200 animate-in fade-in">
              <div className="flex justify-between items-center mb-8">
                <h3 className="font-black text-slate-800 flex items-center gap-3 uppercase italic"><Truck className="text-indigo-600"/> Historial de Terreno</h3>
                <button onClick={() => {}} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase flex items-center gap-2 shadow-lg"><FileDown size={14}/> Exportar CSV</button>
              </div>
              <div className="overflow-hidden rounded-3xl border border-slate-100">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 font-black uppercase text-slate-400"><tr><th className="p-4 tracking-tighter">Fecha</th><th className="p-4 tracking-tighter">Plaza</th><th className="p-4 tracking-tighter">Tipo</th></tr></thead>
                  <tbody>{logs.map(log => (<tr key={log.id} className="border-t border-slate-50 hover:bg-slate-50/50"><td className="p-4 font-bold text-slate-500">{new Date(log.created_at).toLocaleDateString()}</td><td className="p-4 font-black">{log.green_areas?.name || 'S/N'}</td><td className="p-4 font-black text-indigo-600 uppercase">{log.activity_type}</td></tr>))}</tbody>
                </table>
              </div>
            </div>
          )}
      </main>

      <div className="fixed bottom-4 left-4 z-50 bg-white/90 backdrop-blur-md border border-slate-200 px-5 py-2.5 rounded-full flex items-center gap-3 shadow-xl">
        <ShieldCheck size={16} className={isAdmin ? "text-indigo-600" : "text-slate-400"}/>
        <span className="text-[9px] font-black uppercase tracking-widest text-slate-600">{isAdmin ? 'Master Supervisor' : 'Inspector'}</span>
      </div>
    </div>
  );
}