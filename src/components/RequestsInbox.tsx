import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Inbox, AlertCircle, CheckCircle, Mail, Phone } from 'lucide-react';

interface Request {
  id: number;
  created_at: string;
  source: string;
  sender: string;
  description: string;
  status: string;
  is_emergency: boolean;
}

export function RequestsInbox() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);

  const getRequestsFromDB = async () => {
    const { data } = await supabase
      .from('requests')
      .select('*')
      .order('created_at', { ascending: false });
    return data || [];
  };

  useEffect(() => {
    const loadInitialData = async () => {
      const data = await getRequestsFromDB();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setRequests(data as any);
      setLoading(false);
    };

    loadInitialData();
    
    const channel = supabase
      .channel('requests-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'requests' }, async () => {
        const newData = await getRequestsFromDB();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setRequests(newData as any);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const markAsDone = async (id: number) => {
    await supabase.from('requests').update({ status: 'RESUELTO' }).eq('id', id);
    // La suscripción realtime debería actualizarlo, pero forzamos update visual por si acaso
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'RESUELTO' } : r));
  };

  if (loading) return <div className="p-8 text-center text-gray-400 text-xs">Cargando buzón...</div>;

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center shrink-0">
        <div>
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Inbox className="text-blue-600" size={20} /> Buzón de Solicitudes
            </h2>
            <p className="text-gray-500 text-xs">Requerimientos externos</p>
        </div>
        <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg font-bold text-xs">
            {requests.filter(r => r.status === 'PENDIENTE').length} Pendientes
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
        {requests.map((req) => (
            <div 
                key={req.id} 
                className={`bg-white p-3 rounded-xl border-l-4 shadow-sm flex flex-col gap-2 transition-all hover:shadow-md
                ${req.status === 'RESUELTO' ? 'border-l-green-500 opacity-60' : (req.is_emergency ? 'border-l-red-500 bg-red-50/30' : 'border-l-blue-500')}
                `}
            >
                <div className="flex justify-between items-start">
                    <div className="flex flex-col w-full">
                        <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                                {req.is_emergency && (
                                    <span className="bg-red-100 text-red-700 text-[10px] font-black px-1.5 py-0.5 rounded uppercase flex items-center gap-1">
                                        <AlertCircle size={10} /> Urgente
                                    </span>
                                )}
                                <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1">
                                    {req.source === 'CORREO' ? <Mail size={10}/> : <Phone size={10}/>} 
                                    {new Date(req.created_at).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                        <span className="text-[10px] text-gray-500 font-medium">De: {req.sender || 'Anónimo'}</span>
                    </div>
                </div>
                
                <p className="text-gray-800 text-sm font-medium leading-tight">{req.description}</p>

                <div className="mt-1">
                    {req.status === 'PENDIENTE' ? (
                        <button 
                            onClick={() => markAsDone(req.id)}
                            className="w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-green-50 hover:text-green-600 hover:border-green-200 transition-colors text-xs font-bold"
                        >
                            <CheckCircle size={14} /> Marcar Resuelto
                        </button>
                    ) : (
                        <span className="flex items-center gap-1 text-green-600 text-[10px] font-bold">
                            <CheckCircle size={12} /> Resuelto
                        </span>
                    )}
                </div>
            </div>
        ))}

        {requests.length === 0 && (
            <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                <Inbox size={32} className="mx-auto mb-2 opacity-20" />
                <p className="text-xs">Buzón limpio.</p>
            </div>
        )}
      </div>
    </div>
  );
}