import { useState } from 'react';
import { supabase } from '../lib/supabase';
import * as XLSX from 'xlsx';
import { FileSpreadsheet, Loader2 } from 'lucide-react';

export function ExcelExport() {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    try {
      setLoading(true);
      
      // 1. Obtener datos de la Nube (Logs + Info de Plaza)
      const { data, error } = await supabase
        .from('logs')
        .select('*, green_areas(code, name, current_status)')
        .order('timestamp', { ascending: false });

      if (error || !data || data.length === 0) {
        alert("No hay registros en la nube para exportar.");
        setLoading(false);
        return;
      }

      // 2. Preparar los datos para Excel
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dataToExport = data.map((log: any) => {
        return {
          'Fecha': new Date(log.timestamp).toLocaleDateString(),
          'Hora': new Date(log.timestamp).toLocaleTimeString(),
          'Código Plaza': log.green_areas?.code || '---',
          'Nombre Plaza': log.green_areas?.name || 'Desconocida',
          'Tipo Actividad': log.activity_type,
          'Detalle/Observación': log.description,
          'Tiene Foto': log.photo_url ? 'SÍ' : 'NO',
          'Estado Reportado': log.green_areas?.current_status || 'OK'
        };
      });

      // 3. Crear el Libro de Excel
      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Reporte Nube");

      // 4. Descargar el archivo
      const fileName = `Reporte_Maipu_NUBE_${new Date().toLocaleDateString().replace(/\//g, '-')}.xlsx`;
      XLSX.writeFile(workbook, fileName);

    } catch (error) {
      console.error(error);
      alert("Hubo un error al generar el Excel.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className="w-full bg-green-600 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-green-600/20 hover:bg-green-700 transition-all flex items-center justify-center gap-2 active:scale-95"
    >
      {loading ? <Loader2 className="animate-spin" /> : <FileSpreadsheet />}
      {loading ? "Descargando de la Nube..." : "Descargar Excel (Todo el Equipo)"}
    </button>
  );
}