import { useEffect, useState } from 'react';
import { db } from '../lib/db';
import { Trees, Map as MapIcon, Sprout, Ruler } from 'lucide-react';

export function DashboardStats() {
  const [stats, setStats] = useState({
    totalAreas: 0,
    totalM2: 0,
    byType: { PLAZA: 0, BANDEJON: 0, OTROS: 0 }
  });

  useEffect(() => {
    async function loadStats() {
      // 1. Contamos el total de áreas
      const totalAreas = await db.greenAreas.count();
      
      // 2. Calculamos m2 totales y agrupamos por tipo
      const allAreas = await db.greenAreas.toArray();
      const totalM2 = allAreas.reduce((sum, area) => sum + (area.surface_m2 || 0), 0);
      
      const byType = { PLAZA: 0, BANDEJON: 0, OTROS: 0 };
      allAreas.forEach(area => {
        const type = area.type as keyof typeof byType;
        if (byType[type] !== undefined) {
          byType[type]++;
        } else {
          byType.OTROS++;
        }
      });

      setStats({ totalAreas, totalM2, byType });
    }

    loadStats();
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Widget 1: Total Contrato */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-green-100 text-green-600 rounded-lg">
            <Trees size={20} />
          </div>
          <span className="text-sm font-medium text-gray-500">Total Áreas</span>
        </div>
        <p className="text-2xl font-bold text-gray-800">{stats.totalAreas}</p>
        <p className="text-xs text-green-600 font-medium">+100% Operativas</p>
      </div>

      {/* Widget 2: Superficie */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
            <Ruler size={20} />
          </div>
          <span className="text-sm font-medium text-gray-500">Superficie Total</span>
        </div>
        <p className="text-2xl font-bold text-gray-800">
          {(stats.totalM2 / 10000).toFixed(2)} <span className="text-sm font-normal text-gray-500">ha</span>
        </p>
        <p className="text-xs text-gray-400">Metros cuadrados totales</p>
      </div>

      {/* Widget 3: Plazas */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
            <Sprout size={20} />
          </div>
          <span className="text-sm font-medium text-gray-500">Solo Plazas</span>
        </div>
        <p className="text-2xl font-bold text-gray-800">{stats.byType.PLAZA}</p>
      </div>

      {/* Widget 4: Bandejones */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
            <MapIcon size={20} />
          </div>
          <span className="text-sm font-medium text-gray-500">Bandejones</span>
        </div>
        <p className="text-2xl font-bold text-gray-800">{stats.byType.BANDEJON}</p>
      </div>
    </div>
  );
}