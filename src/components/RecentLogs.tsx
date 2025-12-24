import { useEffect, useState } from 'react';
import { db } from '../lib/db';
import { Clock, CheckCircle2, MapPin } from 'lucide-react';

// --- 1. LÓGICA DE BASE DE DATOS (Helper Externo) ---
// Esta función hace el trabajo sucio. Al estar fuera, no molesta a React.
async function getLogsFromDB() {
  try {
    const recentLogs = await db.logs
      .orderBy('timestamp')
      .reverse()
      .limit(10)
      .toArray();

    const enrichedLogs = await Promise.all(
      recentLogs.map(async (log) => {
        const area = await db.greenAreas.get(log.area_id);
        return {
          id: log.id,
          area_name: area ? area.name : 'Plaza Desconocida',
          activity_type: log.activity_type,
          description: log.description,
          timestamp: log.timestamp
        };
      })
    );
    return enrichedLogs;
  } catch (error) {
    console.error("Error obteniendo datos:", error);
    return [];
  }
}

// --- 2. COMPONENTE VISUAL ---
export function RecentLogs() {
  // Definimos la interfaz localmente para los tipos
  interface LogWithArea {
    id?: number;
    area_name: string;
    activity_type: string;
    description: string;
    timestamp: string;
  }
  
  const [logs, setLogs] = useState<LogWithArea[]>([]);

  // A. EFECTO DE CARGA INICIAL
  // Definimos la función async DENTRO del efecto. Esto calma al linter.
  useEffect(() => {
    const initLoad = async () => {
      const data = await getLogsFromDB();
      setLogs(data);
    };
    
    initLoad();
  }, []); // ✅ Array vacío: Solo se ejecuta al montar. Cero errores.

  // B. FUNCIÓN PARA EL BOTÓN "ACTUALIZAR"
  const handleManualRefresh = async () => {
    const data = await getLogsFromDB();
    setLogs(data);
  };

  return (
    <div className="mt-8 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
        <h3 className="font-bold text-gray-700 flex items-center gap-2">
          <Clock size={18} className="text-maipu-600" />
          Últimos Movimientos
        </h3>
        <button 
          onClick={handleManualRefresh}
          className="text-xs text-maipu-600 hover:text-maipu-800 font-medium underline cursor-pointer"
        >
          Actualizar Lista
        </button>
      </div>

      {logs.length === 0 ? (
        <div className="p-8 text-center text-gray-400">
          <p>No hay registros en la bitácora aún.</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {logs.map((log) => (
            <div key={log.id} className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex justify-between items-start mb-1">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide 
                    ${log.activity_type === 'RIEGO' ? 'bg-blue-100 text-blue-700' : ''}
                    ${log.activity_type === 'ASEO' ? 'bg-orange-100 text-orange-700' : ''}
                    ${log.activity_type === 'PODA' ? 'bg-green-100 text-green-700' : ''}
                    ${log.activity_type === 'INCIDENCIA' ? 'bg-red-100 text-red-700' : ''}
                  `}>
                    {log.activity_type}
                  </span>
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    {new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} hrs
                  </span>
                </div>
                <CheckCircle2 size={16} className="text-green-500" />
              </div>
              
              <div className="flex items-start gap-2 mb-1">
                <MapPin size={16} className="text-gray-400 mt-0.5" />
                <h4 className="font-semibold text-gray-800 text-sm">{log.area_name}</h4>
              </div>
              
              <p className="text-sm text-gray-600 ml-6 bg-gray-50 p-2 rounded border border-gray-100">
                "{log.description}"
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}