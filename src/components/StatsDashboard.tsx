import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { Activity, AlertTriangle, TreePine, Droplets } from 'lucide-react';

export function StatsDashboard() {
  const stats = useLiveQuery(async () => {
    const areas = await db.greenAreas.toArray();
    const logs = await db.logs.toArray();

    // 1. Total de Plazas
    const totalAreas = areas.length;

    // 2. Plazas en Estado Crítico (Riego o Multa)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const criticalAreas = areas.filter((a: any) => 
      ['RIEGO', 'MULTA'].includes(a.current_status || '')
    ).length;

    // 3. Actividad de Hoy
    const todayStr = new Date().toDateString();
    const logsToday = logs.filter(l => 
      new Date(l.timestamp).toDateString() === todayStr
    ).length;

    // 4. Metros Cuadrados Totales (Solo por curiosidad)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const totalSurface = areas.reduce((acc, curr: any) => acc + (Number(curr.surface_m2) || 0), 0);

    return { totalAreas, criticalAreas, logsToday, totalSurface };
  }, []);

  if (!stats) return <div className="p-4 text-center animate-pulse text-gray-400">Calculando estadísticas...</div>;

  return (
    <div className="grid grid-cols-2 gap-4">
      
      {/* TARJETA 1: TOTAL PLAZAS */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Inventario</p>
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
          {stats.criticalAreas === 0 ? 'Todo operativo' : 'Requieren atención urgente'}
        </p>
      </div>

      {/* TARJETA 3: GESTIÓN DE HOY (Ancha) */}
      <div className="col-span-2 bg-blue-600 p-5 rounded-2xl shadow-lg shadow-blue-600/20 text-white flex items-center justify-between relative overflow-hidden">
        {/* Decoración de fondo */}
        <Droplets className="absolute -right-4 -bottom-4 text-blue-500 opacity-20 w-32 h-32" />
        
        <div className="relative z-10">
          <p className="text-blue-100 text-xs font-bold uppercase tracking-wider mb-1">Gestión del Día</p>
          <h3 className="text-3xl font-black">{stats.logsToday}</h3>
          <p className="text-sm font-medium text-blue-100 mt-1">Actividades realizadas hoy</p>
        </div>

        <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm relative z-10">
          <Activity size={28} className="text-white" />
        </div>
      </div>

    </div>
  );
}