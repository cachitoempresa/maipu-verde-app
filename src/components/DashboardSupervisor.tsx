import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { BrandHeader } from './ui/BrandHeader';
import { MapModule } from './MapModule';
import { AttendanceModule } from './AttendanceModule'; 
import { TeamManagement } from './TeamManagement'; 
import { VehicleReportForm } from './VehicleReportForm';
import { InventoryForm } from './InventoryForm'; 
import { 
  Database, Droplets, Trash2, Scissors, LayoutGrid, 
  Camera, Users, UserPlus, Map as MapIcon, Sprout, Plus, 
  Loader2, Layers, AlertCircle, TrendingUp, Download,
  Filter, Image as ImageIcon, Check, Edit2, X, Activity,
  Route as RouteIcon
} from 'lucide-react';

// --- INTERFACES ---
interface GreenArea { id: number; code: string; name: string; path: [number, number][]; current_status: string; route_id?: number | null; has_catastro?: boolean; sector?: string; }
interface Route { id: number; nombre: string; color: string; sector: string; completada?: boolean; }
interface DbLog { 
  id: number; 
  created_at: string; 
  activity_type: string; 
  description: string; 
  operator_email: string; 
  image_url?: string;
  green_areas?: { name: string; sector: string }; 
}

export function DashboardSupervisor({ user, onLogout }: { user: { email: string }; onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState('RESUMEN'); 
  const [areas, setAreas] = useState<GreenArea[]>([]); 
  const [routes, setRoutes] = useState<Route[]>([]); 
  const [mapFilter, setMapFilter] = useState<string | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<number | null>(null);
  const [isCatastroMode, setIsCatastroMode] = useState(false);
  const [logs, setLogs] = useState<DbLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados de Control
  const [controlSector, setControlSector] = useState('TODOS');
  const [controlFilterType, setControlFilterType] = useState('TODO');

  // Estados Selección / Edición
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [editingRouteId, setEditingRouteId] = useState<number | null>(null);
  const [selectedAreaIds, setSelectedAreaIds] = useState<number[]>([]);
  const [newRouteName, setNewRouteName] = useState('');

  // Modales
  const [isAttendanceOpen, setIsAttendanceOpen] = useState(false);
  const [isVehicleReportOpen, setIsVehicleReportOpen] = useState(false);
  const [isTeamOpen, setIsTeamOpen] = useState(false);
  const [selectedInventoryArea, setSelectedInventoryArea] = useState<GreenArea | null>(null);

  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true);
      const [aData, rData, lData, invData] = await Promise.all([
        supabase.from('green_areas').select('*').not('path', 'is', null),
        supabase.from('rutas_corte').select('*').order('nombre'),
        supabase.from('logs').select('*, green_areas(name, sector)').order('created_at', { ascending: false }),
        supabase.from('inventory_items').select('area_id')
      ]);

      const registeredIds = new Set((invData.data || []).map((i: { area_id: number }) => i.area_id));
      if (aData.data) {
        setAreas((aData.data as GreenArea[]).map(a => ({ ...a, has_catastro: registeredIds.has(a.id) })));
      }
      if (rData.data) setRoutes(rData.data as Route[]);
      if (lData.data) setLogs(lData.data as DbLog[]);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAllData(); }, [fetchAllData]);

  // --- GESTIÓN DE RUTAS ---
  const toggleAreaSelection = (id: number) => {
    setSelectedAreaIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleEditRoute = (route: Route) => {
    setEditingRouteId(route.id);
    setNewRouteName(route.nombre);
    setSelectedAreaIds(areas.filter(a => a.route_id === route.id).map(a => a.id));
    setIsSelectionMode(true);
    setActiveTab('RUTAS');
  };

  const handleFinalizeRoute = async (id: number) => {
    if (!confirm("¿Finalizar esta ruta?")) return;
    await supabase.from('rutas_corte').update({ completada: true }).eq('id', id);
    await supabase.from('green_areas').update({ current_status: 'OK' }).eq('route_id', id);
    fetchAllData();
  };

  const handleSaveRoute = async () => {
    if (!newRouteName || selectedAreaIds.length === 0) return alert("Faltan datos");
    try {
      setLoading(true);
      let rId = editingRouteId;
      if (editingRouteId) {
        await supabase.from('rutas_corte').update({ nombre: newRouteName.toUpperCase() }).eq('id', editingRouteId);
        await supabase.from('green_areas').update({ route_id: null }).eq('route_id', editingRouteId);
      } else {
        const { data } = await supabase.from('rutas_corte').insert([{ nombre: newRouteName.toUpperCase(), sector: 'MAIPÚ', color: '#8B5CF6', completada: false }]).select().single();
        rId = data?.id;
      }
      if (rId) {
        await supabase.from('green_areas').update({ route_id: rId }).in('id', selectedAreaIds);
        setIsSelectionMode(false); setEditingRouteId(null); setSelectedAreaIds([]); setNewRouteName(''); fetchAllData();
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  // --- LÓGICA CONTROL ---
  const filteredLogs = useMemo(() => {
    return logs.filter(l => {
      const matchSector = controlSector === 'TODOS' || l.green_areas?.sector === controlSector;
      const matchType = controlFilterType === 'TODO' || l.activity_type === controlFilterType;
      return matchSector && matchType;
    });
  }, [logs, controlSector, controlFilterType]);

  const sectors = useMemo(() => {
    const s = new Set(areas.map(a => a.sector).filter(Boolean));
    return ['TODOS', ...Array.from(s)];
  }, [areas]);

  const downloadCSV = () => {
    const headers = ["Fecha,Hora,Sector,Area,Actividad,Comentario,Operador\n"];
    const rows = filteredLogs.map(l => {
      const date = new Date(l.created_at).toLocaleDateString();
      const time = new Date(l.created_at).toLocaleTimeString();
      return `${date},${time},${l.green_areas?.sector || 'N/A'},${l.green_areas?.name},${l.activity_type},"${l.description.replace(/"/g, '""')}",${l.operator_email}`;
    }).join("\n");
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CONTROL_MAIPU.csv`;
    a.click();
  };

  const stats = useMemo(() => ({
    catastro: areas.length,
    aseo: areas.filter(a => a.current_status === 'ASEO').length,
    riego: areas.filter(a => a.current_status === 'RIEGO').length,
    poda: areas.filter(a => a.current_status === 'PODA').length,
    cesped: areas.filter(a => a.current_status === 'CORTE' || a.route_id !== null).length,
  }), [areas]);

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-blue-600" size={40} /></div>;

  return (
    <div className="min-h-screen bg-[#F1F5F9] antialiased text-slate-900 pb-20 font-sans">
      <BrandHeader user={user} onLogout={onLogout} />
      
      <main className="max-w-[1600px] mx-auto px-6 mt-6 space-y-6">
        <nav className="flex items-center justify-between bg-white/50 p-2 rounded-[2rem] border border-white backdrop-blur-sm shadow-sm">
          <div className="flex items-center gap-2">
            <button onClick={() => setActiveTab('RESUMEN')} className={`px-6 py-3 rounded-2xl text-[10px] font-black flex items-center gap-2 transition-all ${activeTab === 'RESUMEN' ? 'bg-[#1E293B] text-white shadow-lg' : 'text-slate-400'}`}><MapIcon size={14}/> RESUMEN</button>
            <button onClick={() => setActiveTab('RUTAS')} className={`px-6 py-3 rounded-2xl text-[10px] font-black flex items-center gap-2 transition-all ${activeTab === 'RUTAS' ? 'bg-[#1E293B] text-white shadow-lg' : 'text-slate-400'}`}><RouteIcon size={14}/> RUTAS CORTE</button>
            <button onClick={() => setActiveTab('CATASTRO')} className={`px-6 py-3 rounded-2xl text-[10px] font-black flex items-center gap-2 transition-all ${activeTab === 'CATASTRO' ? 'bg-[#1E293B] text-white shadow-lg' : 'text-slate-400'}`}><LayoutGrid size={14}/> CATASTRO</button>
            <button onClick={() => setActiveTab('CONTROL')} className={`px-6 py-3 rounded-2xl text-[10px] font-black flex items-center gap-2 transition-all ${activeTab === 'CONTROL' ? 'bg-[#1E293B] text-white shadow-lg' : 'text-slate-400'}`}><AlertCircle size={14}/> CONTROL</button>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setIsVehicleReportOpen(true)} className="bg-[#D10000] text-white px-5 py-2.5 rounded-xl text-[10px] font-black flex items-center gap-2 shadow-lg active:scale-95 transition-all"><Camera size={14}/> MULTA AUTO</button>
            <button onClick={() => setIsAttendanceOpen(true)} className="bg-white text-slate-600 border border-slate-200 px-5 py-2.5 rounded-xl text-[10px] font-black flex items-center gap-2 shadow-sm"><Users size={14}/> ASISTENCIA</button>
            <button onClick={() => setIsTeamOpen(true)} className="bg-white text-blue-600 border border-blue-200 px-5 py-2.5 rounded-xl text-[10px] font-black shadow-sm flex items-center gap-2 hover:bg-blue-50 transition-all"><UserPlus size={14}/> EQUIPO</button>
          </div>
        </nav>

        {/* --- PESTAÑA RESUMEN --- */}
        {activeTab === 'RESUMEN' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in">
            <div className="lg:col-span-9 space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <StatCard icon={<Database className="text-emerald-500"/>} label="ÁREAS" value={stats.catastro} onClick={() => {setMapFilter(null); setSelectedRouteId(null);}} />
                <StatCard icon={<Trash2 className="text-slate-400"/>} label="ASEO" value={stats.aseo} onClick={() => setMapFilter('ASEO')} />
                <StatCard icon={<Droplets className="text-blue-500"/>} label="RIEGO" value={stats.riego} onClick={() => setMapFilter('RIEGO')} />
                <StatCard icon={<Scissors className="text-amber-500"/>} label="PODA" value={stats.poda} onClick={() => setMapFilter('PODA')} />
                <StatCard icon={<Sprout className="text-emerald-600"/>} label="CÉSPED" value={stats.cesped} onClick={() => setMapFilter('CORTE')} />
              </div>
              
              <div className="bg-white p-3 rounded-[2rem] border shadow-sm flex items-center gap-4 overflow-x-auto custom-scrollbar">
                <button onClick={() => setSelectedRouteId(null)} className={`px-4 py-2 rounded-xl text-[9px] font-black border ${!selectedRouteId ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-400'}`}>Todo</button>
                {routes.filter(r => !r.completada).map(r => (
                  <button key={r.id} onClick={() => setSelectedRouteId(r.id)} className={`px-4 py-2 rounded-xl text-[9px] font-black border flex items-center gap-2 ${selectedRouteId === r.id ? 'bg-[#1E293B] text-white shadow-md' : 'bg-white text-slate-500'}`}>
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: r.color }}></div>{r.nombre}
                  </button>
                ))}
              </div>

              <div className="h-[750px] bg-white rounded-[3rem] shadow-sm border overflow-hidden relative">
                <div className="absolute bottom-6 left-6 z-[1000] flex flex-col gap-2">
                   <MapBtn onClick={() => setIsCatastroMode(!isCatastroMode)} icon={<Layers size={16}/>} label="Ver Catastro" active={isCatastroMode} />
                </div>
                <MapModule 
                  areas={areas.filter(a => !selectedRouteId || a.route_id === selectedRouteId)} 
                  userEmail={user.email} mapFilter={mapFilter} onAreaUpdate={fetchAllData} isCatastroMode={isCatastroMode} 
                  onOpenInfra={(area: GreenArea) => setSelectedInventoryArea(area)} 
                  onOpenVehicleReport={() => setIsVehicleReportOpen(true)} 
                />
              </div>
            </div>
            <div className="lg:col-span-3">
              <div className="bg-white rounded-[2.5rem] border shadow-sm overflow-hidden flex flex-col h-full max-h-[850px]">
                <div className="p-6 border-b bg-slate-50 flex items-center gap-2"><TrendingUp size={16} className="text-emerald-500"/><h3 className="font-black text-slate-800 uppercase italic text-[11px]">Feed Operativo</h3></div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                  {logs.slice(0,25).map(l => (
                    <div key={l.id} className="p-4 rounded-[1.8rem] border bg-slate-50 border-slate-100 transition-all">
                      <span className="text-[8px] font-black uppercase text-slate-400">{new Date(l.created_at).toLocaleTimeString()}</span>
                      <h4 className="font-black text-[10px] uppercase text-slate-800 mt-1">{l.green_areas?.name}</h4>
                      <p className="text-[10px] italic leading-tight text-slate-500">"{l.description}"</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- PESTAÑA CONTROL (MANTENIDA) --- */}
        {activeTab === 'CONTROL' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="bg-[#0F172A] p-8 rounded-[3rem] shadow-2xl border border-white/5 flex flex-col lg:flex-row justify-between items-center gap-6">
              <div className="flex items-center gap-6">
                 <div className="bg-emerald-500/20 p-4 rounded-3xl border border-emerald-500/30"><Activity className="text-emerald-500 animate-pulse" size={32}/></div>
                 <div>
                    <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">Live Monitor</h2>
                    <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest italic">Conexión Terreno Activa</span>
                 </div>
              </div>
              <div className="flex flex-wrap items-center gap-4 bg-white/5 p-4 rounded-[2rem] border border-white/10">
                <div className="flex items-center gap-3 px-4 border-r border-white/10">
                   <Filter size={16} className="text-slate-400"/>
                   <select value={controlSector} onChange={e => setControlSector(e.target.value)} className="bg-transparent text-white font-black text-[11px] outline-none cursor-pointer">
                      {sectors.map(s => <option key={s} value={s || ''} className="bg-[#0F172A]">{s || 'SIN SECTOR'}</option>)}
                   </select>
                </div>
                <div className="flex items-center gap-3 px-4">
                   <select value={controlFilterType} onChange={e => setControlFilterType(e.target.value)} className="bg-transparent text-white font-black text-[11px] outline-none cursor-pointer">
                      <option value="TODO" className="bg-[#0F172A]">TODAS</option>
                      <option value="ALJIBE" className="bg-[#0F172A]">ALJIBE</option>
                      <option value="RIEGO" className="bg-[#0F172A]">RIEGO</option>
                      <option value="EMERGENCIA" className="bg-[#0F172A]">ITS</option>
                   </select>
                </div>
                <button onClick={downloadCSV} className="bg-white text-[#0F172A] px-6 py-3 rounded-2xl font-black text-[10px] uppercase flex items-center gap-2 hover:bg-emerald-400 transition-all active:scale-95 shadow-xl">
                   <Download size={14}/> CSV
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 overflow-y-auto max-h-[800px] pr-2 custom-scrollbar">
              {filteredLogs.map((log) => (
                <div key={log.id} className="bg-[#1E293B] border border-white/5 rounded-[2.5rem] p-6 hover:bg-[#243147] transition-all group">
                   <div className="grid grid-cols-1 md:grid-cols-5 items-center gap-6">
                      <div className="flex items-center gap-4 border-r border-white/10 pr-6">
                         <div className={`p-3 rounded-2xl ${log.activity_type === 'EMERGENCIA' ? 'bg-red-500/20 text-red-500' : 'bg-emerald-500/20 text-emerald-400'}`}><Sprout size={24}/></div>
                         <div>
                            <span className="text-[10px] font-black text-slate-500 uppercase block">{new Date(log.created_at).toLocaleTimeString()}</span>
                            <h4 className="text-white font-black text-sm uppercase">{log.activity_type}</h4>
                         </div>
                      </div>
                      <div className="flex flex-col border-r border-white/10 pr-6">
                         <span className="text-[9px] font-black text-emerald-500 uppercase italic">{log.green_areas?.sector || 'MAIPÚ'}</span>
                         <h4 className="text-white font-black text-md uppercase">{log.green_areas?.name}</h4>
                      </div>
                      <div className="md:col-span-2 flex items-center gap-4 border-r border-white/10 pr-6">
                         <p className="text-slate-300 text-xs italic font-medium leading-relaxed">"{log.description}"</p>
                      </div>
                      <div className="flex justify-between items-center pl-4">
                         <span className="text-white font-bold text-[10px]">{log.operator_email.split('@')[0].toUpperCase()}</span>
                         {log.image_url ? (
                           <a href={`${supabase.storage.from('evidence').getPublicUrl(log.image_url).data.publicUrl}`} target="_blank" className="bg-emerald-500 p-3 rounded-2xl text-[#0F172A] hover:scale-110 transition-all shadow-lg shadow-emerald-500/20">
                              <ImageIcon size={20}/>
                           </a>
                         ) : <ImageIcon size={20} className="text-slate-700"/>}
                      </div>
                   </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- PESTAÑA RUTAS (MANTENIDA) --- */}
        {activeTab === 'RUTAS' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in">
             <div className="lg:col-span-4 bg-white p-8 rounded-[3rem] shadow-xl border border-slate-100 flex flex-col gap-6">
                {!isSelectionMode ? (
                  <div className="text-center py-10 space-y-4">
                    <div className="bg-blue-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto text-blue-600"><Plus size={40}/></div>
                    <h3 className="text-xl font-black uppercase italic">Planificar Ruta</h3>
                    <button onClick={() => setIsSelectionMode(true)} className="w-full bg-blue-600 text-white py-4 rounded-[2rem] font-black uppercase shadow-xl">Nueva Selección</button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center"><span className="bg-orange-500 text-white px-4 py-1 rounded-full text-[10px] font-black">{editingRouteId ? 'EDITANDO' : 'NUEVA'}</span><button onClick={() => {setIsSelectionMode(false); setEditingRouteId(null); setSelectedAreaIds([]);}}><X size={20}/></button></div>
                    <input type="text" value={newRouteName} onChange={e => setNewRouteName(e.target.value)} placeholder="Nombre..." className="w-full bg-slate-50 border-2 rounded-2xl p-4 font-bold outline-none" />
                    <div className="bg-blue-50 p-6 rounded-[2rem] text-center border border-blue-100"><span className="block text-5xl font-black text-blue-600">{selectedAreaIds.length}</span><span className="text-[10px] font-black text-blue-400 uppercase">Seleccionadas</span></div>
                    <button onClick={handleSaveRoute} className="w-full bg-emerald-500 text-white py-5 rounded-[2rem] font-black uppercase shadow-xl flex items-center justify-center gap-2"><Check size={20}/> Guardar</button>
                  </div>
                )}
                <div className="border-t pt-6">
                   <h4 className="text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest">Rutas Activas</h4>
                   <div className="space-y-2 max-h-[300px] overflow-y-auto">
                     {routes.filter(r => !r.completada).map(r => (
                       <div key={r.id} className="group flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 transition-all hover:border-blue-300">
                         <span className="text-[10px] font-black uppercase text-slate-600">{r.nombre}</span>
                         <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                            <button onClick={() => handleFinalizeRoute(r.id)} className="p-2 bg-emerald-100 text-emerald-600 rounded-lg hover:bg-emerald-600 hover:text-white"><Check size={12}/></button>
                            <button onClick={() => handleEditRoute(r)} className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white"><Edit2 size={12}/></button>
                         </div>
                       </div>
                     ))}
                   </div>
                </div>
             </div>
             <div className="lg:col-span-8 relative">
                <div className={`h-[750px] bg-white rounded-[3.5rem] border-4 shadow-2xl overflow-hidden transition-all ${isSelectionMode ? 'border-orange-400 ring-8 ring-orange-50' : 'border-white'}`}>
                   <MapModule areas={areas} userEmail={user.email} onAreaUpdate={fetchAllData} isCatastroMode={false} isSelectionMode={isSelectionMode} selectedAreaIds={selectedAreaIds} onToggleSelection={toggleAreaSelection} onOpenVehicleReport={() => setIsVehicleReportOpen(true)} onOpenInfra={(area: GreenArea) => setSelectedInventoryArea(area)} />
                </div>
             </div>
          </div>
        )}

        {/* --- PESTAÑA CATASTRO (SOLO ÁREAS CON DATOS) --- */}
        {activeTab === 'CATASTRO' && (
          <div className="animate-in fade-in h-[750px] bg-white rounded-[3.5rem] border border-slate-200 overflow-hidden shadow-sm relative">
             {/* INDICADOR DE PROGRESO */}
             <div className="absolute top-6 left-6 z-[1000] bg-[#1E293B] text-white px-6 py-4 rounded-[2rem] shadow-2xl border border-white/10 backdrop-blur-md">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400 mb-1">Catastro Técnico</h3>
                <p className="text-lg font-black leading-none">{areas.filter(a => a.has_catastro).length} Plazas Registradas</p>
                <div className="w-full bg-white/10 h-1 rounded-full mt-3 overflow-hidden">
                   <div 
                     className="bg-emerald-500 h-full transition-all duration-1000" 
                     style={{ width: `${(areas.filter(a => a.has_catastro).length / areas.length) * 100}%` }}
                   ></div>
                </div>
             </div>

             <MapModule 
               // MODIFICACIÓN CLAVE: Solo pasamos las áreas que ya tienen catastro
               areas={areas.filter(a => a.has_catastro)} 
               userEmail={user.email} 
               onAreaUpdate={fetchAllData} 
               isCatastroMode={true} 
               onOpenInfra={(area: GreenArea) => setSelectedInventoryArea(area)} 
               onOpenVehicleReport={() => setIsVehicleReportOpen(true)} 
             />
          </div>
        )}
      </main>

      {/* MODALES */}
      {isAttendanceOpen && <AttendanceModule userEmail={user.email} onClose={() => setIsAttendanceOpen(false)} />}
      {isTeamOpen && <TeamManagement userEmail={user.email} onClose={() => setIsTeamOpen(false)} />}
      {isVehicleReportOpen && <VehicleReportForm userEmail={user.email} onClose={() => setIsVehicleReportOpen(false)} />}
      {selectedInventoryArea && <InventoryForm area={selectedInventoryArea} userEmail={user.email} onClose={() => setSelectedInventoryArea(null)} onSuccess={fetchAllData} />}
    </div>
  );
}

// --- SUBCOMPONENTES ---
interface StatCardProps { icon: React.ReactNode; label: string; value: number; onClick: () => void; }
function StatCard({ icon, label, value, onClick }: StatCardProps) {
  return (
    <div onClick={onClick} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between h-32 cursor-pointer hover:shadow-md transition-all active:scale-95">
      <div className="bg-slate-50 w-fit p-2 rounded-xl">{icon}</div>
      <div><span className="text-2xl font-black block leading-none">{value}</span><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1 italic">{label}</p></div>
    </div>
  );
}

interface MapBtnProps { icon: React.ReactNode; label: string; onClick: () => void; active: boolean; }
function MapBtn({ icon, label, onClick, active }: MapBtnProps) {
  return (
    <button onClick={onClick} className={`flex items-center gap-2 bg-white px-4 py-2.5 rounded-xl font-bold text-[11px] text-slate-700 shadow-xl border-2 transition-all ${active ? 'border-blue-500 bg-blue-50' : 'border-transparent hover:bg-slate-50'}`}>{icon} {label}</button>
  );
}