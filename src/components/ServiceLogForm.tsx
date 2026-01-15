import { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { 
  X, Camera, Save, Loader2, CheckCircle2, AlertTriangle, 
  Droplets, Scissors, Trash2, Shovel, Hammer, Sprout, FileWarning, ClipboardList, ImagePlus, Trash 
} from 'lucide-react';

interface ServiceLogFormProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  area: any;
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

  // CONFIGURACIÓN DE BOTONES
  const activityCategories = [
    {
      title: "ESTADO Y MANTENCIÓN",
      options: [
        { id: 'OK', label: 'Dejar Operativo', icon: <CheckCircle2 size={16} className="text-green-600"/> },
        { id: 'VISITA', label: 'Visita / Revisión', icon: <ClipboardList size={16}/> },
        { id: 'RIEGO', label: 'Falta Riego', icon: <Droplets size={16}/> },
        { id: 'ASEO', label: 'Falta Aseo', icon: <Trash2 size={16}/> },
        { id: 'CORTE', label: 'Pasto Largo', icon: <Scissors size={16}/> },
      ]
    },
    {
      title: "OPERATIVOS ESPECIALES",
      options: [
        { id: 'PLANTACION', label: 'Plantación', icon: <Sprout size={16}/> },
        { id: 'CUNETAS', label: 'Limp. Cunetas', icon: <Shovel size={16}/> },
        { id: 'OBRA_CIVIL', label: 'Obra Civil', icon: <Hammer size={16}/> },
        { id: 'DESMALEZADO', label: 'Desmalezado', icon: <Scissors size={16} className="rotate-90"/> },
      ]
    },
    {
      title: "INCIDENCIAS",
      options: [
        { id: 'DAÑO', label: 'Daño/Vandalismo', icon: <AlertTriangle size={16}/> },
        { id: 'MULTA', label: 'Cursar Multa', icon: <FileWarning size={16}/> },
      ]
    }
  ];

  const getStatusBadge = (status: string) => {
    const s = status?.toUpperCase() || 'OK';
    let colorClass = "bg-gray-100 text-gray-700 border-gray-200";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let Icon: any = CheckCircle2;

    if (s === 'OK' || s === 'VISITA') { colorClass = "bg-green-100 text-green-700 border-green-200"; Icon = CheckCircle2; }
    else if (s === 'RIEGO') { colorClass = "bg-blue-100 text-blue-700 border-blue-200"; Icon = Droplets; }
    else if (s === 'ASEO') { colorClass = "bg-cyan-100 text-cyan-700 border-cyan-200"; Icon = Trash2; }
    else if (s === 'CORTE' || s === 'DESMALEZADO') { colorClass = "bg-orange-100 text-orange-700 border-orange-200"; Icon = Scissors; }
    else if (['PLANTACION', 'CUNETAS', 'OBRA_CIVIL'].includes(s)) { colorClass = "bg-violet-100 text-violet-700 border-violet-200"; Icon = Shovel; }
    else if (s === 'DAÑO' || s === 'MULTA') { colorClass = "bg-red-100 text-red-700 border-red-200"; Icon = AlertTriangle; }

    return (
        <div className={`px-3 py-1.5 rounded-full flex items-center gap-2 text-xs font-bold border ${colorClass}`}>
           <Icon size={14} /> Estado Actual: {s}
        </div>
    );
  };

  // FOTO
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setSelectedFile(file);
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
    }
  };

  const removePhoto = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // SUBMIT
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let finalPhotoUrl = null;

      // 1. Subir Foto
      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random()}.${fileExt}`;
        const filePath = `reports/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('evidence')
          .upload(filePath, selectedFile);

        if (!uploadError) {
            const { data: { publicUrl } } = supabase.storage
                .from('evidence')
                .getPublicUrl(filePath);
            finalPhotoUrl = publicUrl;
        }
      }

      // 2. Guardar Log
      const { error: logError } = await supabase.from('logs').insert({
        area_id: area.id,
        activity_type: activityType,
        description: description,
        operator_email: userEmail,
        photo_url: finalPhotoUrl,
        timestamp: new Date().toISOString()
      });

      if (logError) throw logError;

      // 3. Actualizar Estado
      let newStatus = activityType;
      if (activityType === 'VISITA' || activityType === 'OK') newStatus = 'OK';

      const { error: updateError } = await supabase
        .from('green_areas')
        .update({ current_status: newStatus })
        .eq('id', area.id);

      if (updateError) throw updateError;

      onSuccess();
      onClose();

    } catch (error) {
      console.error('Error:', error);
      alert('Error al guardar reporte.');
    } finally {
      setLoading(false);
    }
  };

  return (
    // CORRECCIÓN: Z-INDEX ALTO Y FIXED PURO
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
      {/* Fondo Oscuro Bloqueante */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
      />
      
      {/* Modal */}
      <div 
        className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 z-10 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex justify-between items-start bg-slate-50">
          <div>
            <h2 className="text-xl font-black text-slate-800 leading-tight">{area.name}</h2>
            <p className="text-xs text-slate-400 font-mono mt-1">{area.code}</p>
            <div className="mt-3">{getStatusBadge(area.current_status)}</div>
          </div>
          <button onClick={onClose} className="p-2 bg-white rounded-full text-slate-400 hover:text-slate-600 border border-slate-100 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body Scrollable */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Categorías */}
            <div className="space-y-4">
                {activityCategories.map((cat, idx) => (
                    <div key={idx}>
                        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">{cat.title}</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {cat.options.map((opt) => (
                                <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => setActivityType(opt.id)}
                                    className={`flex flex-col items-center justify-center gap-1 p-2 rounded-xl border transition-all duration-200
                                        ${activityType === opt.id 
                                            ? 'bg-slate-800 text-white border-slate-800 scale-105 shadow-md ring-2 ring-slate-200' 
                                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                                >
                                    <div className={activityType === opt.id ? 'text-green-400' : 'text-slate-400'}>{opt.icon}</div>
                                    <span className="text-[10px] font-bold text-center leading-tight">{opt.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Detalles */}
            <div>
               <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Detalles / Observaciones</label>
               <textarea 
                 value={description} 
                 onChange={(e) => setDescription(e.target.value)} 
                 className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/50 min-h-[80px]" 
                 placeholder="Ej: Se realizó el corte y limpieza. Queda operativo." 
               />
            </div>

            {/* Foto */}
            <div>
               <label className="block text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-2">
                  <Camera size={14}/> Evidencia (Link Foto)
               </label>
               <input 
                 type="file"
                 accept="image/*"
                 capture="environment"
                 ref={fileInputRef}
                 onChange={handleFileSelect}
                 className="hidden"
               />

               {!previewUrl ? (
                   <button 
                     type="button"
                     onClick={() => fileInputRef.current?.click()}
                     className="w-full p-6 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center text-slate-400 hover:bg-slate-100 hover:border-slate-400 transition-colors gap-2"
                   >
                      <ImagePlus size={32} />
                      <span className="text-xs font-bold">Tocar para tomar foto</span>
                   </button>
               ) : (
                   <div className="relative w-full h-48 bg-slate-100 rounded-xl overflow-hidden border border-slate-200 group">
                      <img src={previewUrl} alt="Evidencia" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            type="button" 
                            onClick={removePhoto}
                            className="bg-red-600 text-white p-2 rounded-full hover:bg-red-700 transition-transform hover:scale-110"
                          >
                              <Trash size={20} />
                          </button>
                      </div>
                   </div>
               )}
            </div>
            
            <button type="submit" disabled={loading} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-70">
                {loading ? <Loader2 className="animate-spin" size={20}/> : <Save size={20}/>} 
                {loading ? 'Guardando...' : 'Confirmar Estado'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}