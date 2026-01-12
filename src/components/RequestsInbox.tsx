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

  // 1. FUNCIÓN PURA: Solo va a buscar datos a Supabase y los devuelve.
  // No usa 'setRequests' aquí adentro, por lo que no causa conflictos.
  const getRequestsFromDB = async () => {
    const { data } = await supabase
      .from('requests')
      .select('*')
      .order('created_at', { ascending: false });
    return data || [];
  };

  // 2. EFECTO: Carga inicial y suscripción
  useEffect(() => {
    // Función interna para manejar la carga inicial
    const loadInitialData = async () => {
      const data = await getRequestsFromDB();
      setRequests(data);
      setLoading(false);
    };

    loadInitialData();
    
    // Escuchar nuevos correos en tiempo real
    const channel = supabase
      .channel('requests-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'requests' }, async () => {
        // Si hay cambios, volvemos a pedir los datos
        const newData = await getRequestsFromDB();
        setRequests(newData);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []); // Array vacío = Se ejecuta una sola vez al montar. Perfecto.

  // 3. ACCIÓN MANUAL (Botón Resolver)
  const markAsDone = async (id: number) => {
    await supabase.from('requests').update({ status: 'RESUELTO' }).eq('id', id);
    // Recargamos la lista manualmente
    const data = await getRequestsFromDB();
    setRequests(data);
  };

  if (loading) return <div className="p-8 text-center text-gray-400">Cargando buzón...</div>;

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
        <div>
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Inbox className="text-maipu-600" /> Buzón de Solicitudes
            </h2>
            <p className="text-gray-500 text-sm">Emergencias y requerimientos externos (Correo / Teléfono)</p>
        </div>
        <div className="bg-maipu-50 text-maipu-700 px-4 py-2 rounded-lg font-bold text-sm">
            {requests.filter(r => r.status === 'PENDIENTE').length} Pendientes
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {requests.map((req) => (
            <div 
                key={req.id} 
                className={`bg-white p-4 rounded-xl border-l-4 shadow-sm flex flex-col md:flex-row gap-4 items-start md:items-center justify-between transition-all hover:shadow-md
                ${req.status === 'RESUELTO' ? 'border-l-green-500 opacity-60' : (req.is_emergency ? 'border-l-red-500 bg-red-50/30' : 'border-l-blue-500')}
                `}
            >
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        {req.is_emergency && (
                            <span className="bg-red-100 text-red-700 text-[10px] font-black px-2 py-0.5 rounded uppercase flex items-center gap-1">
                                <AlertCircle size={10} /> Emergencia
                            </span>
                        )}
                        <span className="text-xs font-bold text-gray-400 flex items-center gap-1">
                            {req.source === 'CORREO' ? <Mail size={12}/> : <Phone size={12}/>} 
                            {new Date(req.created_at).toLocaleDateString()}
                        </span>
                        <span className="text-xs text-gray-400">• De: {req.sender || 'Anónimo'}</span>
                    </div>
                    <p className="text-gray-800 font-medium">{req.description}</p>
                </div>

                <div className="flex items-center gap-3">
                    {req.status === 'PENDIENTE' ? (
                        <button 
                            onClick={() => markAsDone(req.id)}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-green-50 hover:text-green-600 hover:border-green-200 transition-colors text-sm font-bold"
                        >
                            <CheckCircle size={16} /> Resolver
                        </button>
                    ) : (
                        <span className="flex items-center gap-1 text-green-600 text-xs font-bold px-3 py-1 bg-green-50 rounded-full">
                            <CheckCircle size={12} /> Resuelto
                        </span>
                    )}
                </div>
            </div>
        ))}

        {requests.length === 0 && (
            <div className="text-center py-10 text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                <Inbox size={48} className="mx-auto mb-2 opacity-20" />
                <p>Buzón limpio. No hay solicitudes pendientes.</p>
            </div>
        )}
      </div>
    </div>
  );
}