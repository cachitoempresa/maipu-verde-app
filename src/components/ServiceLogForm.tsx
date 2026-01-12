import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Send, AlertTriangle, MapPin, Search, CheckCircle, Camera, X, Image as ImageIcon, Siren } from 'lucide-react';

interface Area {
  id: number;
  name: string;
  code: string;
}

interface ServiceLogFormProps {
    externalSelectedArea?: Area | null;
    userEmail?: string; // 👈 NUEVO: Recibimos el correo del usuario
}

const STATUS_BY_ACTIVITY: Record<string, { value: string, label: string }[]> = {
    CORTE: [
        { value: 'OK', label: '🟢 Corte Realizado (OK)' },
        { value: 'CORTE', label: '🟡 Pendiente (Pasto Largo)' },
        { value: 'ASEO', label: '🔵 Incompleto (Falta retirar pasto)' },
        { value: 'MULTA', label: '🔴 Multa (Mal Ejecutado)' }
    ],
    PODA: [
        { value: 'OK', label: '🟢 Poda Ejecutada (OK)' },
        { value: 'CORTE', label: '🟡 Pendiente (Falta Poda)' },
        { value: 'INFRAESTRUCTURA', label: '🟠 Urgente / Riesgo Caída' },
        { value: 'MULTA', label: '🔴 Multa (Poda Agresiva/Mal hecha)' }
    ],
    RIEGO: [
        { value: 'OK', label: '🟢 Riego Realizado (OK)' },
        { value: 'RIEGO', label: '🟠 Pendiente (Falta Agua)' },
        { value: 'INFRAESTRUCTURA', label: '🔧 Falla Sistema Riego' },
        { value: 'MULTA', label: '🔴 Multa (Plaza Seca)' }
    ],
    LIMPIEZA: [
        { value: 'OK', label: '🟢 Limpieza Realizada (OK)' },
        { value: 'ASEO', label: '🔵 Pendiente (Sucia)' },
        { value: 'MULTA', label: '🔴 Multa (Basural / Escombros)' }
    ],
    MANTENCION: [
        { value: 'OK', label: '🟢 Mantención OK' },
        { value: 'INFRAESTRUCTURA', label: '🔧 Reparación Pendiente' },
        { value: 'MULTA', label: '🔴 Daño por Terceros' }
    ],
    INSPECCION: [
        { value: 'OK', label: '🟢 Todo Operativo' },
        { value: 'RIEGO', label: '🟠 Falta Agua' },
        { value: 'CORTE', label: '🟡 Pasto Largo' },
        { value: 'ASEO', label: '🔵 Falta Aseo / Retiro' },
        { value: 'INFRAESTRUCTURA', label: '🔧 Mobiliario Dañado' },
        { value: 'MULTA', label: '🔴 Multa General' }
    ]
};

export function ServiceLogForm({ externalSelectedArea, userEmail }: ServiceLogFormProps) {
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  // Detectamos si es el usuario ITS
  const isITS = userEmail === 'its@maipu.cl';

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedArea, setSelectedArea] = useState<Area | null>(null);
  
  // Si es ITS, por defecto la actividad es INSPECCION
  const [activityType, setActivityType] = useState(isITS ? 'INSPECCION' : 'CORTE'); 
  const [description, setDescription] = useState('');
  const [reportStatus, setReportStatus] = useState('OK'); 
  
  const [fileBefore, setFileBefore] = useState<File | null>(null);
  const [previewBefore, setPreviewBefore] = useState<string | null>(null);
  const [fileAfter, setFileAfter] = useState<File | null>(null);
  const [previewAfter, setPreviewAfter] = useState<string | null>(null);

  const fileInputBeforeRef = useRef<HTMLInputElement>(null);
  const fileInputAfterRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchAreas();
  }, []);

  useEffect(() => {
    if (externalSelectedArea) {
        setSelectedArea(externalSelectedArea);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [externalSelectedArea]);

  useEffect(() => {
    // Si cambia el usuario, ajustar el default
    if (isITS) setActivityType('INSPECCION');
  }, [isITS]);

  useEffect(() => {
    const options = STATUS_BY_ACTIVITY[activityType];
    if (options && options.length > 0) {
        // Si es ITS, tratamos de que no sea OK por defecto si es inspección, o dejamos que elija
        setReportStatus(options[0].value);
    }
  }, [activityType]);

  const fetchAreas = async () => {
    setLoading(true);
    const { data } = await supabase.from('green_areas').select('id, name, code');
    if (data) {
      const sorted = (data as Area[]).sort((a, b) => 
        a.code.localeCompare(b.code, undefined, { numeric: true, sensitivity: 'base' })
      );
      setAreas(sorted);
    }
    setLoading(false);
  };

  const filteredAreas = areas.filter(area => 
    area.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    area.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const uploadPhoto = async (file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;
    const { error } = await supabase.storage.from('evidencia').upload(filePath, file);
    if (error) throw error;
    const { data } = supabase.storage.from('evidencia').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedArea) return;
    setSending(true);

    try {
        let urlBefore = null;
        let urlAfter = null;

        if (fileBefore) urlBefore = await uploadPhoto(fileBefore);
        if (fileAfter) urlAfter = await uploadPhoto(fileAfter);

        // 🔥 LÓGICA DE PRIORIDAD ITS
        // Si es ITS, le agregamos una etiqueta especial al texto para que el sistema lo detecte
        let finalDescription = description;
        if (isITS) {
            finalDescription = `🚨 [ALERTA ITS] ${description}`;
        }

        const { error: logError } = await supabase.from('logs').insert({
                area_id: selectedArea.id,
                activity_type: activityType,
                description: finalDescription, // Guardamos la descripción modificada
                photo_before: urlBefore,
                photo_after: urlAfter,
                synced: true
            });
        if (logError) throw logError;

        const { error: statusError } = await supabase.from('green_areas').update({ current_status: reportStatus }).eq('id', selectedArea.id);
        if (statusError) throw statusError;

        // Limpiar
        setDescription('');
        setReportStatus(STATUS_BY_ACTIVITY[activityType][0].value); 
        setSearchTerm('');
        setSelectedArea(null);
        setFileBefore(null); setPreviewBefore(null);
        setFileAfter(null); setPreviewAfter(null);
        
        alert(isITS ? '🚨 Reporte de ALERTA enviado.' : '✅ Reporte guardado.');

    } catch (error) {
        console.error('Error:', error);
        alert('Error al guardar.');
    } finally {
        setSending(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'BEFORE' | 'AFTER') => {
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        const previewUrl = URL.createObjectURL(file);
        if (type === 'BEFORE') { setFileBefore(file); setPreviewBefore(previewUrl); }
        else { setFileAfter(file); setPreviewAfter(previewUrl); }
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'OK': return 'bg-green-100 text-green-800 border-green-200';
      case 'RIEGO': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'ASEO': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'CORTE': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'INFRAESTRUCTURA': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'MULTA': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-50 text-gray-600';
    }
  };

  return (
    <div className={`bg-white rounded-xl shadow-sm border p-6 transition-all ring-offset-2 ${isITS ? 'border-orange-200 ring-orange-500' : 'border-gray-100 ring-maipu-500'}`} id="log-form">
      
      {/* HEADER ESPECIAL PARA ITS */}
      {isITS ? (
        <div className="mb-4 bg-orange-50 border border-orange-200 rounded-lg p-3 flex items-center gap-3 animate-pulse">
            <div className="bg-orange-500 text-white p-2 rounded-full">
                <Siren size={20} />
            </div>
            <div>
                <h3 className="font-bold text-orange-800 text-sm">MODO FISCALIZACIÓN ITS</h3>
                <p className="text-xs text-orange-600">Todos los reportes se marcarán como <strong>ALERTA / PRIORIDAD</strong>.</p>
            </div>
        </div>
      ) : (
        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <MapPin className="text-maipu-600" /> Reporte de Terreno
        </h2>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* BUSCADOR */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Área Verde</label>
          {selectedArea ? (
             <div className="flex items-center justify-between p-3 bg-maipu-50 border border-maipu-200 rounded-lg animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center gap-3">
                    <CheckCircle className="text-maipu-600 shrink-0" size={24} />
                    <div>
                        <span className="block font-bold text-maipu-800">{selectedArea.name}</span>
                        <span className="text-xs text-maipu-600 font-mono">{selectedArea.code}</span>
                    </div>
                </div>
                <button type="button" onClick={() => setSelectedArea(null)} className="text-xs text-red-600 font-bold hover:underline px-2 py-1">CAMBIAR</button>
             </div>
          ) : (
            <div className="border border-gray-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-maipu-500">
                <div className="relative border-b border-gray-100 bg-gray-50">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search size={16} className="text-gray-400" /></div>
                    <input type="text" placeholder="Buscar plaza..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 p-3 text-sm bg-transparent outline-none"/>
                </div>
                <div className="max-h-40 overflow-y-auto bg-white">
                    {!loading && filteredAreas.map(area => (
                        <button key={area.id} type="button" onClick={() => { setSelectedArea(area); setSearchTerm(''); }} className="w-full text-left p-3 hover:bg-gray-50 border-b border-gray-50 flex justify-between items-center">
                            <span className="text-sm text-gray-700">{area.name}</span>
                            <span className="text-xs font-mono text-gray-400 bg-gray-100 px-1 rounded">{area.code}</span>
                        </button>
                    ))}
                </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          
          {/* 1. ACTIVIDAD */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Actividad</label>
            <select value={activityType} onChange={(e) => setActivityType(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-maipu-500 outline-none text-sm">
              <option value="CORTE">✂️ Corte de Pasto</option>
              <option value="RIEGO">💧 Riego</option>
              <option value="LIMPIEZA">🧹 Limpieza</option> 
              <option value="PODA">🌳 Poda Árboles</option>
              <option value="MANTENCION">🛠️ Mantención</option>
              <option value="INSPECCION">👀 Inspección</option>
            </select>
          </div>
          
          {/* 2. ESTADO */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Resultado</label>
            <select 
                value={reportStatus} 
                onChange={(e) => setReportStatus(e.target.value)} 
                className={`w-full p-3 border rounded-lg focus:ring-2 outline-none font-bold text-sm transition-colors ${getStatusColor(reportStatus)}`}
            >
              {STATUS_BY_ACTIVITY[activityType].map((option) => (
                  <option key={option.value} value={option.value}>
                      {option.label}
                  </option>
              ))}
            </select>
          </div>
        </div>

        {/* FOTOS */}
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Evidencia Fotográfica</label>
            <div className="grid grid-cols-2 gap-4">
                <div onClick={() => fileInputBeforeRef.current?.click()} className={`relative border-2 border-dashed rounded-xl h-32 flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden ${previewBefore ? 'border-maipu-500 bg-gray-50' : 'border-gray-300 hover:border-maipu-400 hover:bg-gray-50'}`}>
                    {previewBefore ? <><img src={previewBefore} className="absolute inset-0 w-full h-full object-cover opacity-80" /><div className="absolute inset-0 flex items-center justify-center bg-black/30"><span className="bg-black/50 text-white text-xs px-2 py-1 rounded font-bold">ANTES</span></div></> : <><Camera className="text-gray-400 mb-1" /><span className="text-xs text-gray-500 font-bold">FOTO ANTES</span></>}
                    <input ref={fileInputBeforeRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 'BEFORE')} />
                </div>
                <div onClick={() => fileInputAfterRef.current?.click()} className={`relative border-2 border-dashed rounded-xl h-32 flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden ${previewAfter ? 'border-green-500 bg-gray-50' : 'border-gray-300 hover:border-green-400 hover:bg-gray-50'}`}>
                    {previewAfter ? <><img src={previewAfter} className="absolute inset-0 w-full h-full object-cover opacity-80" /><div className="absolute inset-0 flex items-center justify-center bg-black/30"><span className="bg-green-600/80 text-white text-xs px-2 py-1 rounded font-bold">DESPUÉS</span></div></> : <><ImageIcon className="text-gray-400 mb-1" /><span className="text-xs text-gray-500 font-bold">FOTO DESPUÉS</span></>}
                    <input ref={fileInputAfterRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 'AFTER')} />
                </div>
            </div>
            {(previewBefore || previewAfter) && (<button type="button" onClick={() => { setFileBefore(null); setPreviewBefore(null); setFileAfter(null); setPreviewAfter(null); }} className="flex items-center justify-center gap-1 text-xs text-red-500 font-medium mt-2 w-full hover:text-red-700 transition-colors"><X size={14} /> Quitar fotos</button>)}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={isITS ? "Describa la infracción o alerta..." : "Detalles del trabajo..."} rows={2} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-maipu-500 outline-none resize-none"/>
        </div>

        {reportStatus !== 'OK' && (
          <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg flex items-start gap-2">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            <p>Se marcará alerta en el mapa.</p>
          </div>
        )}

        <button type="submit" disabled={sending || !selectedArea} className={`w-full py-4 rounded-xl text-white font-bold shadow-lg transition-all flex items-center justify-center gap-2 ${sending || !selectedArea ? 'bg-gray-300 cursor-not-allowed' : (isITS ? 'bg-orange-600 hover:bg-orange-700' : 'bg-maipu-600 hover:bg-maipu-700')}`}>
          {sending ? <span className="animate-pulse">Guardando...</span> : <>{isITS ? <Siren size={20}/> : <Send size={20} />} {isITS ? 'REPORTAR ALERTA' : 'Registrar Actividad'}</>}
        </button>
      </form>
    </div>
  );
}