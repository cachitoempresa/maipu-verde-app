import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { MapPin, Save, Truck, Loader2, X } from 'lucide-react';

export function WaterTruckLog({ userEmail, onClose }: { userEmail: string, onClose: () => void }) {
    const [loading, setLoading] = useState(false);
    
    const [formData, setFormData] = useState({
        source: '',
        liters: '10000',
        sector: '',
    });

    const handleSubmit = async () => {
        if (!formData.source || !formData.sector) {
            alert("Por favor completa el origen y el sector");
            return;
        }
        setLoading(true);
        try {
            const { error: insertError } = await supabase.from('water_logs').insert({
                truck_id: userEmail,
                source: formData.source,
                amount: parseInt(formData.liters),
                sector: formData.sector,
                timestamp: new Date().toISOString()
            });
            if (insertError) throw insertError;
            alert("✅ Registro de riego guardado");
            onClose();
        } catch (err) { 
            console.error(err);
            alert("Error al guardar el registro"); 
        } finally { 
            setLoading(false); 
        }
    };

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="p-6 bg-emerald-600 text-white flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <Truck size={24}/>
                        <h2 className="text-xl font-black tracking-tight">Registro de Riego</h2>
                    </div>
                    <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-full transition-colors">
                        <X size={24}/>
                    </button>
                </div>

                <div className="p-8 space-y-8">
                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Punto de Carga</label>
                        <div className="grid grid-cols-3 gap-3">
                            {['Grifo', 'Pozo', 'Copa'].map(s => (
                                <button 
                                    key={s}
                                    type="button"
                                    onClick={() => setFormData({...formData, source: s})}
                                    className={`py-4 rounded-2xl font-bold text-sm border-2 transition-all active:scale-95 ${formData.source === s ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-md' : 'border-slate-100 text-slate-400 bg-slate-50'}`}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Sector o Plaza de Destino</label>
                        <div className="relative group">
                            <MapPin className="absolute left-4 top-4 text-slate-300 group-focus-within:text-emerald-500 transition-colors" size={20}/>
                            <input 
                                type="text" 
                                placeholder="Ej: Plaza Maipú / Sector 4" 
                                className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 outline-none font-bold text-slate-700 transition-all shadow-inner"
                                onChange={(e) => setFormData({...formData, sector: e.target.value})}
                            />
                        </div>
                    </div>

                    <button 
                        onClick={handleSubmit}
                        disabled={loading}
                        className="w-full py-5 bg-slate-900 text-white rounded-[1.5rem] font-black text-lg shadow-xl shadow-slate-200 flex items-center justify-center gap-3 hover:bg-emerald-600 hover:shadow-emerald-100 transition-all active:scale-[0.98] disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="animate-spin"/> : <Save size={20}/>} 
                        Finalizar Registro
                    </button>
                </div>
            </div>
        </div>
    );
}