import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Calendar, Clock, ImageOff, Siren } from 'lucide-react';

export function ActivityFeed() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
    const channel = supabase
      .channel('logs-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'logs' }, () => {
        fetchLogs();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('logs')
        .select(`
          id,
          activity_type,
          description,
          created_at,
          photo_before,
          photo_after,
          green_areas ( name, code )
        `)
        .order('created_at', { ascending: false })
        .limit(15);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Error cargando historial:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-CL', { 
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' 
    }).format(date);
  };

  const getActivityIcon = (type: string) => {
    switch(type) {
        case 'PODA': return '✂️';
        case 'RIEGO': return '💧';
        case 'LIMPIEZA': return '🧹';
        case 'MULTA': return '🚨';
        case 'INSPECCION': return '👀';
        default: return '📝';
    }
  };

  if (loading) return <div className="p-4 text-center text-gray-400">Cargando actividad...</div>;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full">
      <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
        <h3 className="font-bold text-gray-700 flex items-center gap-2">
            <Clock size={18} className="text-maipu-600"/> Últimos Reportes
        </h3>
        <span className="text-xs text-gray-400 bg-white px-2 py-1 rounded border">Tiempo Real</span>
      </div>

      <div className="overflow-y-auto p-4 space-y-6 h-[600px] scrollbar-hide">
        {logs.length === 0 && (
            <div className="text-center py-10 text-gray-400">
                <p>No hay actividad registrada aún.</p>
            </div>
        )}

        {logs.map((log) => {
          // Detectamos si es una alerta de ITS buscando el texto en la descripción
          const isAlert = log.description && log.description.includes('[ALERTA ITS]');

          return (
            <div key={log.id} className={`relative pl-6 border-l-2 last:border-0 pb-6 ${isAlert ? 'border-red-300' : 'border-gray-200'}`}>
                {/* Bolita de la línea de tiempo */}
                <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 box-content ${isAlert ? 'bg-red-100 border-red-500' : 'bg-maipu-100 border-maipu-500'}`}></div>
                
                {isAlert && (
                    <div className="mb-2 inline-flex items-center gap-1 bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-red-200 animate-pulse">
                        <Siren size={12} /> ALERTA ITS
                    </div>
                )}

                <div className="mb-1 flex items-center gap-2">
                    <span className="text-xl">{getActivityIcon(log.activity_type)}</span>
                    <div>
                        <h4 className="text-sm font-bold text-gray-900 leading-none">
                            {log.green_areas?.name || 'Plaza Desconocida'}
                        </h4>
                        <span className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                            <Calendar size={10}/> {formatDate(log.created_at)}
                        </span>
                    </div>
                </div>

                <p className={`text-sm mb-3 p-2 rounded-lg italic border ${isAlert ? 'bg-red-50 text-red-800 border-red-100 font-medium' : 'bg-gray-50 text-gray-600 border-gray-100'}`}>
                    "{log.description.replace('🚨 [ALERTA ITS] ', '') || 'Sin comentarios'}"
                </p>

                {/* FOTOS */}
                {(log.photo_before || log.photo_after) ? (
                    <div className="grid grid-cols-2 gap-2 mt-2">
                        {log.photo_before && (
                            <div className="relative group rounded-lg overflow-hidden border border-gray-200">
                                <span className="absolute top-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded font-bold z-10">ANTES</span>
                                <img src={log.photo_before} className="w-full h-24 object-cover" alt="Antes" />
                            </div>
                        )}
                        {log.photo_after && (
                            <div className="relative group rounded-lg overflow-hidden border border-green-200">
                                <span className="absolute top-1 left-1 bg-green-600/80 text-white text-[10px] px-1.5 py-0.5 rounded font-bold z-10">DESPUÉS</span>
                                <img src={log.photo_after} className="w-full h-24 object-cover" alt="Después" />
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex items-center gap-2 text-xs text-gray-400 mt-2">
                        <ImageOff size={14}/> Sin evidencia fotográfica
                    </div>
                )}
            </div>
          );
        })}
      </div>
    </div>
  );
}