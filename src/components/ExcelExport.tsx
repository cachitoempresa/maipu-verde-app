import { useState } from 'react';
import { db } from '../lib/db';
import * as XLSX from 'xlsx';
import { FileSpreadsheet, Loader2 } from 'lucide-react'; // 👈 Corregido: Quitamos 'Download'

export function ExcelExport() {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    try {
      setLoading(true);
      
      // 1. Obtener datos de la BD
      const logs = await db.logs.toArray();
      const areas = await db.greenAreas.toArray();

      if (logs.length === 0) {
        alert("No hay registros para exportar.");
        setLoading(false);
        return;
      }

      // 2. Preparar los datos para Excel
      const dataToExport = logs.map(log => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const area = areas.find((a: any) => String(a.id) === String(log.area_id));
        
        return {
          'Fecha': new Date(log.timestamp).toLocaleDateString(),
          'Hora': new Date(log.timestamp).toLocaleTimeString(),
          'Código Plaza': area ? area.code : '---',
          'Nombre Plaza': area ? area.name : 'Desconocida',
          'Tipo Actividad': log.activity_type,
          'Detalle/Observación': log.description,
          'Tiene Foto': log.photo_url ? 'SÍ' : 'NO',
          'Estado Reportado': area ? (area.current_status || 'OK') : '---'
        };
      });

      // 3. Crear el Libro de Excel
      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Reporte Diario");

      // 4. Descargar el archivo
      const fileName = `Reporte_Maipu_${new Date().toLocaleDateString().replace(/\//g, '-')}.xlsx`;
      XLSX.writeFile(workbook, fileName);

      alert("✅ Excel descargado correctamente");

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
      {loading ? "Generando..." : "Descargar Reporte Excel"}
    </button>
  );
}