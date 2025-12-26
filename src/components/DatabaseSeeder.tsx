import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { INITIAL_AREAS } from '../data/areas';
import { Loader2, CloudUpload, AlertTriangle } from 'lucide-react'; // 👈 Corregido: Quitamos CheckCircle2

export function DatabaseSeeder() {
  const [seeding, setSeeding] = useState(false);
  const [count, setCount] = useState(0);

  // Verificamos cuántas áreas hay en la NUBE
  useEffect(() => {
    checkCount();
  }, []);

  async function checkCount() {
    const { count } = await supabase.from('green_areas').select('*', { count: 'exact', head: true });
    setCount(count || 0);
  }

  const handleUploadToCloud = async () => {
    if (!confirm("⚠️ ¿Estás seguro? Esto subirá todos los polígonos a la Nube Pública.")) return;
    
    setSeeding(true);
    try {
      console.log("1. Preparando datos...");

      // Limpiamos los datos antes de subir
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cleanData = INITIAL_AREAS.map((area: any) => ({
        code: String(area.code || 'S/N').trim(),
        name: String(area.name || 'Sin Nombre').trim(),
        type: String(area.type || 'PLAZA'),
        neighborhood: String(area.neighborhood || 'ZONA 1'),
        surface_m2: Number(area.surface_m2) || 0,
        path: Array.isArray(area.path) ? area.path : [],
        current_status: 'OK'
      }));

      console.log(`2. Subiendo ${cleanData.length} registros a Supabase...`);

      // Subimos en lotes de 50 para no saturar
      const batchSize = 50;
      for (let i = 0; i < cleanData.length; i += batchSize) {
        const batch = cleanData.slice(i, i + batchSize);
        const { error } = await supabase.from('green_areas').insert(batch);
        if (error) throw error;
        console.log(`   - Lote ${i / batchSize + 1} subido.`);
      }

      console.log("3. ¡Éxito Total!");
      alert(`✅ Nube actualizada. Se cargaron ${cleanData.length} áreas.`);
      checkCount();
      window.location.reload(); 

    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const err = error as any;
      console.error("❌ Error Supabase:", err);
      alert(`Error al subir: ${err.message}`);
    } finally {
      setSeeding(false);
    }
  };

  if (seeding) {
    return (
      <div className="flex items-center gap-2 p-4 bg-blue-50 text-blue-700 rounded-xl border border-blue-100 animate-pulse">
        <Loader2 className="animate-spin" />
        <span className="font-medium">Subiendo a la Nube... (No cierres esto)</span>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6 flex flex-wrap justify-between items-center gap-4">
      <div>
        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <CloudUpload className="text-blue-500" />
          Base de Datos en la Nube
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          {count > 0 
            ? `🟢 Sistema Online: ${count} áreas sincronizadas.` 
            : <span className="text-red-500 flex items-center gap-1 font-bold"><AlertTriangle size={14}/> NUBE VACÍA</span>}
        </p>
      </div>

      <button 
        onClick={handleUploadToCloud}
        disabled={count > 0} 
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors border ${count > 0 ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 border-blue-600'}`}
      >
        <CloudUpload size={16} />
        {count > 0 ? 'Datos Cargados' : 'Inicializar Nube'}
      </button>
    </div>
  );
}