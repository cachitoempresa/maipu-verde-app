import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase'; // 👈 Usamos Supabase
import { Save, FileText, TreePine, AlertTriangle, Camera, X } from 'lucide-react';

export function ServiceLogForm() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [areas, setAreas] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    area_id: '',
    activity_type: 'RIEGO',
    new_status: 'OK',
    description: '',
    photo_url: '' 
  });

  // Cargar lista de plazas desde la Nube
  useEffect(() => {
    const loadAreas = async () => {
      const { data } = await supabase
        .from('green_areas')
        .select('id, code, name')
        .order('code', { ascending: true });
        
      if (data) setAreas(data);
    };
    loadAreas();
  }, []);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 600; // Bajamos un poco la calidad para que suba rápido
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;

        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6);
            setFormData(prev => ({ ...prev, photo_url: compressedBase64 }));
        }
      };
    };
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.area_id) return alert("Por favor selecciona una plaza");

    setLoading(true);
    try {
      // 1. Guardar el LOG en la Nube
      const { error: logError } = await supabase.from('logs').insert({
        area_id: Number(formData.area_id),
        activity_type: formData.activity_type,
        description: formData.description,
        photo_url: formData.photo_url,
        synced: true // Ya nace sincronizado
      });

      if (logError) throw logError;

      // 2. Actualizar el color de la Plaza en el Mapa (Nube)
      const { error: areaError } = await supabase
        .from('green_areas')
        .update({ current_status: formData.new_status })
        .eq('id', formData.area_id);

      if (areaError) throw areaError;

      alert("✅ Guardado en la Nube correctamente");
      
      // Limpiar formulario
      setFormData({ ...formData, description: '', new_status: 'OK', photo_url: '' }); 
      if (fileInputRef.current) fileInputRef.current.value = "";

    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const err = error as any;
      console.error(err);
      alert(`Error al guardar en la nube: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 max-w-2xl mx-auto">
      <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
        <FileText className="text-maipu-600" />
        Nuevo Reporte (Online)
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Área Verde</label>
          <div className="relative">
            <select
              className="w-full p-3 pl-10 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maipu-500 outline-none"
              value={formData.area_id}
              onChange={e => setFormData({...formData, area_id: e.target.value})}
              required
            >
              <option value="">Seleccione una plaza...</option>
              {areas.map(area => (
                <option key={area.id} value={area.id}>
                  {area.code} - {area.name}
                </option>
              ))}
            </select>
            <TreePine className="absolute left-3 top-3.5 text-gray-400" size={18} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Actividad</label>
            <select
              className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maipu-500 outline-none"
              value={formData.activity_type}
              onChange={e => setFormData({...formData, activity_type: e.target.value})}
            >
              <option value="RIEGO">💧 Riego</option>
              <option value="ASEO">🧹 Aseo y Ornato</option>
              <option value="PODA">✂️ Poda</option>
              <option value="INCIDENCIA">⚠️ Incidencia</option>
              <option value="FISCALIZACION">📋 Fiscalización</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-maipu-700 mb-1 flex items-center gap-1">
              <AlertTriangle size={14} />
              Estado (Mapa)
            </label>
            <select
              className="w-full p-3 bg-white border-2 border-maipu-100 rounded-lg focus:ring-2 focus:ring-maipu-500 outline-none font-medium text-gray-700"
              value={formData.new_status}
              onChange={e => setFormData({...formData, new_status: e.target.value})}
            >
              <option value="OK">✅ Operativo / OK</option>
              <option value="CORTE">⚠️ Pendiente: Corte Pasto</option>
              <option value="RIEGO">🔥 Crítico: Falta Riego</option>
              <option value="MULTA">🛑 Multa Cursada</option>
              <option value="INFRAESTRUCTURA">🛠️ Falla Infraestructura</option>
              <option value="PLANTAS">🌸 Mantención Jardines</option>
            </select>
          </div>
        </div>

        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:bg-gray-50 transition-colors">
            <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                ref={fileInputRef}
                onChange={handlePhotoUpload}
            />
            
            {!formData.photo_url ? (
                <button 
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center gap-2 w-full text-gray-500"
                >
                    <div className="bg-blue-100 p-3 rounded-full text-blue-600">
                        <Camera size={24} />
                    </div>
                    <span className="text-sm font-medium">Tocar para tomar foto</span>
                </button>
            ) : (
                <div className="relative inline-block">
                    <img src={formData.photo_url} alt="Evidencia" className="h-40 rounded-lg shadow-md border" />
                    <button
                        type="button"
                        onClick={() => {
                            setFormData(prev => ({...prev, photo_url: ''}));
                            if(fileInputRef.current) fileInputRef.current.value = "";
                        }}
                        className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow hover:bg-red-600"
                    >
                        <X size={16} />
                    </button>
                </div>
            )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
          <textarea
            className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maipu-500 outline-none"
            rows={3}
            value={formData.description}
            onChange={e => setFormData({...formData, description: e.target.value})}
            required
          />
        </div>

        <button type="submit" disabled={loading} className="w-full bg-maipu-600 text-white font-bold py-3 rounded-lg hover:bg-maipu-700 flex items-center justify-center gap-2 shadow-lg">
          <Save size={20} />
          {loading ? 'Guardando en Nube...' : 'Guardar Reporte'}
        </button>

      </form>
    </div>
  );
}