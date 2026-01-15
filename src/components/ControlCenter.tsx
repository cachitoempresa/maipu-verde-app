import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { 
    Droplets, Camera, Calendar, 
    ExternalLink, Truck 
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

    // Definimos fetchData con useCallback ANTES del useEffect para evitar errores de referencia
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
            console.error("Error cargando datos del centro de control:", err);
        } finally {
            setLoading(false);
        }
    }, [view]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return (
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden animate-in fade-in duration-500">
            {/* Cabecera */}
            <div className="p-6 border-b border-slate-50 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50">
                <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-slate-200">
                    <button 
                        onClick={() => setView('RIEGO')}
                        className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${view === 'RIEGO' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        <Droplets size={16}/> REGISTROS RIEGO
                    </button>
                    <button 
                        onClick={() => setView('INFRACCIONES')}
                        className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${view === 'INFRACCIONES' ? 'bg-red-600 text-white shadow-lg shadow-red-100' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        <Camera size={16}/> GALERÍA INFRACCIONES
                    </button>
                </div>
                
                <div className="flex items-center gap-2 text-slate-400">
                    <Calendar size={16}/>
                    <span className="text-[10px] font-black uppercase tracking-widest">Centro de Control Operativo</span>
                </div>
            </div>

            <div className="p-6">
                {loading ? (
                    <div className="py-20 text-center text-slate-400 animate-pulse font-bold tracking-widest uppercase text-xs">Sincronizando con Servidor...</div>
                ) : view === 'RIEGO' ? (
                    /* LISTADO DE RIEGO ALJIBE */
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-separate border-spacing-y-2">
                            <thead>
                                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-4">
                                    <th className="pb-4 pl-4">Camión</th>
                                    <th className="pb-4">Sector Regado</th>
                                    <th className="pb-4">Grifo de Carga</th>
                                    <th className="pb-4 text-center">Descarga</th>
                                    <th className="pb-4 pr-4 text-right">Hora Registro</th>
                                </tr>
                            </thead>
                            <tbody>
                                {waterLogs.map((log) => (
                                    <tr key={log.id} className="bg-slate-50/50 hover:bg-emerald-50/50 transition-colors group">
                                        <td className="py-4 pl-4 rounded-l-2xl border-y border-l border-transparent group-hover:border-emerald-100">
                                            <div className="flex items-center gap-2">
                                                <Truck size={14} className="text-emerald-600"/>
                                                <span className="font-bold text-slate-700 text-sm italic">{log.truck_id.split('@')[0]}</span>
                                            </div>
                                        </td>
                                        <td className="py-4 font-black text-slate-900 text-sm tracking-tight">{log.sector}</td>
                                        <td className="py-4 text-[11px] text-slate-500 font-bold">{log.source}</td>
                                        <td className="py-4 text-center">
                                            <span className="bg-white border border-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-black shadow-sm">
                                                {log.amount.toLocaleString()} L
                                            </span>
                                        </td>
                                        <td className="py-4 pr-4 rounded-r-2xl border-y border-r border-transparent group-hover:border-emerald-100 text-[10px] font-bold text-slate-400 text-right">
                                            {new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    /* GALERÍA DE REPORTES VEHICULARES */
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {infractions.length === 0 ? (
                            <div className="col-span-full py-20 text-center text-slate-300 italic font-medium">No se han registrado infracciones vehiculares.</div>
                        ) : (
                            infractions.map((inf) => (
                                <div key={inf.id} className="bg-white rounded-[2rem] overflow-hidden border border-slate-100 hover:shadow-2xl hover:shadow-red-100/50 transition-all group">
                                    <div className="aspect-[4/3] relative overflow-hidden bg-slate-900">
                                        <img 
                                            src={inf.image_url} 
                                            alt="Infracción" 
                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-90 group-hover:opacity-100"
                                        />
                                        <div className="absolute top-4 right-4">
                                            <a href={inf.image_url} target="_blank" rel="noreferrer" className="p-2.5 bg-white/90 backdrop-blur-md rounded-full shadow-xl text-slate-600 hover:text-red-600 transition-all hover:scale-110 block">
                                                <ExternalLink size={18}/>
                                            </a>
                                        </div>
                                    </div>
                                    <div className="p-6 space-y-4">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="text-[9px] font-black text-red-500 uppercase tracking-widest mb-1 leading-none">CÓDIGO AAVV</p>
                                                <p className="font-black text-slate-800 text-base">{inf.aavv_code}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">Altura</p>
                                                <p className="font-bold text-slate-700 text-sm tracking-tight">{inf.address_number}</p>
                                            </div>
                                        </div>
                                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 shadow-inner">
                                            <p className="text-xs text-slate-500 italic leading-relaxed">"{inf.details || 'Sin observaciones'}"</p>
                                        </div>
                                        <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                                            <span>Por: {inf.reporter_email.split('@')[0]}</span>
                                            <span className="bg-slate-100 px-2 py-1 rounded-md">{new Date(inf.created_at).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}