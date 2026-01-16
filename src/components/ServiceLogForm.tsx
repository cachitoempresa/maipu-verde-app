import { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { 
  X, Save, Loader2, CheckCircle2, AlertTriangle, 
  Droplets, Scissors, Trash2, Hammer, Sprout, FileWarning, 
  ClipboardList, ImagePlus, Trash, CameraIcon 
} from 'lucide-react';

interface GreenArea {
  id: number;
  code: string;
  name: string;
  current_status: string;
}

interface ServiceLogFormProps {
  area: GreenArea;
  userEmail?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function ServiceLogForm({ area, userEmail, onClose, onSuccess }: ServiceLogFormProps) {
  const [activityType, setActivityType] = useState('VISITA');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  
  // FOTO
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activityCategories = [
    {
      title: "MANTENCIÓN DE RUTINA",
      options: [
        { id: 'OK', label: 'OPERATIVO', icon: <CheckCircle2 size={18}/> },
        { id: 'VISITA', label: 'REVISIÓN', icon: <ClipboardList size={18}/> },
        { id: 'RIEGO', label: 'RIEGO', icon: <Droplets size={18}/> },
        { id: 'ASEO', label: 'ASEO', icon: <Trash2 size={18}/> },
      ]
    },
    {
      title: "REQUERIMIENTOS TÉCNICOS",
      options: [
        { id: 'CORTE', label: 'CORTE', icon: <Scissors size={18}/> },
        { id: 'DESMALEZADO', label: 'PODA/DESM.', icon: <Scissors size={18} className="rotate-90"/> },
        { id: 'PLANTACION', label: 'SIEMBRA', icon: <Sprout size={18}/> },
        { id: 'OBRA_CIVIL', label: 'INFRA.', icon: <Hammer size={18}/> },
      ]
    },
    {
      title: "ALERTAS E INCIDENCIAS",
      options: [
        { id: 'DAÑO', label: 'DAÑO', icon: <AlertTriangle size={18}/> },
        { id: 'MULTA', label: 'MULTA', icon: <FileWarning size={18}/> },
      ]
    }
  ];

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let finalPhotoUrl = null;
      if (selectedFile) {
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}`;
        const { error: uploadError } = await supabase.storage.from('evidence').upload(`reports/${fileName}`, selectedFile);
        if (!uploadError) {
            const { data: { publicUrl } } = supabase.storage.from('evidence').getPublicUrl(`reports/${fileName}`);
            finalPhotoUrl = publicUrl;
        }
      }

      await supabase.from('logs').insert({
        area_id: area.id,
        activity_type: activityType,
        description: description,
        operator_email: userEmail,
        photo_url: finalPhotoUrl,
        timestamp: new Date().toISOString()
      });

      const newStatus = (activityType === 'VISITA' || activityType === 'OK') ? 'OK' : activityType;
      await supabase.from('green_areas').update({ current_status: newStatus }).eq('id', area.id);

      onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
      alert('Error al guardar el reporte');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity" onClick={onClose} />
      
      <div className="relative bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl flex flex-col max-h-[95vh] animate-in zoom-in-95 duration-300 z-10 overflow-hidden border border-slate-100">
        
        <div className="p-8 border-b border-slate-50 flex justify-between items-start bg-slate-50/50">
          <div>
            <div className="flex items-center gap-2 mb-1">
                <span className="px-3 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-[9px] font-black uppercase tracking-widest">Bitácora Digital</span>
                <span className="text-[10px] font-mono text-slate-400">COD: {area.code}</span>
            </div>
            <h2 className="text-2xl font-black text-slate-800 leading-tight tracking-tight">{area.name}</h2>
          </div>
          <button onClick={onClose} className="p-3 bg-white rounded-2xl text-slate-400 hover:text-red-500 shadow-sm border border-slate-100 transition-all active:scale-90">
            <X size={20} />
          </button>
        </div>

        <div className="p-8 overflow-y-auto custom-scrollbar flex-1 space-y-8 bg-white">
          <form onSubmit={handleSubmit} className="space-y-8">
            
            <div className="space-y-6">
                {activityCategories.map((cat, idx) => (
                    <div key={idx}>
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 ml-1 flex items-center gap-2">
                            <div className="w-1 h-1 bg-slate-300 rounded-full" /> {cat.title}
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            {cat.options.map((opt) => (
                                <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => setActivityType(opt.id)}
                                    className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-200 group
                                        ${activityType === opt.id 
                                            ? 'bg-slate-900 border-slate-900 shadow-xl shadow-slate-200 -translate-y-1' 
                                            : 'bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50'}`}
                                >
                                    <div className={`p-2.5 rounded-xl transition-colors
                                        ${activityType === opt.id ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-400 group-hover:text-slate-600'}`}>
                                        {opt.icon}
                                    </div>
                                    <span className={`text-xs font-black uppercase tracking-widest
                                        ${activityType === opt.id ? 'text-white' : 'text-slate-500'}`}>
                                        {opt.label}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Detalle de Actividad</label>
                <textarea 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  className="w-full p-5 bg-slate-50 border-2 border-slate-50 rounded-3xl text-sm focus:outline-none focus:border-indigo-500/20 focus:bg-white transition-all min-h-[100px] placeholder:text-slate-300 font-medium" 
                  placeholder="Escriba los trabajos realizados..." 
                />
            </div>

            <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                    <CameraIcon size={14}/> Capturar Evidencia
                </label>
                <input type="file" accept="image/*" capture="environment" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />

                {!previewUrl ? (
                    <button 
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full p-10 bg-indigo-50/30 border-2 border-dashed border-indigo-200 rounded-[2rem] flex flex-col items-center justify-center text-indigo-400 hover:bg-indigo-50 hover:border-indigo-400 transition-all gap-3 group"
                    >
                      <div className="bg-white p-4 rounded-2xl shadow-sm group-hover:scale-110 transition-transform">
                        <ImagePlus size={32} />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest">Tocar para abrir cámara</span>
                    </button>
                ) : (
                    <div className="relative w-full h-56 rounded-[2rem] overflow-hidden border-2 border-slate-100 shadow-lg group">
                      <img src={previewUrl} alt="Evidencia" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                          <button 
                            type="button" 
                            onClick={() => { setSelectedFile(null); setPreviewUrl(null); }}
                            className="bg-white text-red-600 p-4 rounded-2xl shadow-2xl hover:scale-110 transition-transform flex items-center gap-2 font-black text-[10px] uppercase tracking-widest"
                          >
                            <Trash size={18} /> Borrar Foto
                          </button>
                      </div>
                    </div>
                )}
            </div>
          </form>
        </div>

        <div className="p-8 border-t border-slate-50 bg-slate-50/30">
            <button 
                onClick={handleSubmit}
                disabled={loading} 
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-5 rounded-3xl shadow-xl shadow-emerald-200 flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:opacity-50 uppercase tracking-[0.2em] text-sm"
            >
                {loading ? <Loader2 className="animate-spin" size={20}/> : <Save size={20}/>} 
                {loading ? 'Sincronizando...' : 'Guardar Reporte'}
            </button>
        </div>
      </div>
    </div>
  );
}