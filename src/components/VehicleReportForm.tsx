import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Camera, MapPin, Save, X, Loader2, FileText, Home } from 'lucide-react';

interface GreenAreaOption {
    code: string;
    name: string;
}

export function VehicleReportForm({ userEmail, onClose }: { userEmail: string, onClose: () => void }) {
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [aavvOptions, setAavvOptions] = useState<GreenAreaOption[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState({
        aavvCode: '',
        addressNumber: '',
        details: '',
    });
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    // Cargar lista de AAVV para el selector
    useEffect(() => {
        const fetchAAVV = async () => {
            const { data } = await supabase
                .from('green_areas')
                .select('code, name')
                .order('name');
            if (data) setAavvOptions(data);
        };
        fetchAAVV();
    }, []);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            const file = event.target.files[0];
            setImageFile(file);
            // Crear URL para previsualización
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const uploadImage = async (file: File): Promise<string | null> => {
        try {
            setUploading(true);
            const fileExt = file.name.split('.').pop();
            // Nombre de archivo único: timestamp_random.ext
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
            const filePath = `${fileName}`;

            // 1. Subir al bucket 'infractions'
            const { error: uploadError } = await supabase.storage
                .from('infractions')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // 2. Obtener la URL pública
            const { data } = supabase.storage
                .from('infractions')
                .getPublicUrl(filePath);

            return data.publicUrl;

        } catch (error) {
            console.error('Error subiendo imagen:', error);
            alert("Error al subir la imagen. Intente nuevamente.");
            return null;
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.aavvCode || !formData.addressNumber || !imageFile) {
            alert("⚠️ Debes completar el código AAVV, la numeración y subir una foto.");
            return;
        }

        setLoading(true);
        try {
            // 1. Primero subimos la imagen
            const imageUrl = await uploadImage(imageFile);
            if (!imageUrl) throw new Error("Fallo en la subida de imagen");

            // 2. Luego guardamos los datos en la tabla
            const { error } = await supabase.from('vehicle_infractions').insert({
                reporter_email: userEmail,
                aavv_code: formData.aavvCode,
                address_number: formData.addressNumber,
                details: formData.details,
                image_url: imageUrl
            });

            if (error) throw error;

            alert("✅ Reporte enviado exitosamente con foto.");
            onClose();
        } catch (err) {
            console.error(err);
            alert("❌ Error al guardar el reporte.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
                
                {/* Header */}
                <div className="p-6 bg-red-600 text-white flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <Camera size={24}/>
                        <div>
                            <h2 className="text-xl font-black tracking-tight leading-none">Reportar Vehículo</h2>
                            <p className="text-[10px] font-bold uppercase opacity-80">Infracción en Área Verde</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-full transition-colors">
                        <X size={24}/>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                    
                    {/* 1. FOTO EVIDENCE */}
                    <div className="space-y-2">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Evidencia Fotográfica</label>
                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            className={`border-4 border-dashed rounded-3xl p-4 text-center cursor-pointer transition-all relative overflow-hidden h-48 flex flex-col items-center justify-center
                                ${previewUrl ? 'border-red-500 bg-slate-900' : 'border-slate-200 hover:border-red-400 hover:bg-red-50'}`}
                        >
                            {previewUrl ? (
                                <img src={previewUrl} alt="Evidencia" className="absolute inset-0 w-full h-full object-cover opacity-60" />
                            ) : (
                                <Camera size={40} className="text-slate-300 mb-2"/>
                            )}
                            <p className={`relative z-10 font-bold text-sm ${previewUrl ? 'text-white' : 'text-slate-500'}`}>
                                {previewUrl ? 'Tocar para cambiar foto' : 'Tocar para tomar foto'}
                            </p>
                             {/* Input oculto: en móviles abre la cámara */}
                            <input 
                                type="file" 
                                accept="image/*" 
                                capture="environment"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                className="hidden"
                            />
                        </div>
                    </div>

                    {/* 2. SELECCIÓN DE AAVV */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                            <MapPin size={12} className="text-red-500"/> Código AAVV (Plaza)
                        </label>
                        <select 
                            value={formData.aavvCode}
                            onChange={(e) => setFormData({...formData, aavvCode: e.target.value})}
                            className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-red-500 outline-none font-bold text-slate-700 text-sm"
                        >
                            <option value="">-- Seleccionar Código --</option>
                            {aavvOptions.map(area => (
                                <option key={area.code} value={area.code}>{area.code} - {area.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* 3. NUMERACIÓN */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                            <Home size={12} className="text-red-500"/> Numeración / Altura
                        </label>
                         <input 
                            type="text" 
                            placeholder="Ej: Frente al #1234" 
                            value={formData.addressNumber}
                            onChange={(e) => setFormData({...formData, addressNumber: e.target.value})}
                            className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-red-500 outline-none font-bold text-slate-700"
                        />
                    </div>

                    {/* 4. DETALLE */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                            <FileText size={12} className="text-slate-400"/> Detalle Adicional (Opcional)
                        </label>
                        <textarea 
                            placeholder="Ej: Auto azul patente XXXX sobre el pasto..." 
                            rows={3}
                            value={formData.details}
                            onChange={(e) => setFormData({...formData, details: e.target.value})}
                            className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-red-500 outline-none font-medium text-slate-700 resize-none"
                        />
                    </div>
                </div>

                <div className="p-6 border-t border-slate-100 bg-slate-50">
                    <button 
                        onClick={handleSubmit}
                        disabled={loading || uploading || !imageFile}
                        className="w-full py-5 bg-slate-900 text-white rounded-[1.5rem] font-black text-lg shadow-xl shadow-slate-200 flex items-center justify-center gap-3 hover:bg-red-600 hover:shadow-red-200 transition-all active:scale-[0.98] disabled:opacity-50"
                    >
                        {loading || uploading ? <Loader2 className="animate-spin"/> : <Save size={20}/>} 
                        {uploading ? 'Subiendo Foto...' : 'Enviar Reporte'}
                    </button>
                </div>
            </div>
        </div>
    );
}