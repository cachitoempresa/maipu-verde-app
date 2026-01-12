import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { AlertTriangle, CheckCircle, Droplets, Banknote, Wrench, Sprout } from 'lucide-react';

export function PendingTasks() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Cargar plazas que NO están OK
  const fetchAlerts = async () => {
    const { data } = await supabase
      .from('green_areas')
      .select('*')
      .neq('current_status', 'OK') // Trae todo lo que NO sea OK
      .order('id');
    
    if (data) setAlerts(data);
  };

  useEffect(() => {
    fetchAlerts();

    // Escuchar cambios en vivo
    const channel = supabase
      .channel('pending-tasks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'green_areas' }, () => {
        fetchAlerts();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Función para cerrar el caso
  const handleResolve = async (areaId: number, currentStatus: string, areaName: string) => {
    const confirm = window.confirm(`¿Marcar ${areaName} como SOLUCIONADO?`);
    if (!confirm) return;

    setLoading(true);
    try {
      // 1. Volver a poner la plaza en VERDE (OK)
      const { error: updateError } = await supabase
        .from('green_areas')
        .update({ current_status: 'OK' })
        .eq('id', areaId);

      if (updateError) throw updateError;

      // 2. Dejar registro en la bitácora
      await supabase.from('logs').insert({
        area_id: areaId,
        activity_type: 'SOLUCION',
        description: `Incidencia de tipo ${currentStatus} resuelta desde Panel de Gestión.`,
        synced: true
      });

      alert("✅ Caso cerrado exitosamente.");

    } catch (error) {
      console.error(error);
      alert("Error al resolver.");
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'RIEGO': return { label: 'FALTA RIEGO', icon: <Droplets />, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' };
      case 'MULTA': return { label: 'MULTA CURSADA', icon: <Banknote />, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' };
      case 'INFRAESTRUCTURA': return { label: 'FALLA INFRA', icon: <Wrench />, color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200' };
      case 'CORTE': return { label: 'PASTO LARGO', icon: <Sprout />, color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200' };
      default: return { label: 'PENDIENTE', icon: <AlertTriangle />, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' };
    }
  };

  if (alerts.length === 0) return null; 

  return (
    <div className="bg-white rounded-xl shadow-sm border border-red-100 overflow-hidden mb-6">
      <div className="bg-red-50 px-6 py-4 border-b border-red-100 flex justify-between items-center">
        <h3 className="font-bold text-red-800 flex items-center gap-2">
          <AlertTriangle className="text-red-600" size={20} />
          Sala de Crisis: {alerts.length} Pendientes
        </h3>
        <span className="text-xs font-bold text-red-600 bg-white px-2 py-1 rounded-full animate-pulse">
            EN VIVO
        </span>
      </div>

      <div className="divide-y divide-gray-100">
        {alerts.map((alert) => {
          const config = getStatusConfig(alert.current_status);
          return (
            <div key={alert.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-full ${config.bg} ${config.color} border ${config.border}`}>
                  {config.icon}
                </div>
                <div>
                  <h4 className="font-bold text-gray-800">{alert.code} - {alert.name}</h4>
                  <div className={`text-xs font-bold mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded ${config.bg} ${config.color}`}>
                    {config.label}
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleResolve(alert.id, alert.current_status, alert.name)}
                disabled={loading}
                className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-green-600 hover:bg-green-50 px-3 py-2 rounded-lg transition-all"
                title="Marcar como Solucionado"
              >
                <span className="hidden sm:inline">Resolver</span>
                {loading ? <div className="animate-spin">⌛</div> : <CheckCircle size={20} />}
              </button>
            </div>
          );
        })}
      </div>
        
      <div className="bg-gray-50 p-2 text-center text-xs text-gray-400 font-medium">
        Presiona "Resolver" cuando la cuadrilla haya solucionado el problema.
      </div>
    </div>
  );
}