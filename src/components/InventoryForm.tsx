import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, Save, Loader2, ClipboardCheck, Ruler, AlertTriangle, PenTool } from 'lucide-react';

// Interfaz de datos del inventario (Coincide con columnas de DB)
interface InventoryData {
  escanos: number;
  juegos_infantiles: number;
  basureros: number;
  juegos_agua: number;
  equip_deportivo: number;
  jardineras: number;
  elem_ornamentales: number;
  elem_conmemorativos: number;
  elem_confinacion: boolean;
  senaletica: number;
  bodegaje: boolean;
  sistema_riego: boolean;
  cercos: boolean;
  elem_complementarios: number;
  sala_bombas: boolean;
  set_deportivo: number;
  otros_desc: string;
}

// Estructura para guardar los reportes de daños locales antes de enviar
interface MaintenanceIssue {
  qty: number;
  detail: string;
}

interface InventoryFormProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  area: any;
  userEmail?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function InventoryForm({ area, userEmail, onClose, onSuccess }: InventoryFormProps) {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  
  // Estado del inventario (Cantidades por defecto)
  const [formData, setFormData] = useState<InventoryData>({
    escanos: 0, juegos_infantiles: 0, basureros: 0, juegos_agua: 0,
    equip_deportivo: 0, jardineras: 0, elem_ornamentales: 0,
    elem_conmemorativos: 0, elem_confinacion: false, senaletica: 0,
    bodegaje: false, sistema_riego: false, cercos: false,
    elem_complementarios: 0, sala_bombas: false, set_deportivo: 0,
    otros_desc: ''
  });

  // Estado para los reportes de daños
  const [issues, setIssues] = useState<Record<string, MaintenanceIssue>>({});
  const [activeIssueField, setActiveIssueField] = useState<string | null>(null);

  // CARGAR DATOS EXISTENTES
  useEffect(() => {
    const fetchInventory = async () => {
      const { data } = await supabase
        .from('area_inventory')
        .select('*')
        .eq('area_id', area.id)
        .single();

      if (data) {
        setFormData({
            escanos: data.escanos || 0,
            juegos_infantiles: data.juegos_infantiles || 0,
            basureros: data.basureros || 0,
            juegos_agua: data.juegos_agua || 0,
            equip_deportivo: data.equip_deportivo || 0,
            jardineras: data.jardineras || 0,
            elem_ornamentales: data.elem_ornamentales || 0,
            elem_conmemorativos: data.elem_conmemorativos || 0,
            elem_confinacion: data.elem_confinacion || false,
            senaletica: data.senaletica || 0,
            bodegaje: data.bodegaje || false,
            sistema_riego: data.sistema_riego || false,
            cercos: data.cercos || false,
            elem_complementarios: data.elem_complementarios || 0,
            sala_bombas: data.sala_bombas || false,
            set_deportivo: data.set_deportivo || 0,
            otros_desc: data.otros_desc || ''
        });
      }
      setFetching(false);
    };
    fetchInventory();
  }, [area.id]);

  const handleChange = (field: keyof InventoryData, value: number | boolean | string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleIssueChange = (field: string, subfield: 'qty' | 'detail', value: string | number) => {
    setIssues(prev => ({
        ...prev,
        [field]: { ...prev[field], [subfield]: value }
    }));
  };

  const toggleIssuePanel = (field: string) => {
    if (activeIssueField === field) {
        setActiveIssueField(null);
    } else {
        if (!issues[field]) {
            setIssues(prev => ({ ...prev, [field]: { qty: 1, detail: '' } }));
        }
        setActiveIssueField(field);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Guardar Inventario
      const { error: invError } = await supabase
        .from('area_inventory')
        .upsert({
          area_id: area.id,
          updated_by: userEmail,
          updated_at: new Date().toISOString(),
          ...formData
        }, { onConflict: 'area_id' });

      if (invError) throw invError;

      // 2. Generar Solicitudes Automáticas para daños reportados
      const issueKeys = Object.keys(issues);
      if (issueKeys.length > 0) {
          const newRequests = issueKeys
            .filter(key => issues[key].detail.trim() !== '') 
            .map(key => ({
                source: 'CATASTRO',
                sender: userEmail || 'Operador',
                status: 'PENDIENTE', // Asegúrate que tu tabla requests acepte esto
                is_emergency: false,
                // Guardamos el detalle concatenado
                description: `[${area.name}] MANTENCIÓN ${key.toUpperCase()}: ${issues[key].qty} unidades. Detalle: ${issues[key].detail}`
            }));
          
          if (newRequests.length > 0) {
             const { error: reqError } = await supabase.from('requests').insert(newRequests); // Ojo: tabla 'requests' o 'tickets' según tu DB
             if (reqError) throw reqError;
          }
      }

      alert('✅ Catastro guardado y solicitudes generadas.');
      onSuccess();
      onClose();

    } catch (error) {
      console.error('Error guardando:', error);
      alert('Error al guardar. Verifica tu conexión.');
    } finally {
      setLoading(false);
    }
  };

  // Sub-componente para filas numéricas
  const ItemRow = ({ label, field }: { label: string, field: keyof InventoryData }) => {
    const hasIssue = !!issues[field as string];
    const isOpen = activeIssueField === field;

    return (
        <div className="border-b border-slate-50 transition-colors hover:bg-slate-50">
            <div className="flex items-center justify-between p-2">
                <label className="text-xs font-bold text-slate-600 uppercase flex items-center gap-2">
                    {label}
                    {hasIssue && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>}
                </label>
                
                <div className="flex items-center gap-2">
                    {/* Botón Reportar Problema */}
                    <button 
                        type="button"
                        onClick={() => toggleIssuePanel(field as string)}
                        className={`p-1.5 rounded-lg transition-colors ${isOpen || hasIssue ? 'bg-red-100 text-red-600' : 'text-slate-300 hover:text-red-400 hover:bg-red-50'}`}
                        title="Reportar daño"
                    >
                        <AlertTriangle size={16} />
                    </button>

                    {/* Input Cantidad */}
                    <input 
                        type="number" 
                        min="0"
                        value={formData[field] as number}
                        onChange={(e) => handleChange(field, parseInt(e.target.value) || 0)}
                        className="w-16 p-1 text-center bg-slate-100 rounded-lg border border-slate-200 font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>
            </div>

            {/* PANEL DE MANTENCIÓN */}
            {isOpen && (
                <div className="p-3 bg-red-50/50 mx-2 mb-2 rounded-lg border border-red-100 animate-in slide-in-from-top-2">
                    <div className="flex items-center gap-2 mb-2 text-[10px] font-bold text-red-500 uppercase">
                        <PenTool size={12}/> Reportar Daño / Faltante
                    </div>
                    <div className="flex gap-2">
                        <div className="w-1/4">
                             <label className="text-[9px] font-bold text-red-400 block mb-1">CANTIDAD</label>
                             <input 
                                type="number" min="1" max={formData[field] as number}
                                value={issues[field as string]?.qty || 1}
                                onChange={(e) => handleIssueChange(field as string, 'qty', parseInt(e.target.value))}
                                className="w-full p-1.5 text-center bg-white border border-red-200 rounded text-red-700 font-bold text-sm focus:outline-none"
                             />
                        </div>
                        <div className="flex-1">
                             <label className="text-[9px] font-bold text-red-400 block mb-1">DETALLE DEL PROBLEMA</label>
                             <input 
                                type="text"
                                placeholder="Ej: Falta pintura, madera rota..."
                                value={issues[field as string]?.detail || ''}
                                onChange={(e) => handleIssueChange(field as string, 'detail', e.target.value)}
                                className="w-full p-1.5 bg-white border border-red-200 rounded text-red-700 text-sm focus:outline-none focus:border-red-400 placeholder:text-red-300"
                             />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
  };

  // Sub-componente para filas booleanas
  const BooleanRow = ({ label, field }: { label: string, field: keyof InventoryData }) => (
    <div className="flex items-center justify-between p-2 border-b border-slate-50 bg-slate-50/50">
        <label className="text-xs font-bold text-slate-600 uppercase flex items-center gap-2">
            {formData[field] ? <ClipboardCheck size={14} className="text-green-600"/> : <div className="w-3.5"/>}
            {label}
        </label>
        <button 
            type="button"
            onClick={() => handleChange(field, !formData[field])}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${formData[field] ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-slate-200 text-slate-500'}`}
        >
            {formData[field] ? 'SÍ TIENE' : 'NO TIENE'}
        </button>
    </div>
  );

  return (
    // FIXED + Z-INDEX ALTO para salir del mapa
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      {/* Modal Content */}
      <div 
        className="bg-white w-full max-w-md rounded-2xl shadow-2xl relative flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()} // IMPORTANTE: Bloquea clicks al mapa
      >
        
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-blue-50 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <div className="bg-blue-100 p-2 rounded-full text-blue-600">
                <Ruler size={20} />
            </div>
            <div>
                <h2 className="text-lg font-black text-slate-800">Catastro de Plaza</h2>
                <p className="text-[10px] text-slate-500 font-mono uppercase">{area.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 bg-white rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            {fetching ? (
                <div className="flex justify-center py-10"><Loader2 className="animate-spin text-blue-500"/></div>
            ) : (
                <form id="inventory-form" onSubmit={handleSubmit} className="space-y-1">
                    <ItemRow label="Escaños (Bancas)" field="escanos" />
                    <ItemRow label="Juegos Infantiles" field="juegos_infantiles" />
                    <ItemRow label="Basureros" field="basureros" />
                    <ItemRow label="Fuentes de Agua" field="juegos_agua" />
                    <ItemRow label="Máquinas Ejercicios" field="equip_deportivo" />
                    <ItemRow label="Jardineras" field="jardineras" />
                    <ItemRow label="Set Deportivo (Arcos)" field="set_deportivo" />
                    <ItemRow label="Señalética" field="senaletica" />
                    <ItemRow label="Elementos Ornamentales" field="elem_ornamentales" />
                    <ItemRow label="Elem. Conmemorativos" field="elem_conmemorativos" />
                    <ItemRow label="Otros Elementos" field="elem_complementarios" />
                    
                    <div className="py-2"><hr className="border-slate-100"/></div>
                    
                    <BooleanRow label="Rejas (Confinación)" field="elem_confinacion" />
                    <BooleanRow label="Sistema de Riego" field="sistema_riego" />
                    <BooleanRow label="Sala de Bombas" field="sala_bombas" />
                    <BooleanRow label="Bodega" field="bodegaje" />
                    <BooleanRow label="Cercos" field="cercos" />
                    
                    <div className="py-2"><hr className="border-slate-100"/></div>

                    <div className="p-2">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Observaciones Generales</label>
                        <textarea 
                            value={formData.otros_desc}
                            onChange={(e) => handleChange('otros_desc', e.target.value)}
                            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm h-20 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                            placeholder="Detalles adicionales..."
                        />
                    </div>
                </form>
            )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
          <button
            form="inventory-form"
            type="submit"
            disabled={loading || fetching}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-70"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
            {loading ? 'Procesando...' : 'Guardar Inventario'}
          </button>
        </div>

      </div>
    </div>
  );
}