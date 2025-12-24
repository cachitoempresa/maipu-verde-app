import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { Clock, CheckCircle2, AlertCircle, Droplets, Scissors, Truck, Clipboard, Camera } from 'lucide-react';

export function RecentLogs() {
  
  const logs = useLiveQuery(async () => {
    const allLogs = await db.logs.toArray();
    const allAreas = await db.greenAreas.toArray();
    
    return allLogs
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 50) 
      .map(log => {
        // 👇 AQUÍ ESTÁ EL ARREGLO: 'as any' para evitar error de tipos string vs number
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const area = allAreas.find((a: any) => String(a.id) === String(log.area_id));
        return { ...log, areaName: area ? `${area.code} - ${area.name}` : 'Plaza Desconocida' };
      });
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case 'RIEGO': return <Droplets className="text-blue-500" />;
      case 'PODA': return <Scissors className="text-orange-500" />;
      case 'ASEO': return <Truck className="text-green-500" />;
      case 'FISCALIZACION': return <Clipboard className="text-purple-500" />;
      default: return <AlertCircle className="text-gray-500" />;
    }
  };

  if (!logs) return <div className="text-center p-4 text-gray-400">Cargando historial...</div>;

  return (
    <div className="space-y-4">
      {logs.length === 0 && (
        <div className="text-center p-8 bg-gray-50 rounded-xl border border-dashed text-gray-400">
          No hay registros hoy.
        </div>
      )}

      {logs.map((log) => (
        <div key={log.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex gap-4 hover:shadow-md transition-shadow">
          <div className="bg-gray-50 h-12 w-12 rounded-full flex items-center justify-center shrink-0">
            {getIcon(log.activity_type)}
          </div>

          <div className="flex-1">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-bold text-gray-800 text-sm">{log.areaName}</h4>
                <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                  <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-600 font-bold">{log.activity_type}</span>
                  <span className="flex items-center gap-1"><Clock size={10} /> {new Date(log.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
              
              {log.synced ? (
                <CheckCircle2 size={16} className="text-green-400" />
              ) : (
                <div className="w-2 h-2 bg-orange-400 rounded-full" title="Pendiente de subir" />
              )}
            </div>
            
            <p className="text-sm text-gray-600 mt-2 bg-gray-50 p-2 rounded-lg">
              {log.description}
            </p>

            {log.photo_url && (
              <div className="mt-3">
                <details className="group">
                  <summary className="list-none cursor-pointer text-xs font-bold text-blue-600 flex items-center gap-1 hover:underline">
                    <Camera size={14} />
                    Ver Evidencia Fotográfica
                  </summary>
                  <div className="mt-2 animate-in fade-in zoom-in duration-200">
                    <img 
                      src={log.photo_url} 
                      alt="Evidencia" 
                      className="rounded-lg border border-gray-200 shadow-sm max-h-60 object-cover w-full md:w-auto"
                    />
                  </div>
                </details>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}