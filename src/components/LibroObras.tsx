import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Search, MapPin, Calendar, ClipboardList, HardHat, FileText, CheckCircle2, ChevronRight } from 'lucide-react';

// 1. DEFINIMOS LOS TIPOS DE DATOS (Para que TypeScript no se queje)
interface GreenArea {
  id: number;
  name: string;
  code: string;
  current_status: string;
}

interface ServiceLog {
  id: number;
  activity_type: string;
  description: string;
  timestamp: string;
  operator_email: string;
  photo_url?: string; // El signo ? significa que puede no tener foto
  area_id: number;
}

interface LibroObrasProps {
  user: { name: string; role: string } | null;
  onBack: () => void;
}

export function LibroObras({ user, onBack }: LibroObrasProps) {
  
  // 2. AHORA USAMOS LOS TIPOS EN VEZ DE 'any'
  const [areas, setAreas] = useState<GreenArea[]>([]);
  const [selectedArea, setSelectedArea] = useState<GreenArea | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [logs, setLogs] = useState<ServiceLog[]>([]); // Aquí estaba el error antes
  const [loadingLogs, setLoadingLogs] = useState(false);

  // 1. CARGAR LISTA DE PLAZAS
  useEffect(() => {
    const fetchAreas = async () => {
      const { data, error } = await supabase
        .from('green_areas')
        .select('*')
        .order('name');
      
      if (error) {
        console.error('Error cargando áreas:', error);
      } else if (data) {
        // Forzamos el tipo porque sabemos que viene de la base de datos
        setAreas(data as GreenArea[]);
      }
    };
    fetchAreas();
  }, []);

  // 2. CARGAR HISTORIAL CUANDO ELIGES UNA PLAZA
  useEffect(() => {
    if (!selectedArea) return;

    const fetchLogs = async () => {
      setLoadingLogs(true);
      const { data, error } = await supabase
        .from('logs')
        .select('*')
        .eq('area_id', selectedArea.id)
        .order('timestamp', { ascending: false });
      
      if (error) {
        console.error('Error cargando logs:', error);
      } else if (data) {
        setLogs(data as ServiceLog[]);
      }
      setLoadingLogs(false);
    };

    fetchLogs();
  }, [selectedArea]);

  // Filtrar plazas por buscador
  const filteredAreas = areas.filter(a => 
    a.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    a.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      
      {/* BARRA SUPERIOR */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="font-bold text-slate-800 text-lg flex items-center gap-2">
              <FileText className="text-green-600" size={20}/> Libro de Obras Digital
            </h1>
            <p className="text-xs text-slate-400">Registro histórico y asistencia</p>
          </div>
        </div>
        <div className="hidden sm:block text-right">
             <p className="text-xs font-bold text-slate-700">{user?.name}</p>
             <p className="text-[10px] text-slate-400 uppercase">{user?.role}</p>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        
        {/* COLUMNA IZQUIERDA: LISTA DE PLAZAS */}
        <div className="w-full md:w-80 bg-white border-r border-slate-200 flex flex-col z-10 shadow-lg md:shadow-none absolute md:relative h-full transition-transform transform md:translate-x-0" 
             style={{ display: selectedArea && window.innerWidth < 768 ? 'none' : 'flex' }}>
            
            {/* Buscador */}
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text" 
                  placeholder="Buscar plaza..." 
                  className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/50"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Lista Scrollable */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {filteredAreas.map(area => (
                <button
                  key={area.id}
                  onClick={() => setSelectedArea(area)}
                  className={`w-full p-4 text-left border-b border-slate-50 hover:bg-slate-50 transition-colors flex items-center justify-between
                    ${selectedArea?.id === area.id ? 'bg-green-50 border-l-4 border-l-green-500' : 'border-l-4 border-l-transparent'}`}
                >
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block mb-0.5">{area.code}</span>
                    <span className="font-bold text-slate-700 text-sm">{area.name}</span>
                  </div>
                  <ChevronRight size={16} className={`text-slate-300 ${selectedArea?.id === area.id ? 'text-green-600' : ''}`}/>
                </button>
              ))}
            </div>
        </div>

        {/* COLUMNA DERECHA: DETALLE */}
        <div className="flex-1 bg-slate-50 flex flex-col relative overflow-hidden">
           
           {!selectedArea ? (
             // --- ESTADO VACÍO ---
             <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center animate-in fade-in zoom-in duration-500">
                <div className="bg-white p-6 rounded-full shadow-sm mb-4">
                    <MapPin size={48} className="text-slate-200" />
                </div>
                <h3 className="text-lg font-bold text-slate-600">Ninguna zona seleccionada</h3>
                <p className="text-sm max-w-xs mt-2">Seleccione una plaza del listado de la izquierda para ver su bitácora, asistencia y detalles.</p>
             </div>
           ) : (
             // --- CONTENIDO DE LA PLAZA SELECCIONADA ---
             <div className="flex-1 flex flex-col h-full animate-in slide-in-from-right duration-300">
                
                {/* Header de la Plaza */}
                <div className="bg-white p-6 border-b border-slate-200 shadow-sm flex justify-between items-start">
                   <div>
                      <button onClick={() => setSelectedArea(null)} className="md:hidden text-slate-500 mb-2 flex items-center gap-1 text-xs font-bold">
                         <ArrowLeft size={14} /> Volver a lista
                      </button>
                      <h2 className="text-2xl font-black text-slate-800">{selectedArea.name}</h2>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-mono font-bold border border-slate-200">
                            {selectedArea.code}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1
                            ${selectedArea.current_status === 'OK' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                             {selectedArea.current_status === 'OK' ? <CheckCircle2 size={12}/> : <MapPin size={12}/>}
                             {selectedArea.current_status}
                        </span>
                      </div>
                   </div>
                   
                   <div className="flex gap-2">
                      <button className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-bold hover:bg-slate-700 transition-colors shadow-sm">
                          <HardHat size={14} /> Asistencia Personal
                      </button>
                      <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 transition-colors shadow-sm">
                          <Calendar size={14} /> Programación
                      </button>
                   </div>
                </div>

                {/* Historial (Bitácora) */}
                <div className="flex-1 overflow-y-auto p-6">
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <ClipboardList size={16}/> Historial de Operaciones
                    </h3>

                    {loadingLogs ? (
                        <div className="space-y-4">
                            {[1,2,3].map(i => <div key={i} className="h-24 bg-white rounded-xl animate-pulse"></div>)}
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="text-center p-10 bg-white rounded-xl border border-dashed border-slate-300 text-slate-400">
                            <p>No hay registros en esta bitácora aún.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {logs.map((log) => (
                                <div key={log.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 hover:border-green-200 transition-all">
                                    <div className="flex justify-between items-start">
                                        <div className="flex gap-3">
                                            <div className="mt-1">
                                                {/* Icono según tipo */}
                                                <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-500 font-bold text-xs border border-slate-200">
                                                    {log.activity_type.charAt(0)}
                                                </div>
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-800 text-sm">{log.activity_type}</p>
                                                <p className="text-slate-600 text-sm mt-1">{log.description}</p>
                                                {log.photo_url && (
                                                    <img src={log.photo_url} alt="Evidencia" className="mt-3 h-32 rounded-lg object-cover border border-slate-200" />
                                                )}
                                                <p className="text-xs text-slate-400 mt-2">
                                                    Operador: {log.operator_email}
                                                </p>
                                            </div>
                                        </div>
                                        <span className="text-xs text-slate-400 font-mono whitespace-nowrap">
                                            {new Date(log.timestamp).toLocaleDateString()} {new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
             </div>
           )}
        </div>
      </div>
    </div>
  );
}