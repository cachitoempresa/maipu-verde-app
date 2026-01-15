import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Clock, CheckCircle2, Droplets, Scissors, AlertTriangle, Hammer, Shovel, Sprout } from 'lucide-react';

// Tipos para evitar errores de TS
interface LogItem {
  id: number;
  activity_type: string;
  description: string;
  timestamp: string;
  operator_email: string;
  green_areas?: { name: string; code: string };
}

export function RecentLogs() {
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Función para obtener el ícono según el tipo
  const getIcon = (type: string) => {
    switch(type) {
        case 'VISITA': case 'OK': return <CheckCircle2 size={16} className="text-green-500" />;
        case 'RIEGO': return <Droplets size={16} className="text-blue-500" />;
        case 'CORTE': case 'DESMALEZADO': return <Scissors size={16} className="text-orange-500" />;
        case 'CUNETAS': return <Shovel size={16} className="text-violet-500" />;
        case 'OBRA_CIVIL': return <Hammer size={16} className="text-violet-500" />;
        case 'PLANTACION': return <Sprout size={16} className="text-green-600" />;
        case 'DAÑO': case 'MULTA': return <AlertTriangle size={16} className="text-red-500" />;
        default: return <Clock size={16} className="text-slate-400" />;
    }
  };

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('logs')
        .select(`
          *,
          green_areas ( name, code )
        `)
        .order('timestamp', { ascending: false })
        .limit(10); // Traemos los últimos 10

      if (error) throw error;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setLogs(data as any); 
    } catch (err) {
      console.error("Error al traer logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();

    // SUSCRIPCIÓN EN TIEMPO REAL
    const channel = supabase
        .channel('recent-logs-updates')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'logs' }, () => {
            // Cuando alguien inserte un log nuevo, recargamos la lista
            fetchLogs();
        })
        .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  if (loading) {
      return <div className="p-4 text-center text-xs text-slate-400">Cargando movimientos...</div>;
  }

  if (logs.length === 0) {
      return <div className="p-4 text-center text-xs text-slate-400">No hay movimientos recientes.</div>;
  }

  return (
    <div className="space-y-3">
      {logs.map((log) => (
        <div key={log.id} className="flex gap-3 items-start p-3 bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="mt-1 bg-slate-50 p-2 rounded-lg border border-slate-200">
             {getIcon(log.activity_type)}
          </div>
          <div className="flex-1 min-w-0">
             <div className="flex justify-between items-start">
                 <h4 className="font-bold text-slate-700 text-xs truncate">
                    {log.green_areas?.name || 'Zona desconocida'}
                 </h4>
                 <span className="text-[10px] text-slate-400 whitespace-nowrap ml-2">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                 </span>
             </div>
             <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-0.5">
                {log.activity_type}
             </p>
             <p className="text-xs text-slate-600 line-clamp-2">
                {log.description || 'Sin descripción'}
             </p>
             <p className="text-[9px] text-slate-400 mt-1">
                Por: {log.operator_email}
             </p>
          </div>
        </div>
      ))}
    </div>
  );
}