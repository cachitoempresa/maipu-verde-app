import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { 
    Users, Plus, Trash2, X, UserPlus, 
    Hammer, Scissors, Shovel, Loader2, Leaf, MapPin, Edit3
} from 'lucide-react';

interface Personnel {
    id: number;
    name: string;
    role: string;
    assigned_areas: string;
}

interface GreenArea {
    id: number;
    name: string;
    code: string; // O 'codigo' / 'id_serviu', según tu tabla
}

interface TeamManagementProps {
    userEmail: string;
    onClose: () => void;
}

const ROLES = [
    { id: 'Jardinero', label: 'Jardinero General', icon: <Shovel size={16} /> },
    { id: 'Peoneta Poda', label: 'Peoneta Poda', icon: <Scissors size={16} /> },
    { id: 'Peoneta Infra', label: 'Peoneta Infraestructura', icon: <Hammer size={16} /> },
    { id: 'Peoneta Cesped', label: 'Peoneta Césped', icon: <Leaf size={16} /> },
];

export function TeamManagement({ userEmail, onClose }: TeamManagementProps) {
    const [workers, setWorkers] = useState<Personnel[]>([]);
    const [availableAreas, setAvailableAreas] = useState<GreenArea[]>([]);
    const [loading, setLoading] = useState(true);
    
    const [newName, setNewName] = useState('');
    const [newRole, setNewRole] = useState('Jardinero');
    const [newAreas, setNewAreas] = useState('');
    const [adding, setAdding] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            // 1. Cargar Personal
            const { data: staff, error: staffErr } = await supabase
                .from('personnel')
                .select('*')
                .eq('active', true)
                .eq('supervisor_email', userEmail)
                .order('name');
            
            if (staffErr) throw staffErr;
            if (staff) setWorkers(staff);

            // 2. Cargar Áreas Verdes (AAVV) con su CÓDIGO
            // NOTA: Si tu columna se llama 'codigo' o 'id_serviu', cámbialo aquí
            const { data: areas, error: areasErr } = await supabase
                .from('green_areas')
                .select('id, name, code') 
                .order('name');

            if (areasErr) throw areasErr;
            if (areas) setAvailableAreas(areas);

        } catch (err) {
            console.error('Error al cargar datos:', err);
        } finally {
            setLoading(false);
        }
    }, [userEmail]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName) return;
        setAdding(true);

        try {
            const { error } = await supabase.from('personnel').insert({
                name: newName,
                role: newRole,
                assigned_areas: newRole === 'Jardinero' ? newAreas : '',
                supervisor_email: userEmail,
                active: true
            });

            if (error) throw error;
            setNewName('');
            setNewAreas('');
            fetchData();
        } catch (err) {
            console.error('Error:', err);
            alert('Error al agregar personal');
        } finally {
            setAdding(false);
        }
    };

    const handleUpdateAreas = async (id: number, areas: string) => {
        try {
            const { error } = await supabase.from('personnel').update({ assigned_areas: areas }).eq('id', id);
            if (error) throw error;
            setEditingId(null);
            fetchData();
        } catch (err) {
            console.error('Error al actualizar:', err);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('¿Eliminar de la cuadrilla?')) return;
        try {
            await supabase.from('personnel').update({ active: false }).eq('id', id);
            fetchData();
        } catch (err) {
            console.error('Error:', err);
        }
    };

    return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl relative flex flex-col max-h-[90vh] animate-in zoom-in-95 overflow-hidden">
                
                <div className="p-4 border-b bg-slate-50 rounded-t-2xl flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                            <UserPlus className="text-blue-600"/> Gestión de Cuadrilla
                        </h2>
                        <p className="text-xs text-slate-500 tracking-tight">Vínculo exacto por Código de Área Verde</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-500"><X size={20} /></button>
                </div>

                {/* FORMULARIO */}
                <div className="p-4 bg-blue-50/50 border-b border-blue-100">
                    <form onSubmit={handleAdd} className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <input 
                                type="text" 
                                placeholder="Nombre completo" 
                                value={newName} 
                                onChange={e => setNewName(e.target.value)} 
                                className="p-2 rounded-lg border border-slate-300 text-sm outline-none focus:ring-2 focus:ring-blue-500" 
                                required 
                            />
                            <select 
                                value={newRole} 
                                onChange={e => setNewRole(e.target.value)} 
                                className="p-2 rounded-lg border border-slate-300 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                {ROLES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                            </select>
                        </div>
                        
                        {newRole === 'Jardinero' && (
                            <div className="animate-in slide-in-from-top-2">
                                <label className="text-[10px] font-black text-blue-600 uppercase ml-1">Seleccionar Código - Plaza (Mapa)</label>
                                <select 
                                    value={newAreas} 
                                    onChange={e => setNewAreas(e.target.value)}
                                    className="w-full mt-1 p-2 rounded-lg border border-blue-200 bg-white text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
                                    required={newRole === 'Jardinero'}
                                >
                                    <option value="">-- Buscar Código - Nombre --</option>
                                    {availableAreas.map(area => (
                                        <option key={area.id} value={`${area.code} - ${area.name}`}>
                                            {area.code} - {area.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <button 
                            type="submit" 
                            disabled={adding} 
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white p-2.5 rounded-lg font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md"
                        >
                            {adding ? <Loader2 className="animate-spin" size={20}/> : <Plus size={20}/>}
                            Vincular a Cuadrilla
                        </button>
                    </form>
                </div>

                {/* LISTADO */}
                <div className="flex-1 overflow-y-auto p-4 bg-slate-50 space-y-3 custom-scrollbar">
                    {loading ? (
                        <div className="flex justify-center py-10"><Loader2 className="animate-spin text-blue-500"/></div>
                    ) : (
                        workers.map((worker) => (
                            <div key={worker.id} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm hover:border-blue-200 transition-colors">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 shadow-inner">
                                            {ROLES.find(r => r.id === worker.role)?.icon || <Users size={18}/>}
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-700 leading-tight">{worker.name}</p>
                                            <span className="text-[10px] font-black text-blue-600 uppercase tracking-tighter">{worker.role}</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        <button onClick={() => setEditingId(worker.id)} className="p-2 text-slate-300 hover:text-blue-500 transition-colors"><Edit3 size={16}/></button>
                                        <button onClick={() => handleDelete(worker.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                                    </div>
                                </div>
                                
                                {worker.role === 'Jardinero' && (
                                    <div className="mt-2 pl-12 border-t border-slate-50 pt-2">
                                        {editingId === worker.id ? (
                                            <select 
                                                autoFocus
                                                value={worker.assigned_areas} 
                                                onChange={(e) => handleUpdateAreas(worker.id, e.target.value)}
                                                onBlur={() => setEditingId(null)}
                                                className="w-full text-xs p-1.5 border-2 border-blue-500 rounded-md outline-none bg-blue-50 font-bold"
                                            >
                                                <option value="">-- Cambiar Área --</option>
                                                {availableAreas.map(area => (
                                                    <option key={area.id} value={`${area.code} - ${area.name}`}>
                                                        {area.code} - {area.name}
                                                    </option>
                                                ))}
                                            </select>
                                        ) : (
                                            <div className="flex items-center gap-1.5 text-slate-500">
                                                <MapPin size={12} className="text-blue-500"/>
                                                <span className="text-xs font-bold text-slate-600">
                                                    {worker.assigned_areas || 'Sin área vinculada'}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}