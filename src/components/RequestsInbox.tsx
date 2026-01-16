import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Mail, CheckCircle2, Clock, Inbox, 
  Loader2, RefreshCw, AlertCircle // Ahora sí usaremos AlertCircle para emergencias
} from 'lucide-react';

interface EmailRequest {
  id: number;
  sender: string;
  description: string;
  created_at: string;
  status: string;
  is_emergency: boolean;
}

export function RequestsInbox() {
  const [requests, setRequests] = useState<EmailRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // 1. Carga de datos apuntando a la tabla 'requests'
  const fetchRequests = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const { data, error } = await supabase
        .from('requests') // <--- Confirmado: tabla 'requests' con s
        .select('*')
        .or('status.eq.PENDIENTE,status.is.null')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests((data as EmailRequest[]) || []);
    } catch (err) {
      console.error("Error cargando inbox:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const markAsDone = async (id: number) => {
    try {
      await supabase.from('requests').update({ status: 'GESTIONADO' }).eq('id', id);
      setRequests(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchRequests();
    const channel = supabase.channel('requests-live').on('postgres_changes', 
      { event: '*', schema: 'public', table: 'requests' }, 
      () => fetchRequests()
    ).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchRequests]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[2.5rem] border border-slate-100">
      <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-4" />
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Sincronizando...</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center px-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-600 text-white rounded-2xl shadow-lg">
            <Inbox size={20} />
          </div>
          <div>
            <h3 className="font-black text-slate-800 text-lg leading-none italic uppercase">Solicitudes ITS</h3>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Conexión Realtime activa</p>
          </div>
        </div>
        <button onClick={() => fetchRequests(true)} className={`p-2 rounded-full hover:bg-slate-100 transition-all ${refreshing ? 'animate-spin' : ''}`}>
          <RefreshCw size={18} className="text-slate-400" />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
        {requests.length === 0 ? (
          <div className="bg-slate-50/50 border-2 border-dashed border-slate-200 p-20 rounded-[3rem] text-center">
            <CheckCircle2 size={40} className="mx-auto text-slate-200 mb-4" />
            <p className="font-black text-slate-300 uppercase text-[10px] tracking-widest italic">Bandeja Vacía</p>
          </div>
        ) : (
          requests.map((req) => (
            <div key={req.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all relative overflow-hidden group">
              {/* Uso de AlertCircle para marcar emergencias visualmente */}
              {req.is_emergency && (
                <div className="absolute top-0 right-0 bg-red-500 text-white px-4 py-1 rounded-bl-2xl flex items-center gap-1">
                  <AlertCircle size={12} />
                  <span className="text-[9px] font-black uppercase">Urgente</span>
                </div>
              )}

              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-900 text-white rounded-2xl flex items-center justify-center font-black text-sm">
                    {req.sender ? req.sender[0].toUpperCase() : '?'}
                  </div>
                  <div>
                    <p className="text-[11px] font-black text-slate-800 leading-none">{req.sender}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock size={12} className="text-slate-300" />
                      <p className="text-[9px] font-bold text-slate-400 uppercase">{new Date(req.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
                <button onClick={() => markAsDone(req.id)} className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl hover:bg-emerald-600 hover:text-white transition-all">
                  <CheckCircle2 size={20}/>
                </button>
              </div>

              <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100">
                <p className="text-xs text-slate-600 leading-relaxed italic font-medium">
                  <Mail size={14} className="inline mr-2 text-indigo-400" />
                  "{req.description}"
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}