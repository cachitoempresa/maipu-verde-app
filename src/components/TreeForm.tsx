import { useState } from 'react';
import { X, Save, Loader2, Trees, Ruler, AlertTriangle, Sprout, ClipboardList } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface TreeFormProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    area: any;
    userEmail?: string;
    onClose: () => void;
    onSuccess: () => void;
}

export function TreeForm({ area, userEmail, onClose, onSuccess }: TreeFormProps) {
    const [loading, setLoading] = useState(false);
    
    // CAMPOS DE ARBOLADO
    const [treeCount, setTreeCount] = useState('');
    const [species, setSpecies] = useState('NATIVAS_MIXTAS');
    const [avgHeight, setAvgHeight] = useState('MEDIA');
    const [healthStatus, setHealthStatus] = useState('SANO');
    const [riskLevel, setRiskLevel] = useState('BAJO');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { error } = await supabase
                .from('area_inventory')
                .upsert({ 
                    area_id: area.id,
                    updated_by: userEmail,
                    updated_at: new Date().toISOString(),
                    tree_count: treeCount ? parseInt(treeCount) : 0,
                    tree_data: { 
                        species: species,
                        height_cat: avgHeight,
                        health: healthStatus,
                        risk: riskLevel,
                        last_pruning: new Date().toISOString()
                    }
                }, { onConflict: 'area_id' });

            if (error) throw error;
            onSuccess();
            onClose();

        } catch (error) {
            console.error("Error guardando árboles:", error);
            alert("Error al guardar arbolado.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
            
            {/* Backdrop Oscuro */}
            <div 
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
                onClick={onClose} 
            />

            {/* Modal Content */}
            <div 
                className="bg-white w-full max-w-md rounded-2xl shadow-2xl relative flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()} 
            >
                
                {/* Header Limpio (Sin indicador de Riego) */}
                <div className="p-4 border-b border-green-100 flex justify-between items-center bg-green-50 rounded-t-2xl">
                    <div className="flex items-center gap-2">
                        <div className="bg-green-100 p-2 rounded-full text-green-700">
                            <Trees size={20} />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-slate-800">Catastro Arbolado</h3>
                            <p className="text-[10px] text-slate-500 font-mono uppercase">{area.name}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 bg-white rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Formulario con Scroll */}
                <form id="tree-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 custom-scrollbar space-y-6">
                    
                    {/* Cantidad */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-600 uppercase flex items-center gap-2">
                            <ClipboardList size={14}/> Cantidad Total Individuos
                        </label>
                        <input 
                            type="number" 
                            value={treeCount}
                            onChange={(e) => setTreeCount(e.target.value)}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none font-bold text-slate-800 text-lg text-center"
                            placeholder="Ej: 45"
                            required
                        />
                    </div>

                    <div className="border-t border-slate-100"></div>

                    {/* Especies */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-600 uppercase flex items-center gap-2">
                            <Sprout size={14}/> Especies Predominantes
                        </label>
                        <select 
                            value={species}
                            onChange={(e) => setSpecies(e.target.value)}
                            className="w-full p-3 border border-slate-200 rounded-xl bg-white text-sm font-medium focus:ring-2 focus:ring-green-500 outline-none"
                        >
                            <option value="NATIVAS_MIXTAS">🍃 Nativas Mixtas (Quillay, Peumo)</option>
                            <option value="EXOTICAS">🍁 Exóticas (Liquidambar, Plátano)</option>
                            <option value="CONIFERAS">🌲 Coníferas (Pinos, Cedros)</option>
                            <option value="PALMERAS">🌴 Palmeras</option>
                            <option value="MIXTO">🌳 Mixto / Variado</option>
                        </select>
                    </div>

                    {/* Altura */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-600 uppercase flex items-center gap-2">
                            <Ruler size={14}/> Altura Promedio
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            <button type="button" onClick={() => setAvgHeight('BAJA')} className={`py-3 text-xs font-bold rounded-xl border transition-all ${avgHeight === 'BAJA' ? 'bg-green-100 text-green-800 border-green-300 ring-1 ring-green-300' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}>Baja (&lt;3m)</button>
                            <button type="button" onClick={() => setAvgHeight('MEDIA')} className={`py-3 text-xs font-bold rounded-xl border transition-all ${avgHeight === 'MEDIA' ? 'bg-green-100 text-green-800 border-green-300 ring-1 ring-green-300' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}>Media (3-10m)</button>
                            <button type="button" onClick={() => setAvgHeight('ALTA')} className={`py-3 text-xs font-bold rounded-xl border transition-all ${avgHeight === 'ALTA' ? 'bg-green-100 text-green-800 border-green-300 ring-1 ring-green-300' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}>Alta (&gt;10m)</button>
                        </div>
                    </div>

                    {/* Estado Fitosanitario */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-600 uppercase">Estado Sanitario General</label>
                        <select 
                            value={healthStatus}
                            onChange={(e) => setHealthStatus(e.target.value)}
                            className="w-full p-3 border border-slate-200 rounded-xl bg-white text-sm font-medium focus:ring-2 focus:ring-green-500 outline-none"
                        >
                            <option value="SANO">✅ Sano / Vigoroso</option>
                            <option value="REGULAR">⚠️ Regular / Estrés Hídrico</option>
                            <option value="ENFERMO">🤒 Enfermo / Plagas</option>
                            <option value="SECO">💀 Seco / Muerto</option>
                        </select>
                    </div>

                    {/* Riesgo */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-600 uppercase flex items-center gap-2">
                            <AlertTriangle size={14}/> Riesgo de Caída
                        </label>
                        <div className="flex gap-2">
                            {['BAJO', 'MEDIO', 'ALTO'].map(r => (
                                <label key={r} className={`flex-1 p-3 border rounded-xl cursor-pointer text-center text-xs font-bold transition-all
                                    ${riskLevel === r 
                                        ? (r === 'ALTO' ? 'bg-red-600 text-white border-red-600 shadow-md' : r === 'MEDIO' ? 'bg-amber-500 text-white border-amber-500 shadow-md' : 'bg-green-600 text-white border-green-600 shadow-md') 
                                        : 'bg-slate-50 text-slate-400 hover:bg-slate-100 border-slate-200'
                                    }`}>
                                    <input type="radio" className="hidden" name="risk" checked={riskLevel === r} onChange={() => setRiskLevel(r)} />
                                    {r}
                                </label>
                            ))}
                        </div>
                    </div>

                </form>

                {/* Footer */}
                <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
                    <button 
                        form="tree-form"
                        type="submit" 
                        disabled={loading} 
                        className="w-full bg-green-700 hover:bg-green-800 text-white font-bold py-3 rounded-xl shadow-lg shadow-green-700/20 flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-70"
                    >
                        {loading ? <Loader2 className="animate-spin" size={20}/> : <Save size={20} />}
                        {loading ? 'Guardando...' : 'Guardar Catastro'}
                    </button>
                </div>
            </div>
        </div>
    );
}