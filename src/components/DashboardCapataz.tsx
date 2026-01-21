import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Users, Map as MapIcon, ClipboardCheck, 
  Truck, Droplets, MessageSquare, Bell, Menu, 
  Camera, AlertTriangle, ArrowLeft, Loader2
} from 'lucide-react';

// Importación de todos los módulos
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
  
  const [showPopup, setShowPopup] = useState(false);
  const [latestNotif, setLatestNotif] = useState<Notification | null>(null);

  const [uploading, setUploading] = useState(false);
  const [tempImageUrl, setTempImageUrl] = useState<string | null>(null);
  const [gasfiteriaData, setGasfiteriaData] = useState({ areaId: '', urgency: '', detail: '' });
  const [charlaData, setCharlaData] = useState({ type: '', description: '' });

  const fetchAllData = useCallback(async () => {
    try {
      const { data: areasData } = await supabase.from('green_areas').select('*').not('path', 'is', null).order('name');
      if (areasData) setAreas(areasData as GreenArea[]);

      const { data: notifs } = await supabase.from('notifications_capataz').select('*, green_areas(name, code)').eq('assigned_to', user.email.toLowerCase()).order('created_at', { ascending: false });

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
      console.error("Error sincronizando:", error);
    } finally {
      setLoading(false);
    }
  }, [user.email]);

  useEffect(() => {
    fetchAllData();
    const channel = supabase.channel('capataz-realtime').on('postgres_changes', { event: '*', schema: 'public', table: 'notifications_capataz' }, () => fetchAllData()).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchAllData]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, folder: string) => {
    try {
      setUploading(true);
      const file = event.target.files?.[0];
      if (!file) return;
      const fileName = `${Date.now()}.${file.name.split('.').pop()}`;
      const { error } = await supabase.storage.from('evidencias').upload(`${folder}/${fileName}`, file);
      if (error) throw error;
      const { data } = supabase.storage.from('evidencias').getPublicUrl(`${folder}/${fileName}`);
      setTempImageUrl(data.publicUrl);
    } catch {
      alert("Error al subir foto");
    } finally {
      setUploading(false);
    }
  };

  const handleGasfiteriaSubmit = async () => {
    if (!gasfiteriaData.areaId || !gasfiteriaData.urgency) return alert("Completa los datos");
    const selectedArea = areas.find(a => a.id === Number(gasfiteriaData.areaId));
    await supabase.from('requests').insert([{
      sender: `CAPATAZ: ${user.email}`,
      description: `[GASFITERÍA - ${gasfiteriaData.urgency}] Plaza: ${selectedArea?.name}. Detalle: ${gasfiteriaData.detail}`,
      status: 'PENDIENTE',
      image_url: tempImageUrl 
    }]);
    alert("Reporte enviado");
    setTempImageUrl(null);
    setActiveModule(null);
  };

  const handleCharlaSubmit = async () => {
    if (!charlaData.type) return alert("Selecciona tipo");
    await supabase.from('logs').insert([{
      activity_type: 'CHARLA',
      operator_email: user.email,
      description: `Charla de ${charlaData.type}: ${charlaData.description}`,
      image_url: tempImageUrl 
    }]);
    alert("Charla guardada");
    setTempImageUrl(null);
    setActiveModule(null);
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500" size={40} /></div>;

  return (
    <div className="min-h-screen bg-[#F1F5F9] flex flex-col overflow-hidden">
      {/* HEADER */}
      <header className="bg-[#10A34F] p-4 text-white flex flex-col shadow-lg sticky top-0 z-[100]">
        <div className="flex justify-between items-center mb-2">
          <Menu size={28} />
          <img src="/logo-empresa.png" alt="Sol Poniente" className="h-14 drop-shadow-lg" />
          <button onClick={() => setActiveModule('NOTIFICACIONES')} className="relative">
            <Bell size={28} />
            {notifications.some(n => !n.is_read) && <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-[#10A34F]"></span>}
          </button>
        </div>
        <div className="flex justify-between items-end mt-1">
          <button onClick={onLogout} className="text-[9px] font-black uppercase flex items-center gap-1 opacity-80 underline underline-offset-4">CERRAR SESIÓN</button>
          <span className="text-[10px] font-black italic bg-black/20 px-4 py-1 rounded-full uppercase tracking-tighter">Capataz Operativo</span>
        </div>
      </header>

      {/* POP-UP NOTIFICACIÓN */}
      {showPopup && latestNotif && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm">
          <div className="bg-white rounded-[3rem] w-full max-w-sm p-8 text-center space-y-5 border-t-[12px] border-[#FF914D]">
             <AlertTriangle size={44} className="mx-auto text-[#FF914D]" />
             <h3 className="text-xl font-black uppercase text-slate-800 italic">Nueva Solicitud</h3>
             <div className="bg-slate-50 p-4 rounded-2xl font-bold uppercase">{latestNotif.green_areas?.name}</div>
             <p className="text-xs text-slate-400 italic">"{latestNotif.description}"</p>
             <button onClick={() => setShowPopup(false)} className="w-full py-5 bg-[#10A34F] text-white rounded-2xl font-black shadow-xl">ENTENDIDO</button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {!activeModule ? (
          <main className="p-6 grid grid-cols-2 gap-4">
            <button onClick={() => setActiveModule('ASISTENCIA')} className="bg-[#FF914D] text-white p-6 rounded-[3rem] shadow-xl aspect-square flex flex-col items-center justify-center active:scale-95 transition-all"><ClipboardCheck size={44}/><span className="font-black text-[11px] mt-2 uppercase">Asistencia</span></button>
            <button onClick={() => setActiveModule('MAPA')} className="bg-[#FF914D] text-white p-6 rounded-[3rem] shadow-xl aspect-square flex flex-col items-center justify-center active:scale-95 transition-all"><MapIcon size={44}/><span className="font-black text-[11px] mt-2 uppercase">Mapa</span></button>
            <button onClick={() => setActiveModule('EQUIPO')} className="bg-[#0F172A] text-white p-6 rounded-[3rem] shadow-xl aspect-square flex flex-col items-center justify-center active:scale-95 transition-all"><Users size={44}/><span className="font-black text-[11px] mt-2 uppercase">Equipo</span></button>
            <button onClick={() => setActiveModule('VEHICULO')} className="bg-[#0F172A] text-white p-6 rounded-[3rem] shadow-xl aspect-square flex flex-col items-center justify-center active:scale-95 transition-all"><Truck size={44}/><span className="font-black text-[11px] mt-2 uppercase">Vehículo</span></button>
            <button onClick={() => setActiveModule('CHARLA')} className="bg-[#0F172A] text-white p-6 rounded-[3rem] shadow-xl aspect-square flex flex-col items-center justify-center active:scale-95 transition-all"><MessageSquare size={44}/><span className="font-black text-[11px] mt-2 uppercase">Charla</span></button>
            <button onClick={() => setActiveModule('GASFITERIA')} className="bg-[#0F172A] text-white p-6 rounded-[3rem] shadow-xl aspect-square flex flex-col items-center justify-center active:scale-95 transition-all"><Droplets size={44}/><span className="font-black text-[11px] mt-2 uppercase">Gasfitería</span></button>
          </main>
        ) : (
          <div className="p-6">
            <button onClick={() => {setActiveModule(null); setTempImageUrl(null);}} className="mb-6 flex items-center gap-2 font-black text-[10px] uppercase text-slate-500 bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100"><ArrowLeft size={16}/> Volver al Menú</button>
            
            {activeModule === 'NOTIFICACIONES' && (
              <div className="space-y-4">
                <h3 className="font-black text-slate-800 uppercase italic">Historial de Alertas</h3>
                {notifications.map(n => (
                  <div key={n.id} className="bg-white p-5 rounded-[2rem] shadow-md border-l-8 border-[#FF914D]">
                    <h4 className="font-black text-slate-800 text-sm uppercase">{n.green_areas?.name}</h4>
                    <p className="text-[10px] text-indigo-600 font-black mb-2">{n.type}</p>
                    <p className="text-xs text-slate-500 italic">"{n.description}"</p>
                  </div>
                ))}
              </div>
            )}

            {activeModule === 'ASISTENCIA' && <AttendanceModule userEmail={user.email} onClose={() => setActiveModule(null)} />}
            {activeModule === 'MAPA' && <div className="fixed inset-0 z-[200] bg-white animate-in slide-in-from-bottom"><div className="bg-slate-900 p-4 text-white flex justify-between font-black uppercase text-xs"><span>Mapa de Gestión</span><button onClick={() => setActiveModule(null)} className="bg-white/10 px-3 py-1 rounded-lg">Cerrar</button></div><MapModule userRole="Supervisor" areas={areas} mapFilter={null} /></div>}
            {activeModule === 'EQUIPO' && <TeamManagement userEmail={user.email} onClose={() => setActiveModule(null)} />}
            {activeModule === 'VEHICULO' && <VehicleReportForm userEmail={user.email} onClose={() => setActiveModule(null)} />}

            {activeModule === 'GASFITERIA' && (
              <div className="space-y-5 animate-in slide-in-from-right">
                <h3 className="font-black text-slate-800 uppercase italic border-b pb-4 flex items-center gap-2"><Droplets className="text-blue-600"/> Reporte Gasfitería</h3>
                <select className="w-full p-5 rounded-2xl bg-white border-2 border-slate-100 font-bold" onChange={(e) => setGasfiteriaData({...gasfiteriaData, areaId: e.target.value})}>
                    <option value="">Seleccionar AAVV...</option>
                    {areas.map(a => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
                </select>
                <div className="grid grid-cols-3 gap-2">
                    {['ALTA', 'MEDIA', 'BAJA'].map(u => (
                        <button key={u} onClick={() => setGasfiteriaData({...gasfiteriaData, urgency: u})} className={`p-4 rounded-2xl font-black text-[10px] border-2 transition-all ${gasfiteriaData.urgency === u ? 'bg-red-500 text-white border-red-500 shadow-lg' : 'bg-white text-slate-400 border-slate-100'}`}>{u}</button>
                    ))}
                </div>
                <div className="bg-white p-10 rounded-[2.5rem] border-4 border-dashed border-slate-100 flex flex-col items-center relative active:border-blue-400 transition-colors">
                   {tempImageUrl ? <img src={tempImageUrl} className="h-40 rounded-3xl object-cover" alt="Evidencia"/> : uploading ? <Loader2 className="animate-spin text-blue-500" size={40}/> : <Camera size={44} className="text-slate-200" />}
                   <p className="text-[9px] font-black text-slate-400 uppercase mt-2">{uploading ? 'Subiendo...' : 'Foto del Daño'}</p>
                   <input type="file" capture="environment" onChange={(e) => handleFileUpload(e, 'gasfiteria')} className="absolute inset-0 opacity-0" />
                </div>
                <textarea className="w-full p-5 rounded-2xl border-2 border-slate-100 font-bold text-sm min-h-[100px]" placeholder="Detalle técnico de la falla..." onChange={e => setGasfiteriaData({...gasfiteriaData, detail: e.target.value})} />
                <button onClick={handleGasfiteriaSubmit} disabled={uploading} className="w-full py-5 bg-[#0F172A] text-white rounded-[2rem] font-black uppercase shadow-xl disabled:opacity-50">Enviar Reporte</button>
              </div>
            )}

            {activeModule === 'CHARLA' && (
              <div className="space-y-5 animate-in slide-in-from-right">
                <h3 className="font-black text-slate-800 uppercase italic border-b pb-4 flex items-center gap-2"><MessageSquare className="text-emerald-600"/> Charla Diaria</h3>
                <div className="grid grid-cols-2 gap-2">
                  {['SEGURIDAD', 'EPP', 'RIEGO', 'OTROS'].map(t => (
                    <button key={t} onClick={() => setCharlaData({...charlaData, type: t})} className={`p-4 rounded-2xl font-black text-[11px] border-2 transition-all ${charlaData.type === t ? 'bg-[#10A34F] text-white border-[#10A34F] shadow-lg' : 'bg-white text-slate-400 border-slate-100'}`}>{t}</button>
                  ))}
                </div>
                <div className="bg-white p-10 rounded-[2.5rem] border-4 border-dashed border-slate-100 flex flex-col items-center relative active:border-emerald-400 transition-colors">
                   {tempImageUrl ? <img src={tempImageUrl} className="h-40 rounded-3xl object-cover" alt="Evidencia"/> : uploading ? <Loader2 className="animate-spin text-emerald-500" size={40}/> : <Camera size={44} className="text-slate-200" />}
                   <p className="text-[9px] font-black text-slate-400 uppercase mt-2">{uploading ? 'Subiendo...' : 'Foto Evidencia'}</p>
                   <input type="file" capture="environment" onChange={(e) => handleFileUpload(e, 'charlas')} className="absolute inset-0 opacity-0" />
                </div>
                <textarea className="w-full p-5 rounded-2xl border-2 border-slate-100 font-bold text-sm min-h-[120px]" placeholder="Observaciones de la charla..." onChange={e => setCharlaData({...charlaData, description: e.target.value})} />
                <button onClick={handleCharlaSubmit} disabled={uploading} className="w-full py-5 bg-[#10A34F] text-white rounded-[2rem] font-black uppercase shadow-xl disabled:opacity-50">Guardar Registro</button>
              </div>
            )}
          </div>
        )}
      </div>
      <footer className="h-10 bg-[#10A34F] flex items-center justify-center text-[7px] text-white/50 font-black uppercase tracking-[0.5em] shadow-inner">Operaciones Sol Poniente • Maipú</footer>
    </div>
  );
}