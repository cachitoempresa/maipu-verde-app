import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Armchair, Trash2, Baby, ClipboardList } from 'lucide-react';

export function InventoryStats() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    escanos: 0,
    basureros: 0,
    juegos: 0,
    plazasCatastradas: 0,
    totalPlazas: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data: inventoryData, error: invError } = await supabase.from('area_inventory').select('escanos, basureros, juegos_infantiles');
        if (invError) throw invError;

        const { count: totalAreas, error: countError } = await supabase.from('green_areas').select('*', { count: 'exact', head: true });
        if (countError) throw countError;

        const totalEscanos = inventoryData?.reduce((sum, item) => sum + (item.escanos || 0), 0) || 0;
        const totalBasureros = inventoryData?.reduce((sum, item) => sum + (item.basureros || 0), 0) || 0;
        const totalJuegos = inventoryData?.reduce((sum, item) => sum + (item.juegos_infantiles || 0), 0) || 0;

        setStats({
          escanos: totalEscanos,
          basureros: totalBasureros,
          juegos: totalJuegos,
          plazasCatastradas: inventoryData?.length || 0,
          totalPlazas: totalAreas || 1
        });

      } catch (error) { console.error(error); } finally { setLoading(false); }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-pulse">
        {[1,2,3,4].map(i => <div key={i} className="h-24 bg-slate-100 rounded-xl"></div>)}
      </div>
    );
  }

  const percentage = Math.round((stats.plazasCatastradas / stats.totalPlazas) * 100);

  return (
    <div className="w-full"> 
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        {/* ESCANOS */}
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center hover:border-blue-200 transition-colors h-28 relative overflow-hidden group">
          {/* Contenido (Sin z-index alto para no tapar modales) */}
          <div className="relative">
            <div className="p-2 bg-orange-100 text-orange-600 rounded-full mb-2 inline-flex"><Armchair size={20} /></div>
            <span className="block text-2xl font-black text-slate-700">{stats.escanos}</span>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wide">Escaños</span>
          </div>
        </div>

        {/* BASUREROS */}
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center hover:border-blue-200 transition-colors h-28 relative overflow-hidden group">
          <div className="relative">
            <div className="p-2 bg-slate-100 text-slate-600 rounded-full mb-2 inline-flex"><Trash2 size={20} /></div>
            <span className="block text-2xl font-black text-slate-700">{stats.basureros}</span>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wide">Basureros</span>
          </div>
        </div>

        {/* JUEGOS */}
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center hover:border-blue-200 transition-colors h-28 relative overflow-hidden group">
          <div className="relative">
             <div className="p-2 bg-pink-100 text-pink-600 rounded-full mb-2 inline-flex"><Baby size={20} /></div>
             <span className="block text-2xl font-black text-slate-700">{stats.juegos}</span>
             <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wide">Juegos Inf.</span>
          </div>
        </div>

        {/* AVANCE */}
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center relative overflow-hidden h-28 group">
          {/* Barra de progreso de fondo */}
          <div className="absolute top-0 left-0 h-1 bg-blue-500 transition-all duration-1000" style={{ width: `${percentage}%` }}></div>
          <div className="relative">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-full mb-2 inline-flex"><ClipboardList size={20} /></div>
            <span className="block text-2xl font-black text-slate-700">{percentage}%</span>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wide">Avance Total</span>
          </div>
        </div>
      </div>
    </div>
  );
}