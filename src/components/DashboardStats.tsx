import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Trees, CheckCircle, Droplets, AlertTriangle, 
  LayoutDashboard, Activity, ClipboardList, 
  Armchair, Trash2, Baby 
} from 'lucide-react';

export function DashboardStats() {
  const [stats, setStats] = useState({
    total: 0,
    ok: 0,
    riego: 0,
    alerta: 0,
    escanos: 0,
    basureros: 0,
    juegos: 0,
    avanceCatastro: 0
  });
  const [loading, setLoading] = useState(true);
  
  // CONFIGURACIÓN INICIAL: Catastro en 'false' para no saturar la vista
  const [visibleGroups, setVisibleGroups] = useState({
    general: true,
    operativo: true,
    catastro: false // <--- INICIA OCULTO
  });

  const fetchStats = async () => {
    try {
      const { data: areasData } = await supabase.from('green_areas').select('current_status');
      const { data: invData } = await supabase.from('area_inventory').select('escanos, basureros, juegos_infantiles');

      if (areasData && invData) {
        const total = areasData.length;
        const ok = areasData.filter(p => p.current_status === 'OK' || p.current_status === 'VISITA').length;
        const riego = areasData.filter(p => p.current_status === 'RIEGO').length;
        const alerta = total - ok - riego;

        const totalEscanos = invData.reduce((sum, item) => sum + (item.escanos || 0), 0);
        const totalBasureros = invData.reduce((sum, item) => sum + (item.basureros || 0), 0);
        const totalJuegos = invData.reduce((sum, item) => sum + (item.juegos_infantiles || 0), 0);
        const porcentaje = total > 0 ? Math.round((invData.length / total) * 100) : 0;

        setStats({ 
            total, ok, riego, alerta,
            escanos: totalEscanos,
            basureros: totalBasureros,
            juegos: totalJuegos,
            avanceCatastro: porcentaje
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // Suscripción simple para actualizar datos
    const channel = supabase.channel('dashboard-stats-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'green_areas' }, fetchStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'area_inventory' }, fetchStats)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const toggleGroup = (group: keyof typeof visibleGroups) => {
    setVisibleGroups(prev => ({ ...prev, [group]: !prev[group] }));
  };

  if (loading) return <div className="h-24 bg-gray-100 rounded-xl animate-pulse mb-6"></div>;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const StatCard = ({ label, value, icon, colorClass, borderClass }: any) => (
    <div className={`bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between animate-in zoom-in-95 duration-200 hover:shadow-md ${borderClass ? `border-b-4 ${borderClass}` : ''}`}>
        <div>
            <p className={`text-xs font-bold uppercase tracking-wider ${colorClass ? colorClass.text : 'text-slate-400'}`}>{label}</p>
            <h3 className={`text-2xl font-black ${colorClass ? colorClass.number : 'text-slate-800'}`}>{value}</h3>
        </div>
        <div className={`p-3 rounded-full ${colorClass ? colorClass.bg : 'bg-slate-50 text-slate-600'}`}>
            {icon}
        </div>
    </div>
  );

  return (
    <div className="relative mb-4">
      {/* BOTONERA DE FILTROS */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end mb-4 gap-3 px-1">
         <h3 className="text-slate-400 font-bold text-xs uppercase tracking-widest self-center sm:self-end">Panel de Control</h3>
         <div className="flex flex-wrap justify-center bg-white p-1 rounded-xl shadow-sm border border-slate-200 w-fit self-center sm:self-auto gap-1">
             
             <button onClick={() => toggleGroup('general')} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${visibleGroups.general ? 'bg-slate-800 text-white shadow' : 'text-slate-500 hover:bg-slate-50'}`}>
                <LayoutDashboard size={14} /> General
             </button>
             <div className="w-px bg-slate-200 my-1"></div>

             <button onClick={() => toggleGroup('operativo')} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${visibleGroups.operativo ? 'bg-blue-600 text-white shadow' : 'text-slate-500 hover:bg-slate-50'}`}>
                <Activity size={14} /> Estados
             </button>
             <div className="w-px bg-slate-200 my-1"></div>

             <button onClick={() => toggleGroup('catastro')} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${visibleGroups.catastro ? 'bg-orange-500 text-white shadow' : 'text-slate-500 hover:bg-slate-50'}`}>
                <ClipboardList size={14} /> Catastro
             </button>
         </div>
      </div>

      {/* GRID DE TARJETAS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {visibleGroups.general && <StatCard label="Total Zonas" value={stats.total} icon={<Trees size={24} />} />}
        
        {visibleGroups.operativo && (
            <>
                <StatCard label="Operativas" value={stats.ok} icon={<CheckCircle size={24} />} colorClass={{ text: 'text-green-500', number: 'text-green-700', bg: 'bg-green-50 text-green-600' }} />
                <StatCard label="Falta Riego" value={stats.riego} icon={<Droplets size={24} />} colorClass={{ text: 'text-blue-400', number: 'text-blue-700', bg: 'bg-blue-50 text-blue-600' }} />
                <StatCard label="Críticas" value={stats.alerta} icon={<AlertTriangle size={24} />} colorClass={{ text: 'text-red-400', number: 'text-red-700', bg: 'bg-red-50 text-red-600' }} />
            </>
        )}

        {visibleGroups.catastro && (
            <>
                <StatCard label="Avance Inv." value={`${stats.avanceCatastro}%`} icon={<ClipboardList size={24} />} colorClass={{ text: 'text-orange-400', number: 'text-orange-600', bg: 'bg-orange-50 text-orange-600' }} borderClass="border-orange-400" />
                <StatCard label="Escaños" value={stats.escanos} icon={<Armchair size={24} />} />
                <StatCard label="Basureros" value={stats.basureros} icon={<Trash2 size={24} />} />
                <StatCard label="Juegos" value={stats.juegos} icon={<Baby size={24} />} />
            </>
        )}
      </div>
    </div>
  );
}