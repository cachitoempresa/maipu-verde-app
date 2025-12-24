import { useEffect, useState } from 'react';
import { db } from '../lib/db';
import { INITIAL_AREAS } from '../data/areas';
import { Loader2, CheckCircle2, RefreshCw, AlertTriangle } from 'lucide-react';

export function DatabaseSeeder() {
  const [seeding, setSeeding] = useState(false);
  const [count, setCount] = useState(0);

  useEffect(() => {
    db.greenAreas.count().then(c => setCount(c));
  }, []);

  const handleReset = async () => {
    if (!confirm("⚠️ ¿Estás seguro? Se borrará todo el historial y se restaurarán los mapas.")) return;
    
    setSeeding(true);
    try {
      console.log("1. Iniciando proceso de limpieza...");

      // --- FASE DE LIMPIEZA DE DATOS ---
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cleanData = INITIAL_AREAS.map((area: any) => {
        // Creamos un objeto nuevo, limpio y forzamos los tipos de datos
        return {
          code: String(area.code || 'S/N').trim(),
          name: String(area.name || 'Sin Nombre').trim(),
          type: String(area.type || 'PLAZA'),
          neighborhood: String(area.neighborhood || 'ZONA 1'),
          // Aseguramos que superficie sea un número, si falla ponemos 0
          surface_m2: Number(area.surface_m2) || 0,
          // Aseguramos que path sea un array, si falla ponemos array vacío
          path: Array.isArray(area.path) ? area.path : [],
          current_status: 'OK' // Estado inicial por defecto
        };
      });

      console.log(`2. Datos sanitizados: ${cleanData.length} registros listos.`);

      // --- FASE DE TRANSACCIÓN ---
      await db.transaction('rw', db.greenAreas, db.logs, async () => {
        console.log("3. Borrando datos antiguos...");
        await db.greenAreas.clear();
        await db.logs.clear();
        
        console.log("4. Insertando nuevos datos...");
        await db.greenAreas.bulkAdd(cleanData);
      });

      const newCount = await db.greenAreas.count();
      setCount(newCount);
      console.log("5. ¡Éxito Total!");
      alert(`✅ Restauración exitosa. Se cargaron ${newCount} áreas verdes.`);
      window.location.reload(); 

    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const err = error as any;
      console.error("❌ Error Detallado:", err);
      // Mostramos el error real en la alerta
      alert(`Error al guardar: ${err.message || err.name || 'Error desconocido'}`);
    } finally {
      setSeeding(false);
    }
  };

  if (seeding) {
    return (
      <div className="flex items-center gap-2 p-4 bg-blue-50 text-blue-700 rounded-xl border border-blue-100 animate-pulse">
        <Loader2 className="animate-spin" />
        <span className="font-medium">Procesando base de datos...</span>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6 flex flex-wrap justify-between items-center gap-4">
      <div>
        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <CheckCircle2 className="text-green-500" />
          Base de Datos Local
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          {count > 0 
            ? `Sistema en línea: ${count} áreas cargadas.` 
            : <span className="text-red-500 flex items-center gap-1 font-bold"><AlertTriangle size={14}/> REQUIERE REINICIO</span>}
        </p>
      </div>

      <button 
        onClick={handleReset}
        className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-sm font-bold transition-colors border border-red-100"
      >
        <RefreshCw size={16} />
        Cargar Datos Iniciales
      </button>
    </div>
  );
}