import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Truck, Save, Loader2, CheckCircle2, History, Droplets, Map as MapIcon } from 'lucide-react';
import { BrandHeader } from './ui/BrandHeader';

// CONFIGURACIÓN DE DATOS MAIPÚ VERDE
const LOADING_POINTS = [
    "Marta Ossa Ruiz / Longitudinal",
    "Av. Pajaritos / Santa Corina",
    "Av. Pajaritos / Av. Las Parcelas",
    "Av. Pajaritos / Los Pintores",
    "Av. El Rosal / Presidente Jorge Alessandri"
];

const VOLUMES = [2500, 5000, 10000];

const WATERING_SECTORS = [
    "Pajaritos",
    "Trebol Pajaritos",
    "Longitudinal",
    "El Rosal",
    "Ing Dominguez",
    "Isabel Riquelme",
    "Indicaciones Especiales"
];

interface WaterLog {
    id: number;
    truck_id: string;
    source: string;
    sector: string;
    amount: number;
    timestamp: string;
}

interface DriverUser {
    email: string;
}

export function DriverDashboard({ user, onLogout }: { user: DriverUser, onLogout: () => void }) {
    const [loading, setLoading] = useState(false);
    const [history, setHistory] = useState<WaterLog[]>([]);
    const [formData, setFormData] = useState({ source: '', sector: '', amount: 10000 });

    const fetchTodayLogs = useCallback(async () => {
        const today = new Date().toISOString().split('T')[0];
        const { data } = await supabase
            .from('water_logs')
            .select('*')
            .eq('truck_id', user.email)
            .gte('timestamp', today)
            .order('timestamp', { ascending: false });
        if (data) setHistory(data as WaterLog[]);
    }, [user.email]);

    useEffect(() => {
        fetchTodayLogs();
    }, [fetchTodayLogs, loading]);

    const handleSubmit = async () => {
        if (!formData.source || !formData.sector) {
            alert("⚠️ Por favor seleccione el Punto de Carga y el Sector de Riego.");
            return;
        }
        setLoading(true);
        try {
            const { error } = await supabase.from('water_logs').insert({
                truck_id: user.email,
                source: formData.source,
                sector: formData.sector,
                amount: formData.amount,
                timestamp: new Date().toISOString()
            });
            if (error) throw error;
            setFormData({ ...formData, source: '', sector: '' }); 
            alert("✅ Registro de riego guardado con éxito.");
        } catch (err) {
            console.error("Error al guardar riego:", err);
            alert("❌ Error al guardar el registro.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans antialiased">
            <BrandHeader user={user} onLogout={onLogout} />

            <main className="flex-1 max-w-xl mx-auto w-full p-4 space-y-6 pb-20">
                {/* TARJETA DE CONTROL */}
                <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-emerald-100/50 border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-emerald-600 p-8 text-white">
                        <div className="flex justify-between items-center mb-4">
                            <Truck size={42} className="opacity-90" />
                            <div className="text-right">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-200">Camión Aljibe</p>
                                <p className="font-bold text-lg italic">10.000 Litros</p>
                            </div>
                        </div>
                        <h2 className="text-2xl font-black uppercase tracking-tight">Registro de Riego</h2>
                    </div>

                    <div className="p-8 space-y-8">
                        {/* VOLUMEN DE CARGA */}
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                <Droplets size={14} className="text-emerald-500"/> Volumen de Carga (L)
                            </label>
                            <div className="grid grid-cols-3 gap-3">
                                {VOLUMES.map(v => (
                                    <button 
                                        key={v}
                                        onClick={() => setFormData({...formData, amount: v})}
                                        className={`py-4 rounded-2xl font-black text-sm border-2 transition-all active:scale-90 ${formData.amount === v ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-md' : 'border-slate-100 bg-slate-50 text-slate-400'}`}
                                    >
                                        {v.toLocaleString()}L
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* PUNTO DE CARGA */}
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Punto de Carga (Grifo)</label>
                            <select 
                                value={formData.source}
                                onChange={(e) => setFormData({...formData, source: e.target.value})}
                                className="w-full p-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-emerald-500 outline-none font-bold text-slate-700 transition-all text-sm"
                            >
                                <option value="">-- Seleccionar Punto --</option>
                                {LOADING_POINTS.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>

                        {/* SECTOR DE RIEGO */}
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                <MapIcon size={14} className="text-emerald-500"/> Sector de Riego (AAVV)
                            </label>
                            <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                {WATERING_SECTORS.map(s => (
                                    <button 
                                        key={s}
                                        onClick={() => setFormData({...formData, sector: s})}
                                        className={`w-full p-4 rounded-xl text-left text-xs font-bold border-2 transition-all ${formData.sector === s ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-50 bg-slate-50 text-slate-500 hover:border-slate-200'}`}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button 
                            onClick={handleSubmit}
                            disabled={loading}
                            className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black text-xl shadow-2xl shadow-emerald-100 flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="animate-spin"/> : <Save size={24}/>}
                            CONFIRMAR RIEGO
                        </button>
                    </div>
                </div>

                {/* HISTORIAL RECIENTE */}
                <div className="space-y-4">
                    <h3 className="flex items-center gap-2 font-black text-slate-400 uppercase text-[10px] tracking-[0.2em] ml-4">
                        <History size={16}/> Resumen de Hoy
                    </h3>
                    <div className="space-y-3">
                        {history.length === 0 ? (
                            <div className="text-center py-10 bg-white rounded-[2rem] border border-dashed border-slate-200">
                                <p className="text-slate-400 text-xs font-medium italic">Sin registros para hoy</p>
                            </div>
                        ) : (
                            history.map((log) => (
                                <div key={log.id} className="bg-white p-5 rounded-3xl border border-slate-100 flex justify-between items-center shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-center gap-4">
                                        <div className="bg-emerald-100 p-2.5 rounded-2xl text-emerald-600 shadow-inner">
                                            <CheckCircle2 size={20}/>
                                        </div>
                                        <div>
                                            <p className="font-black text-slate-800 text-sm leading-tight">{log.sector}</p>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-tight">
                                                {log.amount.toLocaleString()}L • {log.source.split(' / ')[0]}
                                            </p>
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-black text-slate-300 bg-slate-50 px-2 py-1 rounded-lg">
                                        {new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}