import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Users, Map as MapIcon, ClipboardCheck, 
  Truck, Droplets, MessageSquare, LogOut, Menu, 
  Camera, ArrowLeft, Loader2, History, CheckCircle2, Clock
} from 'lucide-react';

import { AttendanceModule } from './AttendanceModule';
import { MapModule } from './MapModule';
import { TeamManagement } from './TeamManagement';
import { VehicleReportForm } from './VehicleReportForm';

// --- INTERFACES ESTRICTAS ---
interface GreenArea { 
  id: number; 
  name: string; 
  code: string; 
  path: [number, number][]; 
  current_status: string; 
}

interface UnifiedActivity {
  id: string | number;
  source: 'ALERTA' | 'SOLICITUD' | 'MAPA';
  type: string;
  area_name: string;
  description: string;
  image_url?: string;
  status?: string;
  created_at: string;
}

export function DashboardCapataz({ user, onLogout }: { user: { email: string }; onLogout: () => void }) {
  const [activeModule, setActiveModule] = useState<string | null>(null);
  const [areas, setAreas] = useState<GreenArea[]>([]); // Corregido: ya no es 'any'
  const [unifiedHistory, setUnifiedHistory] = useState<UnifiedActivity[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [uploading, setUploading] = useState(false);
  const [tempImageUrl, setTempImageUrl] = useState<string | null>(null);
  const [gasfiteriaData, setGasfiteriaData] = useState({ areaId: '', urgency: '', detail: '' });
  const [charlaData, setCharlaData] = useState({ type: '', description: '' });

  const fetchEverything = useCallback(async () => {
    try {
      setLoading(true);
      const email = user.email.toLowerCase();

      const { data: areasData } = await supabase.from('green_areas').select('*').not('path', 'is', null).order('name');
      if (areasData) setAreas(areasData as GreenArea[]);

      const { data: alerts } = await supabase.from('notifications_capataz').select('*, green_areas(name)').eq('assigned_to', email);
      const { data: requests } = await supabase.from('requests').select('*').eq('sender', user.email);
      const { data: logs } = await supabase.from('logs').select('*, green_areas(name)').eq('operator_email', user.email);

      const combined: UnifiedActivity[] = [
        ...(alerts || []).map(a => ({
          id: a.id, source: 'ALERTA' as const, type: a.type, area_name: a.green_areas?.name || 'Área General',
          description: a.description, status: a.status, created_at: a.created_at
        })),
        ...(requests || []).map(r => ({
          id: r.id, source: 'SOLICITUD' as const, type: 'SOLICITUD', area_name: 'Reporte Enviado',
          description: r.description, image_url: r.image_url, status: r.status, created_at: r.created_at
        })),
        ...(logs || []).map(l => ({
          id: l.id, source: 'MAPA' as const, type: l.activity_type, area_name: l.green_areas?.name || 'Mapa',
          description: l.description, image_url: l.image_url, created_at: l.created_at
        }))
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setUnifiedHistory(combined);
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  }, [user.email]);

  useEffect(() => { fetchEverything(); }, [fetchEverything]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, folder: string) => {
    try {
      setUploading(true);
      const file = e.target.files?.[0];
      if (!file) return;
      const path = `${folder}/${Date.now()}.${file.name.split('.').pop()}`;
      await supabase.storage.from('evidencias').upload(path, file);
      const { data } = supabase.storage.from('evidencias').getPublicUrl(path);
      setTempImageUrl(data.publicUrl);
    } catch { alert("Error al subir"); } finally { setUploading(false); }
  };

  const submitGasfiteria = async () => {
    const area = areas.find(a => a.id === Number(gasfiteriaData.areaId));
    await supabase.from('requests').insert([{
      sender: user.email,
      description: `[FALLA ${gasfiteriaData.urgency}] Plaza: ${area?.name}. ${gasfiteriaData.detail}`,
      image_url: tempImageUrl,
      status: 'PENDIENTE'
    }]);
    alert("Solicitud enviada");
    setTempImageUrl(null);
    setActiveModule(null);
    fetchEverything();
  };

  // --- FUNCIÓN PARA GUARDAR CHARLA (USANDO CHARLADATA) ---
  const handleCharlaSubmit = async () => {
    if (!charlaData.type) return alert("Seleccione tipo");
    await supabase.from('logs').insert([{
      activity_type: 'CHARLA',
      operator_email: user.email,
      description: `${charlaData.type}: ${charlaData.description}`,
      image_url: tempImageUrl 
    }]);
    alert("Charla guardada");
    setCharlaData({ type: '', description: '' });
    setTempImageUrl(null);
    setActiveModule(null);
    fetchEverything();
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-emerald-500" size={40} /></div>;

  return (
    <div className="min-h-screen bg-[#F1F5F9] flex flex-col overflow-hidden">
      <header className="bg-[#10A34F] p-4 text-white flex flex-col shadow-lg sticky top-0 z-[100]">
        <div className="flex justify-between items-center mb-2">
          <Menu size={28} />
          <img src="/logo-empresa.png" alt="Logo" className="h-12 drop-shadow-lg" />
          <button onClick={() => setActiveModule('HISTORIAL')} className="relative">
            <History size={28} />
            <span className="absolute -top-1 -right-1 bg-red-500 text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-[#10A34F]">{unifiedHistory.length}</span>
          </button>
        </div>
        <div className="flex justify-between items-center mt-1">
          <button onClick={onLogout} className="text-[10px] font-black uppercase flex items-center gap-1 opacity-80"><LogOut size={12}/> Salir</button>
          <span className="text-[10px] font-black italic bg-black/20 px-3 py-1 rounded-full uppercase tracking-tighter">Capataz Operativo</span>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        {!activeModule ? (
          <main className="p-6 grid grid-cols-2 gap-4">
            <button onClick={() => setActiveModule('ASISTENCIA')} className="bg-[#FF914D] text-white p-6 rounded-[3rem] shadow-xl aspect-square flex flex-col items-center justify-center"><ClipboardCheck size={44}/><span className="font-black text-xs mt-2 uppercase">Asistencia</span></button>
            <button onClick={() => setActiveModule('MAPA')} className="bg-[#FF914D] text-white p-6 rounded-[3rem] shadow-xl aspect-square flex flex-col items-center justify-center"><MapIcon size={44}/><span className="font-black text-xs mt-2 uppercase">Mapa</span></button>
            <button onClick={() => setActiveModule('EQUIPO')} className="bg-[#0F172A] text-white p-6 rounded-[3rem] shadow-xl aspect-square flex flex-col items-center justify-center"><Users size={44}/><span className="font-black text-xs mt-2 uppercase">Equipo</span></button>
            <button onClick={() => setActiveModule('VEHICULO')} className="bg-[#0F172A] text-white p-6 rounded-[3rem] shadow-xl aspect-square flex flex-col items-center justify-center"><Truck size={44}/><span className="font-black text-xs mt-2 uppercase">Vehículo</span></button>
            <button onClick={() => setActiveModule('CHARLA')} className="bg-[#0F172A] text-white p-6 rounded-[3rem] shadow-xl aspect-square flex flex-col items-center justify-center"><MessageSquare size={44}/><span className="font-black text-xs mt-2 uppercase">Charla</span></button>
            <button onClick={() => setActiveModule('GASFITERIA')} className="bg-[#0F172A] text-white p-6 rounded-[3rem] shadow-xl aspect-square flex flex-col items-center justify-center"><Droplets size={44}/><span className="font-black text-xs mt-2 uppercase">Gasfitería</span></button>
          </main>
        ) : (
          <div className="p-6">
            <button onClick={() => {setActiveModule(null); setTempImageUrl(null); fetchEverything();}} className="mb-6 flex items-center gap-2 font-black text-[10px] uppercase text-slate-400"><ArrowLeft size={16}/> Volver</button>
            
            {activeModule === 'HISTORIAL' && (
              <div className="space-y-4">
                <h3 className="font-black text-slate-800 uppercase italic flex items-center gap-2 mb-4"><History className="text-[#FF914D]"/> Historial</h3>
                {unifiedHistory.map((item) => (
                  <div key={`${item.source}-${item.id}`} className="bg-white rounded-[2rem] p-5 shadow-md border-l-[10px]" style={{ borderLeftColor: item.source === 'ALERTA' ? '#EF4444' : item.source === 'SOLICITUD' ? '#3B82F6' : '#10A34F' }}>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[8px] font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 uppercase tracking-widest">{item.source}</span>
                      <span className="text-[9px] text-slate-400 font-bold">{new Date(item.created_at).toLocaleDateString()}</span>
                    </div>
                    <h4 className="font-black text-slate-800 text-xs uppercase mb-1">{item.area_name}</h4>
                    <p className="text-[10px] font-bold text-emerald-600 uppercase flex items-center gap-1">
                      {item.source === 'MAPA' && <CheckCircle2 size={12}/>}
                      {item.source === 'SOLICITUD' && <Clock size={12}/>}
                      {item.type}
                    </p>
                    <p className="text-[11px] text-slate-600 italic mb-2">"{item.description}"</p>
                    {item.image_url && <img src={item.image_url} alt="Evidencia" className="w-full h-32 object-cover rounded-2xl" />}
                  </div>
                ))}
              </div>
            )}

            {activeModule === 'MAPA' && <div className="fixed inset-0 z-[200] bg-white"><div className="bg-slate-900 p-4 text-white flex justify-between font-black uppercase text-xs"><span>Gestión</span><button onClick={() => {setActiveModule(null); fetchEverything();}}>Cerrar</button></div><MapModule userRole="Capataz" areas={areas} userEmail={user.email} /></div>}
            {activeModule === 'ASISTENCIA' && <AttendanceModule userEmail={user.email} onClose={() => {setActiveModule(null); fetchEverything();}} />}
            {activeModule === 'EQUIPO' && <TeamManagement userEmail={user.email} onClose={() => setActiveModule(null)} />}
            {activeModule === 'VEHICULO' && <VehicleReportForm userEmail={user.email} onClose={() => setActiveModule(null)} />}

            {activeModule === 'GASFITERIA' && (
              <div className="space-y-4">
                <select className="w-full p-5 rounded-2xl bg-white border-2 border-slate-100 font-bold" onChange={e => setGasfiteriaData({...gasfiteriaData, areaId: e.target.value})}>
                  <option value="">Seleccionar AAVV...</option>
                  {areas.map(a => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
                </select>
                <div className="grid grid-cols-3 gap-2">
                  {['ALTA', 'MEDIA', 'BAJA'].map(u => (
                    <button key={u} onClick={() => setGasfiteriaData({...gasfiteriaData, urgency: u})} className={`p-4 rounded-2xl font-black text-xs border-2 ${gasfiteriaData.urgency === u ? 'bg-red-500 text-white' : 'bg-white text-slate-400'}`}>{u}</button>
                  ))}
                </div>
                <div className="bg-white p-10 rounded-[2.5rem] border-4 border-dashed border-slate-100 flex flex-col items-center relative">
                   {tempImageUrl ? <img src={tempImageUrl} className="h-40 rounded-3xl object-cover" alt="Evi"/> : uploading ? <Loader2 className="animate-spin text-blue-500" /> : <Camera size={44} className="text-slate-200" />}
                   <input type="file" capture="environment" onChange={e => handleFileUpload(e, 'gasfiteria')} className="absolute inset-0 opacity-0" />
                </div>
                <textarea className="w-full p-5 rounded-2xl border-2 border-slate-100 font-bold" placeholder="Detalle..." onChange={e => setGasfiteriaData({...gasfiteriaData, detail: e.target.value})} />
                <button onClick={submitGasfiteria} disabled={uploading} className="w-full py-5 bg-[#0F172A] text-white rounded-[2rem] font-black uppercase">Enviar</button>
              </div>
            )}

            {activeModule === 'CHARLA' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  {['SEGURIDAD', 'RIEGO'].map(t => (
                    <button key={t} onClick={() => setCharlaData({...charlaData, type: t})} className={`p-4 rounded-2xl font-black text-xs border-2 ${charlaData.type === t ? 'bg-[#10A34F] text-white' : 'bg-white text-slate-400'}`}>{t}</button>
                  ))}
                </div>
                <textarea className="w-full p-5 rounded-2xl border-2 border-slate-100 font-bold" placeholder="Temas..." onChange={e => setCharlaData({...charlaData, description: e.target.value})} />
                <button onClick={handleCharlaSubmit} className="w-full py-5 bg-[#10A34F] text-white rounded-[2rem] font-black uppercase">Guardar Charla</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}