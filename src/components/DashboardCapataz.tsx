import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Users, Map as MapIcon, ClipboardCheck, 
  Truck, Droplets, MessageSquare, LogOut, Bell, Menu, 
  Camera, AlertTriangle, CheckCircle2,
  Play, Check, ArrowLeft, Loader2
} from 'lucide-react';

// Módulos existentes
import { AttendanceModule } from './AttendanceModule';
import { MapModule } from './MapModule';
import { TeamManagement } from './TeamManagement';
import { VehicleReportForm } from './VehicleReportForm';

// --- INTERFACES ---
interface GreenArea { 
  id: number; 
  name: string; 
  code: string; 
  path: [number, number][]; 
  current_status: string; 
}

interface Notification {
  id: number;
  area_id: number;
  type: string;
  description: string;
  status: 'PENDIENTE' | 'PROCESO' | 'COMPLETADO';
  is_read: boolean;
  created_at: string;
  green_areas: {
    name: string;
    code: string;
  };
}

export function DashboardCapataz({ user, onLogout }: { user: { email: string }; onLogout: () => void }) {
  const [activeModule, setActiveModule] = useState<string | null>(null);
  const [areas, setAreas] = useState<GreenArea[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estados para Pop-up y Notificaciones
  const [showPopup, setShowPopup] = useState(false);
  const [latestNotif, setLatestNotif] = useState<Notification | null>(null);

  // Estados para Formularios y Cámara
  const [uploading, setUploading] = useState(false);
  const [tempImageUrl, setTempImageUrl] = useState<string | null>(null);
  const [gasfiteriaData, setGasfiteriaData] = useState({ areaId: '', urgency: '', detail: '' });
  const [charlaData, setCharlaData] = useState({ type: '', description: '' });

  // 1. CARGA DE DATOS Y SINCRONIZACIÓN
  const fetchAllData = useCallback(async () => {
    try {
      const { data: areasData } = await supabase
        .from('green_areas')
        .select('*')
        .not('path', 'is', null)
        .order('name');
      if (areasData) setAreas(areasData);

      const { data: notifs } = await supabase
        .from('notifications_capataz')
        .select('*, green_areas(name, code)')
        .eq('assigned_to', user.email.toLowerCase())
        .order('created_at', { ascending: false });

      if (notifs) {
        const castNotifs = notifs as unknown as Notification[];
        setNotifications(castNotifs);
        const unread = castNotifs.find(n => !n.is_read && n.status === 'PENDIENTE');
        if (unread) {
          setLatestNotif(unread);
          setShowPopup(true);
        }
      }
    } catch (error) {
      console.error("Error de sincronización:", error);
    } finally {
      setLoading(false);
    }
  }, [user.email]);

  useEffect(() => {
    fetchAllData();
    const channel = supabase.channel('capataz-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications_capataz' }, () => fetchAllData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'green_areas' }, () => fetchAllData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchAllData]);

  // 2. LÓGICA DE CÁMARA (SUBIDA A STORAGE)
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, folder: string) => {
    try {
      setUploading(true);
      const file = event.target.files?.[0];
      if (!file) return;

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${folder}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('evidencias')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('evidencias').getPublicUrl(filePath);
      setTempImageUrl(data.publicUrl);
    } catch (error) {
      alert("Error al subir la imagen");
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  // 3. ENVÍO DE FORMULARIOS
  const updateNotifStatus = async (notifId: number, areaId: number, newStatus: 'PENDIENTE' | 'PROCESO' | 'COMPLETADO') => {
    await supabase.from('notifications_capataz').update({ status: newStatus, is_read: true }).eq('id', notifId);
    const areaStatus = newStatus === 'PROCESO' ? 'EN CURSO' : newStatus === 'COMPLETADO' ? 'OK' : 'PENDIENTE';
    await supabase.from('green_areas').update({ current_status: areaStatus }).eq('id', areaId);
    setShowPopup(false);
    fetchAllData();
  };

  const handleGasfiteriaSubmit = async () => {
    if (!gasfiteriaData.areaId || !gasfiteriaData.urgency) return alert("Completa los datos");
    const selectedArea = areas.find(a => a.id === Number(gasfiteriaData.areaId));
    await supabase.from('requests').insert([{
      sender: `CAPATAZ: ${user.email}`,
      description: `[GASFITERÍA - ${gasfiteriaData.urgency}] Plaza: ${selectedArea?.code} - ${selectedArea?.name}. Detalle: ${gasfiteriaData.detail}`,
      status: 'PENDIENTE',
      image_url: tempImageUrl 
    }]);
    alert("Reporte enviado.");
    setTempImageUrl(null);
    setActiveModule(null);
  };

  const handleCharlaSubmit = async () => {
    if (!charlaData.type) return alert("Selecciona tipo de charla");
    await supabase.from('logs').insert([{
      activity_type: 'CHARLA',
      operator_email: user.email,
      description: `Charla ${charlaData.type}: ${charlaData.description}`,
      image_url: tempImageUrl 
    }]);
    alert("Registro guardado con evidencia.");
    setTempImageUrl(null);
    setActiveModule(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-[#10A34F]" size={40} />
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sincronizando Sol Poniente...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F1F5F9] flex flex-col font-sans select-none overflow-hidden">
      
      {/* HEADER INSTITUCIONAL */}
      <header className="bg-[#10A34F] p-4 text-white flex flex-col shadow-lg sticky top-0 z-[100]">
        <div className="flex justify-between items-center mb-2">
          <button className="p-2 active:scale-90 transition-all"><Menu size={28} /></button>
          
          <div className="flex flex-col items-center">
             <img src="/logo-empresa.png" alt="Sol Poniente" className="h-14 w-auto object-contain mb-1 drop-shadow-lg" />
             <span className="text-[10px] font-black tracking-tighter uppercase">Sol Poniente</span>
          </div>

          <button onClick={() => setActiveModule('NOTIFICACIONES')} className={`p-2 relative rounded-xl ${notifications.some(n => !n.is_read) ? 'bg-white/20' : ''}`}>
            <Bell size={28} />
            {notifications.some(n => !n.is_read) && <span className="absolute top-2 right-2 w-3 h-3 bg-red-500 rounded-full border-2 border-[#10A34F] animate-pulse"></span>}
          </button>
        </div>
        <div className="flex justify-between items-end mt-1">
            <button onClick={onLogout} className="text-[9px] font-black uppercase flex items-center gap-1 opacity-80 active:text-red-200 transition-colors">
                <LogOut size={10}/> Salir
            </button>
            <span className="text-[10px] font-black italic tracking-widest bg-black/20 px-4 py-1 rounded-full uppercase tracking-tighter">Capataz Operativo</span>
        </div>
      </header>

      {/* POP-UP TAREA NUEVA */}
      {showPopup && latestNotif && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-[3rem] w-full max-w-sm overflow-hidden shadow-2xl border-t-[12px] border-[#FF914D]">
             <div className="p-8 text-center space-y-5">
                <AlertTriangle size={44} className="mx-auto text-[#FF914D]" />
                <h3 className="text-xl font-black text-slate-800 uppercase italic leading-none">Nueva Tarea</h3>
                <div className="bg-slate-50 p-4 rounded-2xl text-sm font-black uppercase">{latestNotif.green_areas?.name}</div>
                <button onClick={() => updateNotifStatus(latestNotif.id, latestNotif.area_id, 'PROCESO')} className="w-full py-5 bg-[#10A34F] text-white rounded-2xl font-black text-xs uppercase shadow-xl active:scale-95">Iniciar ahora</button>
                <button onClick={() => setShowPopup(false)} className="w-full py-2 text-slate-400 font-black text-[10px] uppercase">Cerrar</button>
             </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {!activeModule && (
          <main className="p-6 animate-in fade-in">
            <div className="grid grid-cols-2 gap-4 w-full max-w-sm mx-auto">
              <button onClick={() => setActiveModule('ASISTENCIA')} className="bg-[#FF914D] text-white flex flex-col items-center justify-center p-6 rounded-[3rem] shadow-xl aspect-square border-b-8 border-black/10"><ClipboardCheck size={44} className="mb-3" /><span className="font-black text-[12px]">ASISTENCIA</span></button>
              <button onClick={() => setActiveModule('MAPA')} className="bg-[#FF914D] text-white flex flex-col items-center justify-center p-6 rounded-[3rem] shadow-xl aspect-square border-b-8 border-black/10"><MapIcon size={44} className="mb-3" /><span className="font-black text-[12px]">MAPA</span></button>
              <button onClick={() => setActiveModule('CHARLA')} className="bg-[#0F172A] text-white flex flex-col items-center justify-center p-6 rounded-[3rem] shadow-xl aspect-square border-b-8 border-black/10"><MessageSquare size={44} className="mb-3" /><span className="font-black text-[12px]">CHARLA</span></button>
              <button onClick={() => setActiveModule('EQUIPO')} className="bg-[#0F172A] text-white flex flex-col items-center justify-center p-6 rounded-[3rem] shadow-xl aspect-square border-b-8 border-black/10"><Users size={44} className="mb-3" /><span className="font-black text-[12px]">EQUIPO</span></button>
              <button onClick={() => setActiveModule('VEHICULO')} className="bg-[#0F172A] text-white flex flex-col items-center justify-center p-6 rounded-[3rem] shadow-xl aspect-square border-b-8 border-black/10"><Truck size={44} className="mb-3" /><span className="font-black text-[12px]">VEHÍCULO</span></button>
              <button onClick={() => setActiveModule('GASFITERIA')} className="bg-[#0F172A] text-white flex flex-col items-center justify-center p-6 rounded-[3rem] shadow-xl aspect-square border-b-8 border-black/10"><Droplets size={44} className="mb-3" /><span className="font-black text-[12px]">GASFITERÍA</span></button>
            </div>
          </main>
        )}

        {activeModule === 'NOTIFICACIONES' && (
          <div className="p-6 space-y-6 animate-in slide-in-from-top pb-24">
            <div className="flex justify-between items-center"><h3 className="font-black text-slate-800 uppercase italic flex items-center gap-2"><Bell className="text-[#FF914D]" /> Notificaciones</h3><button onClick={() => setActiveModule(null)} className="flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-xl text-[10px] font-black uppercase text-slate-500"><ArrowLeft size={14}/> Volver</button></div>
            <div className="space-y-4">
              {notifications.map((n) => (
                <div key={n.id} className="bg-white rounded-[2rem] shadow-md flex overflow-hidden border border-slate-100">
                  <div className={`w-3 ${n.status === 'COMPLETADO' ? 'bg-emerald-500' : n.status === 'PROCESO' ? 'bg-blue-500' : 'bg-red-500 animate-pulse'}`} />
                  <div className="flex-1 p-5 flex flex-col gap-3">
                    <h4 className="font-black text-slate-800 text-[13px] uppercase leading-tight">{n.green_areas?.name}</h4>
                    <div className="bg-slate-50 p-3 rounded-xl italic text-[11px] text-slate-600">"{n.description}"</div>
                    <div className="flex gap-2">
                      {n.status === 'PENDIENTE' && <button onClick={() => updateNotifStatus(n.id, n.area_id, 'PROCESO')} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase flex items-center justify-center gap-2 shadow-lg active:scale-95"><Play size={12}/> Iniciar</button>}
                      {n.status === 'PROCESO' && <button onClick={() => updateNotifStatus(n.id, n.area_id, 'COMPLETADO')} className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase flex items-center justify-center gap-2 shadow-lg active:scale-95"><Check size={12}/> Terminar</button>}
                      {n.status === 'COMPLETADO' && <div className="flex-1 py-3 bg-slate-100 text-emerald-600 rounded-xl font-black text-[10px] uppercase text-center"><CheckCircle2 size={12} className="inline mr-2"/> Realizada</div>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeModule && activeModule !== 'NOTIFICACIONES' && (
            <div className="flex flex-col h-full">
                <div className="px-6 pt-4"><button onClick={() => { setActiveModule(null); setTempImageUrl(null); }} className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-xl text-[10px] font-black uppercase text-slate-500 shadow-sm"><ArrowLeft size={14}/> Volver al menú</button></div>
                
                {activeModule === 'ASISTENCIA' && <AttendanceModule userEmail={user.email} onClose={() => setActiveModule(null)} />}
                
                {activeModule === 'MAPA' && (
                    <div className="fixed inset-0 bg-white z-[200] flex flex-col animate-in slide-in-from-bottom duration-300">
                        <div className="bg-slate-900 p-4 text-white flex justify-between items-center shadow-lg">
                            <div className="flex items-center gap-2"><MapIcon size={18} className="text-emerald-400" /><span className="font-black text-[11px] uppercase italic tracking-widest">Mapa Interactivo</span></div>
                            <button onClick={() => setActiveModule(null)} className="p-2 bg-white/10 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase px-4"><ArrowLeft size={16}/> Volver</button>
                        </div>
                        <div className="flex-1 relative">
                          <MapModule userRole="Supervisor" areas={areas} mapFilter={null} />
                        </div>
                    </div>
                )}

                {activeModule === 'EQUIPO' && <TeamManagement userEmail={user.email} onClose={() => setActiveModule(null)} />}
                {activeModule === 'VEHICULO' && <VehicleReportForm userEmail={user.email} onClose={() => setActiveModule(null)} />}

                {activeModule === 'GASFITERIA' && (
                  <div className="p-6 space-y-6 pb-20 overflow-y-auto">
                    <h3 className="font-black text-slate-800 uppercase italic flex items-center gap-2 border-b pb-4"><Droplets className="text-blue-600"/> Gasfitería</h3>
                    <div className="space-y-4">
                        <select className="w-full p-5 rounded-[1.5rem] bg-white border-2 border-slate-100 font-bold text-sm shadow-sm outline-none" onChange={(e) => setGasfiteriaData({...gasfiteriaData, areaId: e.target.value})}>
                            <option value="">Buscar en el catastro...</option>
                            {areas.map(a => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
                        </select>
                        <div className="space-y-2">
                            {['ALTA', 'MEDIA', 'BAJA'].map(urg => (
                                <button key={urg} onClick={() => setGasfiteriaData({...gasfiteriaData, urgency: urg})} className={`w-full p-4 rounded-2xl text-left border-2 flex items-center justify-between transition-all ${gasfiteriaData.urgency === urg ? 'border-red-500 bg-red-50 ring-2 ring-red-200' : 'border-slate-100 bg-white'}`}>
                                    <span className={`font-black text-xs uppercase ${urg === 'ALTA' ? 'text-red-600' : 'text-slate-700'}`}>{urg}</span>
                                    {urg === 'ALTA' ? <AlertTriangle className="text-red-500"/> : <CheckCircle2 className="text-indigo-400"/>}
                                </button>
                            ))}
                        </div>
                        <div className="flex flex-col items-center justify-center gap-3 bg-white p-8 rounded-[2rem] border-4 border-dashed border-slate-100 relative">
                            {tempImageUrl ? <img src={tempImageUrl} className="w-full h-32 object-cover rounded-xl" alt="Preview"/> : 
                            uploading ? <Loader2 className="animate-spin text-blue-500" size={32}/> : <Camera size={32} className="text-slate-200"/>}
                            <p className="text-[9px] font-black text-slate-400 uppercase">{uploading ? 'Subiendo...' : 'Foto del Daño'}</p>
                            <input type="file" accept="image/*" capture="environment" onChange={(e) => handleFileUpload(e, 'gasfiteria')} className="absolute inset-0 opacity-0" />
                        </div>
                        <textarea placeholder="Detalle técnico..." className="w-full p-5 rounded-2xl bg-white border-2 border-slate-100 font-bold text-sm min-h-[100px]" onChange={(e) => setGasfiteriaData({...gasfiteriaData, detail: e.target.value})} />
                        <button onClick={handleGasfiteriaSubmit} disabled={uploading} className="w-full py-5 bg-[#0F172A] text-white rounded-[2rem] font-black uppercase text-xs shadow-xl active:scale-95">Reportar Falla</button>
                    </div>
                  </div>
                )}

                {activeModule === 'CHARLA' && (
                  <div className="p-6 space-y-6 pb-20 overflow-y-auto">
                    <h3 className="font-black text-slate-800 uppercase italic flex items-center gap-2 border-b pb-4"><MessageSquare className="text-emerald-600"/> Charla Diaria</h3>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-2">
                            {['SEGURIDAD', 'EPP', 'RIEGO', 'OTROS'].map(t => (
                            <button key={t} onClick={() => setCharlaData({...charlaData, type: t})} className={`p-4 rounded-2xl font-black text-[10px] border-2 transition-all ${charlaData.type === t ? 'bg-[#10A34F] text-white shadow-lg scale-105' : 'bg-white border-slate-100 text-slate-400'}`}>{t}</button>
                            ))}
                        </div>
                        <div className="flex flex-col items-center justify-center gap-3 bg-white p-8 rounded-[2rem] border-4 border-dashed border-slate-100 relative">
                            {tempImageUrl ? <img src={tempImageUrl} className="w-full h-32 object-cover rounded-xl" alt="Preview"/> : 
                            uploading ? <Loader2 className="animate-spin text-emerald-500" size={32}/> : <Camera size={32} className="text-slate-200"/>}
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{uploading ? 'Subiendo...' : 'Capturar Evidencia'}</p>
                            <input type="file" accept="image/*" capture="environment" onChange={(e) => handleFileUpload(e, 'charlas')} className="absolute inset-0 opacity-0" />
                        </div>
                        <textarea placeholder="Temas tratados..." className="w-full p-6 rounded-[2rem] bg-white border-2 border-slate-100 font-bold text-sm min-h-[150px]" onChange={(e) => setCharlaData({...charlaData, description: e.target.value})} />
                        <button onClick={handleCharlaSubmit} disabled={uploading} className="w-full py-5 bg-[#10A34F] text-white rounded-[2rem] font-black uppercase text-xs shadow-xl transition-all active:scale-95">Guardar Registro</button>
                    </div>
                  </div>
                )}
            </div>
        )}
      </div>

      <footer className="bg-[#10A34F] h-12 w-full flex items-center justify-center shadow-inner z-50">
          <p className="text-[7px] text-white/40 font-black uppercase tracking-[0.5em]">Operaciones Sol Poniente • Maipú</p>
      </footer>
    </div>
  );
}