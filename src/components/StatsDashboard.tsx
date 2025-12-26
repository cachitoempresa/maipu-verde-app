import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase'; // 👈 Usamos la Nube
import { Activity, AlertTriangle, TreePine, Droplets } from 'lucide-react';

export function StatsDashboard() {
  const [stats, setStats] = useState({
    totalAreas: 0,
    criticalAreas: 0,
    logsToday: 0,
    totalSurface: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    
    // Opcional: Escuchar cambios en tiempo real también en el dashboard
    const channel = supabase
      .channel('dashboard-stats')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => {
        fetchStats();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  async function fetchStats() {
    try {
      // 1. Total de Plazas
      const { count: totalAreas } = await supabase
        .from('green_areas')
        .select('*', { count: 'exact', head: true });

      // 2. Plazas Críticas (Riego o Multa)
      const { count: criticalAreas } = await supabase
        .from('green_areas')
        .select('*', { count: 'exact', head: true })
        .in('current_status', ['RIEGO', 'MULTA']);

      // 3. Actividad de Hoy
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const { count: logsToday } = await supabase
        .from('logs')
        .select('*', { count: 'exact', head: true })
        .gte('timestamp', today);

      // 4. Superficie Total (Necesitamos descargar la columna surface_m2)
      const { data: areasData } = await supabase
        .from('green_areas')
        .select('surface_m2');
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const totalSurface = areasData?.reduce((acc, curr: any) => acc + (Number(curr.surface_m2) || 0), 0) || 0;

      setStats({
        totalAreas: totalAreas || 0,
        criticalAreas: criticalAreas || 0,
        logsToday: logsToday || 0,
        totalSurface
      });

    } catch (error) {
      console.error("Error calculando estadísticas:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="p-4 text-center animate-pulse text-gray-400">Calculando datos de la nube...</div>;

  return (
    <div className="grid grid-cols-2 gap-4">
      
      {/* TARJETA 1: TOTAL PLAZAS */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Inventario Nube</p>
            <h3 className="text-2xl font-black text-gray-800 mt-1">{stats.totalAreas}</h3>
          </div>
          <div className="bg-green-100 p-2 rounded-lg text-green-600">
            <TreePine size={20} />
          </div>
        </div>
        <div className="mt-3 text-xs text-gray-500 font-medium bg-gray-50 px-2 py-1 rounded inline-block w-fit">
          {(stats.totalSurface / 10000).toFixed(1)} Hectáreas totales
        </div>
      </div>

      {/* TARJETA 2: ALERTAS CRÍTICAS */}
      <div className={`p-4 rounded-2xl shadow-sm border flex flex-col justify-between ${stats.criticalAreas > 0 ? 'bg-red-50 border-red-100' : 'bg-white border-gray-100'}`}>
        <div className="flex items-start justify-between">
          <div>
            <p className={`text-xs font-bold uppercase tracking-wider ${stats.criticalAreas > 0 ? 'text-red-400' : 'text-gray-400'}`}>
              Alertas
            </p>
            <h3 className={`text-2xl font-black mt-1 ${stats.criticalAreas > 0 ? 'text-red-600' : 'text-gray-800'}`}>
              {stats.criticalAreas}
            </h3>
          </div>
          <div className={`${stats.criticalAreas > 0 ? 'bg-red-200 text-red-700' : 'bg-gray-100 text-gray-400'} p-2 rounded-lg`}>
            <AlertTriangle size={20} />
          </div>
        </div>
        <p className="mt-3 text-xs font-medium opacity-80">
          {stats.criticalAreas === 0 ? 'Todo operativo' : 'Requieren atención'}
        </p>
      </div>

      {/* TARJETA 3: GESTIÓN DE HOY */}
      <div className="col-span-2 bg-blue-600 p-5 rounded-2xl shadow-lg shadow-blue-600/20 text-white flex items-center justify-between relative overflow-hidden">
        <Droplets className="absolute -right-4 -bottom-4 text-blue-500 opacity-20 w-32 h-32" />
        
        <div className="relative z-10">
          <p className="text-blue-100 text-xs font-bold uppercase tracking-wider mb-1">Gestión del Día</p>
          <h3 className="text-3xl font-black">{stats.logsToday}</h3>
          <p className="text-sm font-medium text-blue-100 mt-1">Reportes sincronizados hoy</p>
        </div>

        <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm relative z-10">
          <Activity size={28} className="text-white" />
        </div>
      </div>

    </div>
  );
}