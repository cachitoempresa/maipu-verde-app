import { useState, useEffect } from 'react';
import { Scissors, TreeDeciduous, Calendar, AlertTriangle, ArrowRight, Eye, X, Check, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { GreenArea } from '../../types';

interface PodaOverviewProps {
    onNavigate: (module: string) => void;
    stats?: { realizadas: number; pendientes: number; emergencias: number; cumplimiento: number };
    plannedAreas?: GreenArea[];
    completedAreaIds?: number[];
}

export function PodaOverview({
    onNavigate,
    stats = { realizadas: 0, pendientes: 0, emergencias: 0, cumplimiento: 100 },
    plannedAreas = [],
    completedAreaIds = []
}: PodaOverviewProps) {
    const [recentLogs, setRecentLogs] = useState<any[]>([]);
    const [lightboxData, setLightboxData] = useState<{ before: string | null; after: string | null } | null>(null);

    // DAILY PROGRESS
    const dailyTotal = plannedAreas.length;
    const dailyCompleted = plannedAreas.filter(a => completedAreaIds.includes(a.id)).length;
    const progressPercent = dailyTotal > 0 ? (dailyCompleted / dailyTotal) * 100 : 0;

    // Filter Lists
    const pendingToday = plannedAreas.filter(a => !completedAreaIds.includes(a.id));
    const realizedToday = plannedAreas.filter(a => completedAreaIds.includes(a.id));

    useEffect(() => {
        const fetchRecents = async () => {
            const { data } = await supabase.from('poda_registros')
                .select('*')
                .order('fecha_poda', { ascending: false })
                .limit(5);
            if (data) setRecentLogs(data);
        };
        fetchRecents();
    }, [completedAreaIds]); // Re-fetch when completions change

    return (
        <div className="p-6 space-y-6 max-w-lg mx-auto w-full pb-20">

            {/* Welcome Banner */}
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl pointer-events-none"></div>
                <h2 className="text-2xl font-black italic uppercase mb-1">Hola, Equipo</h2>
                <p className="text-emerald-100 text-sm font-medium mb-6">¿Qué actividad realizaremos hoy?</p>

                {/* KPI Grid */}
                <div className="grid grid-cols-2 gap-3 mb-2">
                    <div className="bg-white/20 rounded-xl p-3 backdrop-blur-sm">
                        <span className="block text-3xl font-black">{stats.cumplimiento}%</span>
                        <span className="text-[10px] uppercase font-bold opacity-80">Cumplimiento Mes</span>
                    </div>
                    <div className="bg-red-500/30 rounded-xl p-3 backdrop-blur-sm border border-red-500/30">
                        <span className="block text-3xl font-black text-white">{stats.emergencias}</span>
                        <span className="text-[10px] uppercase font-bold text-red-100">Emergencias</span>
                    </div>
                </div>

                {/* Daily Progress Widget */}
                <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm border border-white/10">
                    <div className="flex justify-between items-end mb-2">
                        <span className="text-xs font-bold uppercase text-emerald-100">Avance Diario</span>
                        <span className="text-xl font-black">{dailyCompleted}/{dailyTotal}</span>
                    </div>
                    <div className="h-2 bg-emerald-900/30 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-emerald-300 transition-all duration-1000 ease-out"
                            style={{ width: `${progressPercent}%` }}
                        ></div>
                    </div>
                </div>
            </div>

            {/* TODAY'S PLAN List (PENDING ONLY) */}
            <h3 className="text-slate-400 font-bold text-xs uppercase tracking-wider pl-2">Pendientes para Hoy</h3>
            <div className="space-y-3">
                {pendingToday.length === 0 ? (
                    <div className="bg-white p-6 rounded-2xl text-center shadow-sm text-slate-400 text-sm italic border-dashed border-2 border-slate-200">
                        ¡Todo listo por hoy!
                    </div>
                ) : (
                    pendingToday.map((area) => (
                        <div key={area.id} className="p-4 rounded-2xl shadow-sm border-l-4 flex items-center justify-between transition-all bg-white border-amber-400">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-full bg-amber-100 text-amber-600">
                                    <Clock size={18} strokeWidth={3} />
                                </div>
                                <div>
                                    <h4 className="font-black text-sm uppercase text-slate-700">
                                        {area.code} - {area.name}
                                    </h4>
                                    <p className="text-[10px] font-bold uppercase text-slate-400">
                                        PENDIENTE
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => onNavigate('MAPA')} className="text-xs font-bold text-slate-400 hover:text-emerald-600">
                                IR AL MAPA
                            </button>
                        </div>
                    ))
                )}
            </div>

            {/* REALIZED TODAY List */}
            {realizedToday.length > 0 && (
                <>
                    <h3 className="text-slate-400 font-bold text-xs uppercase tracking-wider pl-2 pt-2">Realizadas Hoy</h3>
                    <div className="space-y-3 opacity-80">
                        {realizedToday.map((area) => (
                            <div key={area.id} className="p-4 rounded-2xl shadow-sm border-l-4 flex items-center justify-between transition-all bg-emerald-50 border-emerald-500">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-full bg-emerald-100 text-emerald-600">
                                        <Check size={18} strokeWidth={3} />
                                    </div>
                                    <div>
                                        <h4 className="font-black text-sm uppercase text-emerald-900">
                                            {area.code} - {area.name}
                                        </h4>
                                        <p className="text-[10px] font-bold uppercase text-emerald-700">
                                            COMPLETADA
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}


            {/* Main Actions Grid */}
            <h3 className="text-slate-400 font-bold text-xs uppercase tracking-wider pl-2 pt-2">Módulos Operativos</h3>
            <div className="grid grid-cols-1 gap-4">

                <button
                    onClick={() => onNavigate('MAPA')}
                    className="bg-white p-5 rounded-2xl shadow-md border-l-[6px] border-emerald-500 flex items-center justify-between group active:scale-[0.98] transition-all"
                >
                    <div className="flex items-center gap-4">
                        <div className="bg-emerald-100 p-3 rounded-full text-emerald-600">
                            <Scissors size={24} />
                        </div>
                        <div className="text-left">
                            <h4 className="font-black text-slate-800 uppercase text-sm">Ruta de Poda</h4>
                            <p className="text-xs text-slate-500">Mapa de intervenciones</p>
                        </div>
                    </div>
                    <ArrowRight size={20} className="text-slate-300 group-hover:text-emerald-500 transition-colors" />
                </button>

                <button
                    onClick={() => onNavigate('CATASTRO')}
                    className="bg-white p-5 rounded-2xl shadow-md border-l-[6px] border-blue-500 flex items-center justify-between group active:scale-[0.98] transition-all"
                >
                    <div className="flex items-center gap-4">
                        <div className="bg-blue-100 p-3 rounded-full text-blue-600">
                            <TreeDeciduous size={24} />
                        </div>
                        <div className="text-left">
                            <h4 className="font-black text-slate-800 uppercase text-sm">Inventario Arbolado</h4>
                            <p className="text-xs text-slate-500">Gestión de especies</p>
                        </div>
                    </div>
                    <ArrowRight size={20} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                </button>

                <button
                    onClick={() => onNavigate('CALENDARIO')}
                    className="bg-white p-5 rounded-2xl shadow-md border-l-[6px] border-amber-500 flex items-center justify-between group active:scale-[0.98] transition-all"
                >
                    <div className="flex items-center gap-4">
                        <div className="bg-amber-100 p-3 rounded-full text-amber-600">
                            <Calendar size={24} />
                        </div>
                        <div className="text-left">
                            <h4 className="font-black text-slate-800 uppercase text-sm">Planificación</h4>
                            <p className="text-xs text-slate-500">Agenda semanal</p>
                        </div>
                    </div>
                    <ArrowRight size={20} className="text-slate-300 group-hover:text-amber-500 transition-colors" />
                </button>

                <button
                    onClick={() => onNavigate('EMERGENCIA')}
                    className="bg-red-50 p-5 rounded-2xl shadow-md border border-red-100 flex items-center justify-between group active:scale-[0.98] transition-all"
                >
                    <div className="flex items-center gap-4">
                        <div className="bg-red-100 p-3 rounded-full text-red-600">
                            <AlertTriangle size={24} />
                        </div>
                        <div className="text-left">
                            <h4 className="font-black text-red-700 uppercase text-sm">Alertas de Riesgo</h4>
                            <p className="text-xs text-red-500 font-medium">Caída de ramas / Árboles</p>
                        </div>
                    </div>
                    <ArrowRight size={20} className="text-red-300 group-hover:text-red-500 transition-colors" />
                </button>

            </div>

            {/* Recent Activity */}
            <h3 className="text-slate-400 font-bold text-xs uppercase tracking-wider pl-2 pt-2">Actividad Reciente</h3>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                {recentLogs.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400">Sin actividad reciente</div>
                ) : (
                    recentLogs.map((log) => (
                        <div key={log.id} className="p-4 border-b border-slate-50 flex items-center justify-between hover:bg-slate-50">
                            <div>
                                <h5 className="font-bold text-sm text-slate-700">{log.tipo_labor} - {log.especie}</h5>
                                <p className="text-xs text-slate-400">
                                    {new Date(log.fecha_poda).toLocaleDateString('es-CL')} • {log.barrio}
                                </p>
                            </div>
                            {(log.foto_antes_url || log.foto_despues_url) && (
                                <button
                                    onClick={() => setLightboxData({ before: log.foto_antes_url, after: log.foto_despues_url })}
                                    className="p-2 bg-emerald-100 text-emerald-600 rounded-full hover:bg-emerald-200"
                                >
                                    <Eye size={16} />
                                </button>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Lightbox */}
            {lightboxData && (
                <div className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
                    <button
                        onClick={() => setLightboxData(null)}
                        className="absolute top-4 right-4 text-white/50 hover:text-white p-2"
                    >
                        <X size={32} />
                    </button>

                    <div className="flex flex-col gap-4 max-w-4xl w-full">
                        <div className="grid grid-cols-2 gap-4">
                            {lightboxData.before && (
                                <div className="space-y-2">
                                    <span className="text-white/70 text-sm font-bold uppercase block text-center">Antes</span>
                                    <img src={lightboxData.before} alt="Antes" className="w-full rounded-xl shadow-2xl border border-white/10" />
                                </div>
                            )}
                            {lightboxData.after && (
                                <div className="space-y-2">
                                    <span className="text-white/70 text-sm font-bold uppercase block text-center">Después</span>
                                    <img src={lightboxData.after} alt="Después" className="w-full rounded-xl shadow-2xl border border-white/10" />
                                </div>
                            )}
                        </div>
                        {!lightboxData.before && !lightboxData.after && (
                            <div className="text-center text-white/50">Error: No se encontraron URLs de imagen.</div>
                        )}
                    </div>
                </div>
            )}

        </div>
    );
}
