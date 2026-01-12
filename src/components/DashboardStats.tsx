import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Trees, CheckCircle, Droplets, AlertTriangle } from 'lucide-react';

export function DashboardStats() {
  const [stats, setStats] = useState({
    total: 0,
    ok: 0,
    riego: 0,
    alerta: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();

    // Suscripción a cambios en tiempo real
    const channel = supabase
      .channel('dashboard-stats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'green_areas' }, () => {
        fetchStats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchStats = async () => {
    try {
      const { data, error } = await supabase
        .from('green_areas')
        .select('current_status');

      if (error) throw error;

      if (data) {
        const total = data.length;
        const ok = data.filter(p => p.current_status === 'OK').length;
        const riego = data.filter(p => p.current_status === 'RIEGO').length;
        const alerta = total - ok - riego;

        setStats({ total, ok, riego, alerta });
      }
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-gray-100 h-24 rounded-xl animate-pulse"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      
      {/* Widget 1: Total Plazas */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-gray-100 text-gray-600 rounded-lg">
            <Trees size={20} />
          </div>
          <span className="text-sm font-medium text-gray-500">Total Áreas</span>
        </div>
        <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
        <p className="text-xs text-gray-400">Monitoreadas en tiempo real</p>
      </div>

      {/* Widget 2: Operativas */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-green-100 text-green-600 rounded-lg">
            <CheckCircle size={20} />
          </div>
          <span className="text-sm font-medium text-gray-500">Operativas</span>
        </div>
        <p className="text-2xl font-bold text-gray-800">{stats.ok}</p>
        <p className="text-xs text-green-600 font-medium">
            {stats.total > 0 ? Math.round((stats.ok / stats.total) * 100) : 0}% del total
        </p>
      </div>

      {/* Widget 3: Falta Riego */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
            <Droplets size={20} />
          </div>
          <span className="text-sm font-medium text-gray-500">Falta Agua</span>
        </div>
        <p className="text-2xl font-bold text-gray-800">{stats.riego}</p>
        <p className="text-xs text-orange-500">Programar camión aljibe</p>
      </div>

      {/* Widget 4: Alertas */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-red-100 text-red-600 rounded-lg">
            <AlertTriangle size={20} />
          </div>
          <span className="text-sm font-medium text-gray-500">En Alerta</span>
        </div>
        <p className="text-2xl font-bold text-gray-800">{stats.alerta}</p>
        <p className="text-xs text-red-500 font-bold">Multas, Aseo o Daños</p>
      </div>

    </div>
  );
}