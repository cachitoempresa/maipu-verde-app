import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { 
    Droplets, Camera, Calendar, 
    ExternalLink, Truck, Info, Clock, MapPin
} from 'lucide-react';

interface WaterLog {
    id: number;
    truck_id: string;
    source: string;
    sector: string;
    amount: number;
    timestamp: string;
}

interface Infraction {
    id: number;
    aavv_code: string;
    address_number: string;
    details: string;
    image_url: string;
    reporter_email: string;
    created_at: string;
}

export function ControlCenter() {
    const [view, setView] = useState<'RIEGO' | 'INFRACCIONES'>('RIEGO');
    const [waterLogs, setWaterLogs] = useState<WaterLog[]>([]);
    const [infractions, setInfractions] = useState<Infraction[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            if (view === 'RIEGO') {
                const { data, error } = await supabase
                    .from('water_logs')
                    .select('*')
                    .order('timestamp', { ascending: false });
                if (error) throw error;
                if (data) setWaterLogs(data as WaterLog[]);
            } else {
                const { data, error } = await supabase
                    .from('vehicle_infractions')
                    .select('*')
                    .order('created_at', { ascending: false });
                if (error) throw error;
                if (data) setInfractions(data as Infraction[]);
            }
        } catch (err) {
            console.error("Error:", err);
        } finally {
            setLoading(false);
        }
    }, [view]);

    useEffect(() => { fetchData(); }, [fetchData]);

    return (
        <div className="bg-[#0f172a] rounded-[3rem] overflow-hidden border border-slate-800 shadow-2xl animate-in fade-in duration-700">
            {/* Cabecera Técnica Oscura */}
            <div className="p-8 border-b border-slate-800 flex flex-col md:flex-row justify-between items-center gap-6 bg-slate-900/50">
                <div className="flex bg-slate-950 p-1.5 rounded-[2rem] border border-slate-800 shadow-inner">
                    <button 
                        onClick={() => setView('RIEGO')}
                        className={`px-8 py-3 rounded-[1.5rem] text-[11px] font-black tracking-[0.2em] transition-all flex items-center gap-2 ${
                            view === 'RIEGO' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40' : 'text-slate-500 hover:text-slate-300'
                        }`}
                    >
                        <Droplets size={16}/> MONITOREO RIEGO
                    </button>
                    <button 
                        onClick={() => setView('INFRACCIONES')}
                        className={`px-8 py-3 rounded-[1.5rem] text-[11px] font-black tracking-[0.2em] transition-all flex items-center gap-2 ${
                            view === 'INFRACCIONES' ? 'bg-red-600 text-white shadow-lg shadow-red-900/40' : 'text-slate-500 hover:text-slate-300'
                        }`}
                    >
                        <Camera size={16}/> GALERÍA AUTOS
                    </button>
                </div>
                
                <div className="flex items-center gap-3 text-slate-400">
                    <div className="text-right leading-none">
                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Sistema en Vivo</p>
                        <p className="text-[9px] font-bold text-slate-600 uppercase mt-1">Sincronizado</p>
                    </div>
                    <div className="w-10 h-10 bg-slate-800 rounded-2xl flex items-center justify-center border border-slate-700">
                        <Clock size={18} className="text-slate-400"/>
                    </div>
                </div>
            </div>

            <div className="p-8 bg-slate-900/20">
                {loading ? (
                    <div className="py-32 text-center">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-emerald-500 mb-4"></div>
                        <p className="text-slate-500 font-black text-xs uppercase tracking-[0.4em]">Accediendo a Base de Datos...</p>
                    </div>
                ) : view === 'RIEGO' ? (
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-separate border-spacing-y-4">
                            <thead>
                                <tr className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-10">
                                    <th className="pl-10 pb-2">Unidad Operativa</th>
                                    <th className="pb-2">Zona Geográfica</th>
                                    <th className="pb-2">Carga Despachada</th>
                                    <th className="pb-2 pr-10 text-right">Marca Temporal</th>
                                </tr>
                            </thead>
                            <tbody>
                                {waterLogs.map((log) => (
                                    <tr key={log.id} className="group transition-all">
                                        <td className="py-6 pl-10 bg-slate-900/40 rounded-l-[2.5rem] border-y border-l border-slate-800 group-hover:bg-slate-800/60 transition-all">
                                            <div className="flex items-center gap-4">
                                                <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-2xl border border-emerald-500/20"><Truck size={18}/></div>
                                                <span className="font-black text-slate-200 text-xs uppercase tracking-tight">{log.truck_id.split('@')[0]}</span>
                                            </div>
                                        </td>
                                        <td className="py-6 bg-slate-900/40 border-y border-slate-800 group-hover:bg-slate-800/60">
                                            <div className="flex items-center gap-2">
                                                <MapPin size={14} className="text-slate-500"/>
                                                <span className="font-black text-slate-300 text-sm">{log.sector}</span>
                                            </div>
                                        </td>
                                        <td className="py-6 bg-slate-900/40 border-y border-slate-800 group-hover:bg-slate-800/60">
                                            <span className="text-sm font-black text-emerald-400 italic">
                                                {log.amount.toLocaleString()} Lts
                                            </span>
                                        </td>
                                        <td className="py-6 pr-10 bg-slate-900/40 rounded-r-[2.5rem] border-y border-r border-slate-800 group-hover:bg-slate-800/60 text-right">
                                            <span className="text-[10px] font-black text-slate-500 bg-slate-950 px-4 py-2 rounded-xl border border-slate-800">
                                                {new Date(log.timestamp).toLocaleTimeString()}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    /* Galería Dark para Infracciones */
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-10">
                        {infractions.map((inf) => (
                            <div key={inf.id} className="bg-slate-900/40 rounded-[3rem] overflow-hidden border border-slate-800 hover:border-red-500/50 hover:shadow-2xl hover:shadow-red-900/20 transition-all group">
                                <div className="aspect-[16/10] relative overflow-hidden bg-slate-950">
                                    <img 
                                        src={inf.image_url} 
                                        alt="Evidencia" 
                                        className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110 opacity-60 group-hover:opacity-100"
                                    />
                                    <div className="absolute top-5 right-5">
                                        <a href={inf.image_url} target="_blank" rel="noreferrer" className="p-3 bg-white/10 backdrop-blur-md rounded-full shadow-xl text-white hover:text-red-500 transition-all block border border-white/20">
                                            <ExternalLink size={20}/>
                                        </a>
                                    </div>
                                </div>
                                <div className="p-8 space-y-5">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-[9px] font-black text-red-500 uppercase tracking-widest mb-1 italic">Detección</p>
                                            <p className="font-black text-slate-200 text-lg tracking-tight">{inf.aavv_code}</p>
                                        </div>
                                    </div>
                                    <div className="p-4 bg-slate-950/50 rounded-2xl border border-slate-800 italic text-xs text-slate-400 leading-relaxed shadow-inner">
                                        "{inf.details || 'Sin observaciones adicionales.'}"
                                    </div>
                                    <div className="flex justify-between items-center pt-4 border-t border-slate-800 text-[9px] font-black text-slate-600 uppercase tracking-widest">
                                        <span className="flex items-center gap-1"><Info size={12}/> ID: {inf.reporter_email.split('@')[0]}</span>
                                        <span className="flex items-center gap-1"><Calendar size={12}/> {new Date(inf.created_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}