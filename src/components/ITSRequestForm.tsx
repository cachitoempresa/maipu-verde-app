import { useState } from 'react';
import { X, AlertOctagon, AlertTriangle, FileWarning, Send, Loader2, Droplets, Scissors, Trash2, Hammer, LayoutGrid } from 'lucide-react';

interface RequestFormProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    area: any;
    userEmail?: string;
    onClose: () => void;
}

const CATEGORIES = [
    { id: 'ASEO', label: 'Aseo / Limpieza', icon: Trash2, activeClass: 'bg-cyan-50 border-cyan-500 text-cyan-700' },
    { id: 'RIEGO', label: 'Riego / Agua', icon: Droplets, activeClass: 'bg-blue-50 border-blue-500 text-blue-700' },
    { id: 'PODA', label: 'Poda / Arbolado', icon: Scissors, activeClass: 'bg-green-50 border-green-500 text-green-700' },
    { id: 'INFRA', label: 'Infraestructura', icon: Hammer, activeClass: 'bg-orange-50 border-orange-500 text-orange-700' },
];

export function ITSRequestForm({ area, userEmail, onClose }: RequestFormProps) {
    const [priority, setPriority] = useState<'ALTA' | 'MEDIA' | 'BAJA'>('MEDIA');
    const [category, setCategory] = useState('ASEO'); // Categoría por defecto
    const [observation, setObservation] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const newTicket = {
            id: Date.now(),
            area: area.name,
            priority: priority,
            category: category, // Guardamos la categoría
            // Agregamos la categoría al detalle para que se vea en el feed actual
            detail: `[${category}] ${observation}`, 
            author: userEmail || 'Inspector ITS',
            time: new Date().toISOString(),
            status: 'PENDIENTE'
        };

        // Guardar en LocalStorage (Simulación)
        const existingTickets = JSON.parse(localStorage.getItem('maipu_tickets') || '[]');
        localStorage.setItem('maipu_tickets', JSON.stringify([newTicket, ...existingTickets]));

        await new Promise(resolve => setTimeout(resolve, 800)); // Simular red
        
        alert(`✅ Solicitud de ${category} enviada a Operaciones.\n\nSe ha notificado al equipo de turno sobre la prioridad ${priority}.`);
        setLoading(false);
        onClose();
    };

    return (
        // Modal Fixed Z-Index Supremo
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" style={{ zIndex: 99999 }}>
            <div 
                className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="bg-slate-800 p-4 flex justify-between items-center border-b border-slate-700">
                    <div>
                        <h3 className="text-white font-bold text-lg">Nueva Solicitud ITS</h3>
                        <p className="text-slate-400 text-xs">{area.name}</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><X size={24} /></button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
                    
                    {/* 1. Selector de Categoría (NUEVO) */}
                    <div className="space-y-3">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                            <LayoutGrid size={14} /> Tipo de Solicitud
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            {CATEGORIES.map((cat) => (
                                <button
                                    key={cat.id}
                                    type="button"
                                    onClick={() => setCategory(cat.id)}
                                    className={`p-3 rounded-lg border flex flex-col items-center justify-center gap-2 transition-all active:scale-95 ${
                                        category === cat.id 
                                            ? `${cat.activeClass} ring-1 ring-offset-1` 
                                            : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                                    }`}
                                >
                                    <cat.icon size={24} />
                                    <span className="text-xs font-bold uppercase">{cat.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 2. Selector de Prioridad */}
                    <div className="space-y-3">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Nivel de Prioridad</label>
                        <div className="grid grid-cols-1 gap-3">
                            <label className={`relative flex items-center p-3 border rounded-lg cursor-pointer transition-all ${priority === 'ALTA' ? 'bg-red-50 border-red-500 ring-1 ring-red-500' : 'border-slate-200 hover:bg-slate-50'}`}>
                                <input type="radio" name="priority" value="ALTA" className="sr-only" onChange={() => setPriority('ALTA')} checked={priority === 'ALTA'} />
                                <div className={`p-2 rounded-full mr-3 ${priority === 'ALTA' ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-400'}`}><AlertOctagon size={20} /></div>
                                <div><span className={`block text-sm font-bold ${priority === 'ALTA' ? 'text-red-700' : 'text-slate-700'}`}>Prioridad Crítica</span><span className="text-[10px] text-slate-500">Riesgo inminente o multa aplicable.</span></div>
                            </label>
                            
                            <label className={`relative flex items-center p-3 border rounded-lg cursor-pointer transition-all ${priority === 'MEDIA' ? 'bg-amber-50 border-amber-500 ring-1 ring-amber-500' : 'border-slate-200 hover:bg-slate-50'}`}>
                                <input type="radio" name="priority" value="MEDIA" className="sr-only" onChange={() => setPriority('MEDIA')} checked={priority === 'MEDIA'} />
                                <div className={`p-2 rounded-full mr-3 ${priority === 'MEDIA' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-400'}`}><AlertTriangle size={20} /></div>
                                <div><span className={`block text-sm font-bold ${priority === 'MEDIA' ? 'text-amber-700' : 'text-slate-700'}`}>Prioridad Normal</span><span className="text-[10px] text-slate-500">Incumplimiento de estándar operativo.</span></div>
                            </label>
                            
                            <label className={`relative flex items-center p-3 border rounded-lg cursor-pointer transition-all ${priority === 'BAJA' ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500' : 'border-slate-200 hover:bg-slate-50'}`}>
                                <input type="radio" name="priority" value="BAJA" className="sr-only" onChange={() => setPriority('BAJA')} checked={priority === 'BAJA'} />
                                <div className={`p-2 rounded-full mr-3 ${priority === 'BAJA' ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-400'}`}><FileWarning size={20} /></div>
                                <div><span className={`block text-sm font-bold ${priority === 'BAJA' ? 'text-blue-700' : 'text-slate-700'}`}>Prioridad Baja</span><span className="text-[10px] text-slate-500">Observación general o sugerencia.</span></div>
                            </label>
                        </div>
                    </div>

                    {/* 3. Text Area Detalle */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Detalle del Hallazgo</label>
                        <textarea 
                            value={observation} 
                            onChange={(e) => setObservation(e.target.value)} 
                            className="w-full p-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-800 min-h-[100px]" 
                            placeholder={`Describa la situación de ${category.toLowerCase()}...`} 
                            required 
                        />
                    </div>
                </form>

                {/* Footer */}
                <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 uppercase">Cancelar</button>
                    <button onClick={handleSubmit} disabled={loading} className="bg-slate-900 text-white px-6 py-2 rounded-lg text-xs font-bold uppercase hover:bg-black transition-all flex items-center gap-2 disabled:opacity-70">
                        {loading ? <Loader2 className="animate-spin" size={16}/> : <Send size={16} />}
                        {loading ? 'Enviando...' : 'Ingresar Solicitud'}
                    </button>
                </div>
            </div>
        </div>
    );
}