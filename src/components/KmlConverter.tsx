import { useState } from 'react';

export function KmlConverter() {
  const [output, setOutput] = useState('');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(text, "text/xml");
    const placemarks = xmlDoc.getElementsByTagName("Placemark");
    
    let generatedCode = `import type { GreenArea } from '../types/index';\n\n`;
    generatedCode += `export const INITIAL_AREAS: (Omit<GreenArea, 'id'> & { lat?: number, lng?: number })[] = [\n`;

    Array.from(placemarks).forEach((pm) => {
      // 1. Extraer Datos Simples
      const getData = (name: string) => {
        const el = pm.querySelector(`SimpleData[name="${name}"]`);
        return el ? el.textContent : '';
      };

      const codigo = getData('CODIGO') || 'S/N';
      const nombre = getData('NOMBRE') || 'SIN NOMBRE';
      const barrio = getData('BARRIO') || 'ZONA 1';
      const superficie = getData('SUPERFICIE') || '0';
      const tipo = getData('CARACTERIS') || 'PLAZA';

      // 2. Extraer Coordenadas y Calcular Centro
      const coordsRaw = pm.querySelector('coordinates')?.textContent;
      let lat = 0, lng = 0;

      if (coordsRaw) {
        // Limpiamos y convertimos las coordenadas del polígono
        const points = coordsRaw.trim().split(/\s+/).map(p => {
          const [lon, lat] = p.split(',').map(Number);
          return { lat, lng: lon }; // KML usa Lon,Lat, nosotros Lat,Lng
        });

        // Calculamos el promedio (Centroide)
        if (points.length > 0) {
          lat = points.reduce((sum, p) => sum + p.lat, 0) / points.length;
          lng = points.reduce((sum, p) => sum + p.lng, 0) / points.length;
        }
      }

      // 3. Generar la línea de código
      if (lat !== 0 && lng !== 0) {
        generatedCode += `  { code: "${codigo}", name: "${nombre}", type: "${tipo}", neighborhood: "${barrio}", surface_m2: ${superficie}, lat: ${lat}, lng: ${lng} },\n`;
      }
    });

    generatedCode += `];`;
    setOutput(generatedCode);
  };

  return (
    <div className="p-8 bg-gray-100 min-h-screen">
      <div className="max-w-4xl mx-auto bg-white p-6 rounded-xl shadow-lg">
        <h2 className="text-2xl font-bold mb-4">🛠️ Convertidor KML a Código</h2>
        <p className="mb-4 text-gray-600">Sube tu archivo .kml y copiaré el código listo para usar.</p>
        
        <input 
          type="file" 
          accept=".kml"
          onChange={handleFileUpload}
          className="mb-6 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-maipu-50 file:text-maipu-700 hover:file:bg-maipu-100"
        />

        {output && (
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="font-bold text-green-600">¡Código Generado!</span>
              <button 
                onClick={() => navigator.clipboard.writeText(output)}
                className="bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700 text-sm"
              >
                Copiar Todo
              </button>
            </div>
            <textarea 
              readOnly 
              value={output} 
              className="w-full h-96 p-4 font-mono text-xs bg-gray-900 text-green-400 rounded-lg"
            />
          </div>
        )}
      </div>
    </div>
  );
}