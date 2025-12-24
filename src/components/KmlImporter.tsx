import { useState } from 'react';
import { FileUp, Copy } from 'lucide-react'; // 👈 Se eliminó 'CheckCircle2' que sobraba

export function KmlImporter() {
  const [output, setOutput] = useState('');
  const [status, setStatus] = useState('Esperando archivo...');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatus('Procesando geometría...');
    
    try {
      const text = await file.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(text, "text/xml");
      const placemarks = xmlDoc.getElementsByTagName("Placemark");
      
      let generatedCode = `import type { GreenArea } from '../types/index';\n\n`;
      // OJO: Ahora agregamos la propiedad 'path' que es un arreglo de coordenadas
      generatedCode += `export const INITIAL_AREAS: (Omit<GreenArea, 'id'> & { path: [number, number][] })[] = [\n`;

      let count = 0;

      Array.from(placemarks).forEach((pm) => {
        const getData = (name: string) => {
          const el = pm.querySelector(`SimpleData[name="${name}"]`);
          return el ? el.textContent?.trim() : '';
        };

        const codigo = getData('CODIGO') || 'S/N';
        let nombre = getData('NOMBRE') || 'SIN NOMBRE';
        nombre = nombre.replace(/'/g, "").replace(/"/g, "");
        const barrio = getData('BARRIO') || 'ZONA 1';
        const superficieRaw = getData('SUPERFICIE');
        const superficie = superficieRaw ? parseInt(superficieRaw.replace(/\./g, '')) : 0;
        const tipo = getData('CARACTERIS') || 'PLAZA';

        // --- EXTRACCIÓN DE POLÍGONOS ---
        const coordsRaw = pm.querySelector('coordinates')?.textContent;
        let pathStr = "";

        if (coordsRaw) {
          // Convertimos las coordenadas KML a formato Array de Arrays [[lat,lng], [lat,lng]]
          const points = coordsRaw.trim().split(/\s+/).map(p => {
            const parts = p.split(',');
            if (parts.length >= 2) {
              // KML es (Lng, Lat), Leaflet necesita [Lat, Lng]
              return `[${parts[1]}, ${parts[0]}]`; 
            }
            return null;
          }).filter(p => p !== null);

          if (points.length > 0) {
            pathStr = points.join(", ");
            // Generamos la línea con el 'path' completo
            generatedCode += `  { code: "${codigo}", name: "${nombre}", type: "${tipo}", neighborhood: "${barrio}", surface_m2: ${superficie || 0}, path: [${pathStr}] },\n`;
            count++;
          }
        }
      });

      generatedCode += `];`;
      setOutput(generatedCode);
      setStatus(`✅ ¡Éxito! Se generaron polígonos para ${count} áreas.`);
      
    } catch (error) {
      console.error(error);
      setStatus('❌ Error al procesar.');
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(output);
    alert("Código de polígonos copiado");
  };

  return (
    <div className="fixed inset-0 bg-gray-100 z-[9999] overflow-auto flex flex-col items-center justify-start pt-10 px-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-5xl border border-gray-200">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b">
          <div className="bg-maipu-100 p-3 rounded-full text-maipu-600">
            <FileUp size={32} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Importador de Polígonos KML</h1>
            <p className="text-gray-500 text-sm">Convierte formas exactas a código</p>
          </div>
        </div>

        <div className="mb-6 bg-blue-50 border border-blue-100 p-4 rounded-lg">
          <input type="file" accept=".kml" onChange={handleFileUpload} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-6 file:rounded-full file:border-0 file:bg-blue-600 file:text-white cursor-pointer" />
          <p className="mt-2 text-sm font-medium text-gray-600">{status}</p>
        </div>

        {output && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <button onClick={copyToClipboard} className="bg-green-600 text-white px-5 py-2 rounded-lg hover:bg-green-700 font-bold mb-2 flex items-center gap-2">
              <Copy size={18} /> Copiar Polígonos
            </button>
            <textarea readOnly value={output} className="w-full h-64 p-4 font-mono text-xs bg-[#1e1e1e] text-[#d4d4d4] rounded-xl" />
          </div>
        )}
      </div>
    </div>
  );
}