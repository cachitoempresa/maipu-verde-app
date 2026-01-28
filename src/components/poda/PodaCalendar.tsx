import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Loader2, Plus, X, Search, Check, Calendar as CalendarIcon } from 'lucide-react';
import { GreenArea } from '../../types';
// Syntax check passed
import { LABOR_TYPES } from './podaData';

interface PodaCalendarProps {
    areas?: GreenArea[];
    onNavigate?: (module: string) => void;
}

interface MixedTask {
    id: string | number;
    rawId?: number; // DB ID
    area_id?: number; // Optional now as we might have just address
    date: string;
    endDate?: string; // Optional end date
    type: 'PLAN' | 'LOG';
    status: 'PENDIENTE' | 'REALIZADA' | 'EMERGENCIA' | 'completada';
    title: string; // Used for Labor Type now primarily
    description?: string; // Address or Especie
    especie?: string;
    observacion?: string;
    direccion?: string;
}

export function PodaCalendar({ areas = [], onNavigate }: PodaCalendarProps) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [tasks, setTasks] = useState<MixedTask[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedArea, setSelectedArea] = useState<GreenArea | null>(null);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedTaskType, setSelectedTaskType] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Detail Modal State
    const [selectedEvent, setSelectedEvent] = useState<MixedTask | null>(null);
    const [isCompleting, setIsCompleting] = useState(false);

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    useEffect(() => {
        fetchData();
    }, [currentDate]);

    const fetchData = async () => {
        setLoading(true);
        const start = monthStart.toISOString();
        const end = monthEnd.toISOString();
        const allTasks: MixedTask[] = [];

        // 1. Fetch Plans
        const { data: plans } = await supabase.from('planificacion_poda')
            .select('*')
            // Overlapping logic: Start <= MonthEnd AND End >= MonthStart
            // Simplified: Fetch logic might need to be broader or we just filter in memory.
            // Let's fetch anything starting in the month OR ending in the month.
            // Or just fetch generous range.
            // Let's stick to start date in range for now + duration logic handling.
            .or(`fecha_programada.gte.${start},fecha_fin.gte.${start}`)
            .gte('fecha_programada', start)
            .lte('fecha_programada', end);

        if (plans) {
            plans.forEach((p: any) => {
                allTasks.push({
                    id: `PLAN-${p.id}`,
                    rawId: p.id, // Added rawId
                    area_id: p.area_id,
                    date: p.fecha_programada,
                    endDate: p.fecha_fin || p.fecha_programada,
                    type: 'PLAN',
                    status: p.estado,
                    title: p.tipo_labor, // Start with Labor
                    description: p.direccion,
                    especie: p.especie,
                    observacion: p.observacion,
                    direccion: p.direccion
                });
            });
        }

        // 2. Fetch Logs (Realized / Emergency)
        const { data: logs } = await supabase.from('poda_registros')
            .select('*')
            .gte('fecha_poda', start)
            .lte('fecha_poda', end);

        if (logs) {
            logs.forEach((l: any) => {
                allTasks.push({
                    id: `LOG-${l.id}`,
                    rawId: l.id, // Added rawId
                    area_id: l.area_id,
                    date: new Date(l.fecha_poda).toISOString().split('T')[0],
                    type: 'LOG',
                    status: l.es_emergencia ? 'EMERGENCIA' : 'REALIZADA',
                    title: l.tipo_labor,
                    description: l.especie,
                    especie: l.especie,
                    observacion: l.comentarios || '',
                    direccion: '' // Usually linked to area
                });
            });
        }

        setTasks(allTasks);
        setLoading(false);
    };

    const changeMonth = (increment: number) => {
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() + increment);
        setCurrentDate(newDate);
    };

    const handleSaveTask = async () => {
        if (!selectedArea || !selectedDate || !selectedTaskType) return;
        setIsSaving(true);
        try {
            const { error } = await supabase.from('planificacion_poda').insert([{
                area_id: selectedArea.id,
                fecha_programada: selectedDate,
                tipo_labor: selectedTaskType,
                estado: 'PENDIENTE'
            }]);

            if (error) throw error;

            setShowModal(false);
            setSearchQuery('');
            setSelectedArea(null);
            fetchData();
        } catch (e) {
            console.error(e);
            alert("Error al guardar planificación");
        } finally {
            setIsSaving(false);
        }
    };

    const handleQuickComplete = async () => {
        if (!selectedEvent || selectedEvent.type !== 'PLAN') return;

        // Validation Debug
        console.log('ID a actualizar:', selectedEvent.rawId);

        if (!selectedEvent.rawId) {
            alert("Error: ID de tarea inválido");
            return;
        }

        setIsCompleting(true);
        try {
            const { error } = await supabase.from('planificacion_poda')
                .update({ estado: 'REALIZADA' }) // Keeping REALIZADA as per DB Convention
                .eq('id', selectedEvent.rawId);

            if (error) throw error;

            // Close and Refresh
            setSelectedEvent(null);
            fetchData();
        } catch (e) {
            console.error(e);
            alert("Error al actualizar tarea: " + JSON.stringify(e));
        } finally {
            setIsCompleting(false);
        }
    };

    // Filter Areas for Modal
    const filteredAreas = useMemo(() => {
        if (!searchQuery) return [];
        return areas.filter(a =>
            a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            a.code.toLowerCase().includes(searchQuery.toLowerCase())
        ).slice(0, 10);
    }, [areas, searchQuery]);



    const getLocationName = (task: MixedTask) => {
        if (task.area_id) {
            const area = areas.find(a => a.id === task.area_id);
            return area ? area.name : `Plaza #${task.area_id}`;
        }
        return task.direccion || 'Sin Ubicación';
    };

    const getTaskStyles = (task: MixedTask) => {
        if (task.status === 'EMERGENCIA') return 'bg-red-500 text-white border-red-600 font-bold';

        // OVERDUE CHECK
        const todayStr = new Date().toISOString().split('T')[0];
        const isOverdue = task.type === 'PLAN' && task.status === 'PENDIENTE' && task.date < todayStr;
        if (isOverdue) return 'bg-red-50 text-red-900 border-red-200 hover:bg-red-100 font-bold animate-pulse';

        // Labor Colors for Plans
        const labor = task.title.toLowerCase();
        if (labor.includes('tala')) return 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200';
        if (labor.includes('poda')) return 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200';
        if (labor.includes('despeje')) return 'bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200';

        // Logs or Default
        if (task.type === 'LOG' || task.status === 'REALIZADA' || task.status === 'completada') {
            return 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold';
        }

        return 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200';
    };

    const weeks = Math.ceil((daysInMonth.length + monthStart.getDay()) / 7);
    const MAX_EVENTS = 3;

    return (
        <div className="flex flex-col h-full w-full bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-white z-10">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-black text-slate-800 capitalize flex items-center gap-2">
                        <CalendarIcon className="text-emerald-600" size={24} />
                        {format(currentDate, 'MMMM yyyy', { locale: es })}
                    </h2>
                    <div className="flex gap-1">
                        <button onClick={() => changeMonth(-1)} className="p-1.5 hover:bg-slate-100 rounded-full text-slate-600 transition-colors"><ChevronLeft size={20} /></button>
                        <button onClick={() => changeMonth(1)} className="p-1.5 hover:bg-slate-100 rounded-full text-slate-600 transition-colors"><ChevronRight size={20} /></button>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowModal(true)}
                        className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-emerald-700 shadow-md active:scale-95 transition-all"
                    >
                        <Plus size={16} /> <span className="hidden sm:inline">Nueva Planificación</span>
                    </button>
                </div>
            </div>

            {/* Weekdays Header */}
            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 shrink-0">
                {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => (
                    <div key={d} className="py-2 text-center text-[10px] font-black text-slate-400 uppercase tracking-wider">{d}</div>
                ))}
            </div>

            {/* Calendar Grid (Dynamic Rows) */}
            <div className={`grid grid-cols-7 flex-1 divide-x divide-y divide-slate-100 bg-slate-50/30 overflow-hidden`}
                style={{ gridTemplateRows: `repeat(${weeks}, minmax(0, 1fr))` }}>

                {/* Padding Days (Previous Month) */}
                {Array.from({ length: monthStart.getDay() }).map((_, i) => (
                    <div key={`empty-${i}`} className="bg-slate-50/50" />
                ))}

                {daysInMonth.map(day => {
                    const dayStr = format(day, 'yyyy-MM-dd');

                    // Filter tasks
                    const dayTasks = tasks.filter(t => {
                        const start = new Date(t.date);
                        const end = new Date(t.endDate || t.date);
                        start.setHours(0, 0, 0, 0);
                        end.setHours(0, 0, 0, 0);
                        const current = new Date(day);
                        current.setHours(0, 0, 0, 0);
                        return current >= start && current <= end;
                    });

                    // Sorting: Put Multiday/Plans first? Or just by ID?
                    // Let's sort by date created or ID implicitly.

                    const visibleTasks = dayTasks.slice(0, MAX_EVENTS);
                    const hiddenCount = dayTasks.length - MAX_EVENTS;

                    return (
                        <div key={day.toISOString()}
                            className={`p-1.5 hover:bg-white transition-colors group relative flex flex-col gap-1 ${!isSameMonth(day, currentDate) ? 'opacity-50 bg-slate-100/50' : ''}`}
                            onClick={() => {
                                // Optional: specific day click action
                            }}
                        >
                            {/* Day Number */}
                            <div className="flex justify-between items-start">
                                <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${isToday(day) ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500'}`}>
                                    {format(day, 'd')}
                                </span>
                            </div>

                            {/* Tasks List */}
                            <div className="flex-1 flex flex-col gap-1 w-full relative">
                                {visibleTasks.map(task => {
                                    const isMultiDay = task.endDate && task.endDate !== task.date;
                                    const locationName = getLocationName(task);
                                    const tooltip = `Especie: ${task.especie || 'N/A'}\nObs: ${task.observacion || 'Ninguna'}`;

                                    const isDone = task.status === 'REALIZADA' || task.status === 'completada' || task.type === 'LOG';
                                    const displayTitle = `${isDone ? '✅ ' : ''}${task.title} - ${locationName}`;

                                    return (
                                        <div key={`${task.id}-${dayStr}`}
                                            onClick={(e) => { e.stopPropagation(); setSelectedEvent(task); }}
                                            className={`text-[9px] px-1.5 py-0.5 rounded-sm border leading-tight font-bold truncate cursor-pointer hover:scale-[1.02] transition-all shadow-sm ${getTaskStyles(task)} ${isMultiDay ? 'border-l-[3px]' : ''}`}
                                            title={tooltip}
                                        >
                                            {displayTitle}
                                        </div>
                                    );
                                })}

                                {hiddenCount > 0 && (
                                    <div className="text-[9px] font-bold text-slate-400 pl-1 hover:text-emerald-600 cursor-pointer">
                                        + {hiddenCount} más
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* TASK DETAIL MODAL */}
            {selectedEvent && (
                <div className="fixed inset-0 z-[8000] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
                        <div className={`p-4 text-white flex justify-between items-start ${selectedEvent.status === 'EMERGENCIA' ? 'bg-red-600' : (selectedEvent.status === 'REALIZADA' || selectedEvent.status === 'completada' ? 'bg-emerald-600' : 'bg-slate-800')}`}>
                            <div>
                                <h3 className="font-black text-lg uppercase">{selectedEvent.title}</h3>
                                <p className="text-xs opacity-90">{getLocationName(selectedEvent)}</p>
                            </div>
                            <button onClick={() => setSelectedEvent(null)} className="p-1 hover:bg-white/20 rounded-full">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                                <div className="text-xs text-slate-500 font-bold uppercase">Estado</div>
                                <div className={`text-xs font-black px-2 py-1 rounded-full uppercase ${selectedEvent.status === 'PENDIENTE' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                    {selectedEvent.status}
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase">Especie / Detalle</label>
                                <p className="text-sm font-medium text-slate-700">{selectedEvent.especie || selectedEvent.observacion || 'Sin detalles adicionales.'}</p>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase">Fecha Programada</label>
                                <p className="text-sm font-medium text-slate-700">{selectedEvent.date}</p>
                            </div>

                            {/* ACTIONS */}
                            {selectedEvent.type === 'PLAN' && selectedEvent.status === 'PENDIENTE' && (
                                <div className="grid grid-cols-2 gap-3 pt-2">
                                    <button
                                        onClick={() => {
                                            if (onNavigate) {
                                                onNavigate('MAPA');
                                                // Ideally select the area too, but we need to pass that up.
                                            }
                                        }}
                                        className="py-3 rounded-xl bg-blue-50 text-blue-600 text-xs font-black uppercase hover:bg-blue-100 active:scale-95"
                                    >
                                        Ir al Mapa
                                    </button>
                                    <button
                                        onClick={handleQuickComplete}
                                        disabled={isCompleting}
                                        className="py-3 rounded-xl bg-emerald-600 text-white text-xs font-black uppercase hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 active:scale-95 flex items-center justify-center gap-2"
                                    >
                                        {isCompleting ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} />}
                                        Marcar OK
                                    </button>
                                </div>
                            )}

                            {/* COMPLETED MSG */}
                            {(selectedEvent.status === 'REALIZADA' || selectedEvent.status === 'completada') && (
                                <div className="bg-emerald-50 text-emerald-800 p-3 rounded-xl text-xs font-bold text-center border border-emerald-100">
                                    ¡Tarea Completada! 🎉
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            {/* New Task Modal */}
            {showModal && (
                <div className="fixed inset-0 z-[7000] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 animate-in fade-in zoom-in-95">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-lg text-slate-800">Programar Nueva Poda</h3>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-full">
                                <X size={20} className="text-slate-400" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Area Search */}
                            <div className="space-y-1 relative">
                                <label className="text-xs font-bold text-slate-400 uppercase">Buscar Plaza</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-3 text-slate-400" size={16} />
                                    <input
                                        type="text"
                                        placeholder="Código o Nombre..."
                                        className="w-full pl-10 p-3 bg-slate-50 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
                                        value={selectedArea ? `${selectedArea.code} - ${selectedArea.name}` : searchQuery}
                                        onChange={(e) => {
                                            setSearchQuery(e.target.value);
                                            setSelectedArea(null);
                                        }}
                                    />
                                    {selectedArea && (
                                        <button onClick={() => { setSelectedArea(null); setSearchQuery(''); }} className="absolute right-3 top-3 text-slate-400 hover:text-red-500">
                                            <X size={16} />
                                        </button>
                                    )}
                                </div>

                                {/* Search Results Dropdown */}
                                {searchQuery && !selectedArea && (
                                    <div className="absolute top-full left-0 right-0 bg-white shadow-xl rounded-xl mt-1 max-h-40 overflow-y-auto border border-slate-100 z-50">
                                        {filteredAreas.map(area => (
                                            <button
                                                key={area.id}
                                                onClick={() => { setSelectedArea(area); setSearchQuery(''); }}
                                                className="w-full text-left p-3 hover:bg-emerald-50 text-sm font-medium border-b border-slate-50 last:border-0"
                                            >
                                                <span className="font-bold text-emerald-600 block text-xs">{area.code}</span>
                                                {area.name}
                                            </button>
                                        ))}
                                        {filteredAreas.length === 0 && (
                                            <div className="p-3 text-xs text-slate-400 text-center">No se encontraron plazas</div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Date */}
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-400 uppercase">Fecha Programada</label>
                                <input
                                    type="date"
                                    className="w-full p-3 bg-slate-50 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                />
                            </div>

                            {/* Labor Type */}
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-400 uppercase">Tipo de Labor</label>
                                <select
                                    className="w-full p-3 bg-slate-50 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
                                    value={selectedTaskType}
                                    onChange={(e) => setSelectedTaskType(e.target.value)}
                                >
                                    <option value="">Seleccionar...</option>
                                    {LABOR_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>

                            <button
                                onClick={handleSaveTask}
                                disabled={isSaving || !selectedArea || !selectedTaskType}
                                className="w-full py-4 mt-4 bg-emerald-600 text-white rounded-xl font-black uppercase text-sm shadow-lg shadow-emerald-600/20 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSaving ? <Loader2 className="animate-spin" /> : <Check size={18} />}
                                Guardar Planificación
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {loading && (
                <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10">
                    <Loader2 className="animate-spin text-emerald-600" size={32} />
                </div>
            )}
        </div>
    );
}

