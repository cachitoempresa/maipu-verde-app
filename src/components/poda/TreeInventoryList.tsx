import { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Leaf, AlertCircle, CheckCircle2, Trees, Loader2, X, ChevronDown, Check, MapPin } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { SPECIES_LIST } from './podaData';
import { GreenArea } from '../../types';

interface Tree {
    id: number;
    area_id?: number;
    species: string;
    height?: string;
    condition?: string;
    last_pruning?: string;
    created_at?: string;
    area_name?: string; // Optional join field
}

interface TreeInventoryListProps {
    selectedArea?: GreenArea | null;
}

export function TreeInventoryList({ selectedArea }: TreeInventoryListProps) {
    const [loading, setLoading] = useState(true);
    const [trees, setTrees] = useState<Tree[]>([]);
    const [filter, setFilter] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);

    // Add Form State
    const [newSpecies, setNewSpecies] = useState('');
    const [speciesQuery, setSpeciesQuery] = useState('');
    const [showSpeciesList, setShowSpeciesList] = useState(false);
    const [newHeight, setNewHeight] = useState('');
    const [newCondition, setNewCondition] = useState('BUENO');
    const [isSaving, setIsSaving] = useState(false);

    const filteredSpecies = useMemo(() => {
        if (!speciesQuery) return [];
        return SPECIES_LIST.filter(s => s.toLowerCase().includes(speciesQuery.toLowerCase()));
    }, [speciesQuery]);

    useEffect(() => {
        fetchTrees();
    }, [selectedArea]);

    const fetchTrees = async () => {
        setLoading(true);
        // Build query
        let query = supabase.from('trees').select('*').order('created_at', { ascending: false });

        // If an area is selected, filter by it
        if (selectedArea) {
            query = query.eq('area_id', selectedArea.id);
        }

        const { data, error } = await query;
        if (!error && data) {
            setTrees(data);
        }
        setLoading(false);
    };

    const handleAddTree = async () => {
        if (!newSpecies) return;
        setIsSaving(true);
        try {
            const newTreePayload: any = {
                species: newSpecies,
                height: newHeight,
                condition: newCondition,
                last_pruning: new Date().toISOString(),
                area_id: selectedArea?.id || null // Link to area if selected
            };

            const { error } = await supabase.from('trees').insert([newTreePayload]);

            if (error) throw error;

            setShowAddModal(false);
            setNewSpecies('');
            setSpeciesQuery('');
            setNewHeight('');
            fetchTrees(); // Refresh list
        } catch (e) {
            console.error("Error adding tree:", e);
            alert("Error al agregar árbol");
        } finally {
            setIsSaving(false);
        }
    };

    const handleSpeciesSelect = (s: string) => {
        setNewSpecies(s);
        setSpeciesQuery(s);
        setShowSpeciesList(false);
    };

    const displayTrees = trees.filter(t =>
        t.species.toLowerCase().includes(filter.toLowerCase()) ||
        t.id.toString().includes(filter)
    );

    return (
        <div className="p-4 space-y-4 h-full flex flex-col relative">

            {/* Header Context (if filtered) */}
            {selectedArea && (
                <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl flex items-center gap-2">
                    <MapPin className="text-blue-500" size={18} />
                    <div>
                        <p className="text-[10px] text-blue-400 font-bold uppercase">Inventario Filtrado</p>
                        <h3 className="font-bold text-blue-700 leading-none">{selectedArea.name}</h3>
                    </div>
                    <button onClick={() => window.location.reload()} className="ml-auto text-xs text-blue-400 underline">Ver Todos</button>
                    {/* Note: Reload is a hacky reset, ideally we bubble up a clear selection or just let it stay */}
                </div>
            )}

            {/* Header & Search */}
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar especie o ID..."
                        className="w-full pl-10 pr-4 py-3 bg-white rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-blue-500"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                    />
                </div>
                {/* Only allow adding if an area is selected? Or allow adding generic? 
                    Usually inventory is tied to an area. Let's assume we need an area.
                    But user asked to 'autocomplete'.
                */}
                <button
                    onClick={() => {
                        if (!selectedArea) {
                            alert("Por favor seleccione una plaza desde el Mapa para agregar árboles.");
                            return;
                        }
                        setShowAddModal(true);
                    }}
                    className={`p-3 rounded-xl shadow-lg active:scale-95 transition-all text-white ${selectedArea ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-300 cursor-not-allowed'}`}
                >
                    <Plus size={20} />
                </button>
            </div>

            {/* Tree List */}
            <div className="flex-1 overflow-y-auto pb-20 space-y-3 custom-scrollbar">
                {loading ? (
                    <div className="flex justify-center py-10"><Loader2 className="animate-spin text-emerald-600" /></div>
                ) : displayTrees.length === 0 ? (
                    <div className="text-center py-10 text-slate-400">
                        <Trees size={40} className="mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No hay árboles registrados {selectedArea ? 'en esta área' : ''}.</p>
                    </div>
                ) : (
                    displayTrees.map(tree => (
                        <div key={tree.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex justify-between items-center animate-in fade-in slide-in-from-bottom-2">
                            <div className="flex items-center gap-3">
                                <div className={`p-3 rounded-full ${tree.condition === 'MALO' || tree.condition === 'RIESGO' ? 'bg-red-100 text-red-600' :
                                    tree.condition === 'REGULAR' ? 'bg-amber-100 text-amber-600' :
                                        'bg-emerald-100 text-emerald-600'
                                    }`}>
                                    <Leaf size={20} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">#{tree.id}</span>
                                        <h4 className="font-bold text-slate-800 uppercase text-sm">{tree.species}</h4>
                                    </div>
                                    <p className="text-[10px] text-slate-500 mt-0.5">
                                        Altura: {tree.height || 'N/A'} • Est: {tree.condition} • {tree.last_pruning ? new Date(tree.last_pruning).toLocaleDateString() : '-'}
                                    </p>
                                </div>
                            </div>
                            <button className="text-slate-300 hover:text-emerald-500 p-2 transition-colors">
                                <CheckCircle2 size={24} />
                            </button>
                        </div>
                    ))
                )}
            </div>

            {/* ADD MODAL */}
            {showAddModal && (
                <div className="absolute inset-0 z-50 bg-white/95 backdrop-blur-sm p-6 flex flex-col animate-in fade-in zoom-in-95 rounded-xl">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-black text-xl text-slate-800">Nuevo Árbol</h3>
                        <button onClick={() => setShowAddModal(false)} className="p-2 bg-slate-100 rounded-full"><X size={20} /></button>
                    </div>

                    <div className="space-y-4 flex-1 overflow-y-auto">
                        {/* Species Selector */}
                        <div className="space-y-1 relative">
                            <label className="text-xs font-bold text-slate-400 uppercase">Especie</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Buscar especie..."
                                    value={newSpecies === 'OTRO' ? 'OTRO / NO LISTADO' : speciesQuery}
                                    onChange={(e) => {
                                        setNewSpecies('');
                                        setSpeciesQuery(e.target.value);
                                        setShowSpeciesList(true);
                                    }}
                                    onFocus={() => setShowSpeciesList(true)}
                                    className="w-full p-3 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-emerald-500 text-sm font-bold text-slate-700"
                                />
                                {newSpecies && <Check className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500" size={16} />}
                            </div>

                            {showSpeciesList && (
                                <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-100 rounded-xl shadow-xl max-h-40 overflow-y-auto">
                                    {filteredSpecies.slice(0, 50).map(s => (
                                        <div
                                            key={s}
                                            onClick={() => handleSpeciesSelect(s)}
                                            className="p-3 text-sm text-slate-600 hover:bg-slate-50 cursor-pointer border-b border-slate-50"
                                        >
                                            {s}
                                        </div>
                                    ))}
                                    <div onClick={() => handleSpeciesSelect('OTRO')} className="p-3 text-sm font-bold text-amber-600 hover:bg-amber-50 cursor-pointer">
                                        OTRO / NO LISTADO
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Height */}
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-400 uppercase">Altura aprox (m)</label>
                            <input
                                type="text"
                                value={newHeight}
                                onChange={(e) => setNewHeight(e.target.value)}
                                className="w-full p-3 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-emerald-500 text-sm font-bold"
                                placeholder="Ej: 5m"
                            />
                        </div>

                        {/* Condition */}
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-400 uppercase">Estado</label>
                            <select
                                value={newCondition}
                                onChange={(e) => setNewCondition(e.target.value)}
                                className="w-full p-3 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-emerald-500 text-sm font-bold"
                            >
                                <option value="BUENO">Bueno</option>
                                <option value="REGULAR">Regular</option>
                                <option value="MALO">Malo</option>
                                <option value="RIESGO">Riesgo Caída</option>
                            </select>
                        </div>
                    </div>

                    <button
                        onClick={handleAddTree}
                        disabled={!newSpecies || isSaving}
                        className="w-full py-4 bg-emerald-600 text-white rounded-xl font-black uppercase shadow-xl active:scale-95 disabled:opacity-50 mt-4 flex justify-center items-center gap-2"
                    >
                        {isSaving ? <Loader2 className="animate-spin" /> : <Trees size={20} />}
                        Guardar Árbol
                    </button>
                </div>
            )}
        </div>
    );
}

