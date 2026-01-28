import { Map, Hammer, LayoutGrid, ClipboardList, ChevronRight, Clock } from 'lucide-react';
import { InfraStats } from './InfraStats';

interface InfraOverviewProps {
    stats: {
        totalAreas: number;
        catastroCount: number;
        alertCount: number;
    };
    recentLogs: any[];
    onNavigate: (module: string) => void;
}

export function InfraOverview({ stats, recentLogs, onNavigate }: InfraOverviewProps) {
    return (
        <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-8 animate-in fade-in duration-500">

            {/* Welcome Section */}
            <div>
                <h2 className="text-2xl font-bold text-slate-900">Panel de Control</h2>
                <p className="text-slate-500">Resumen operativo y gestión de áreas verdes.</p>
            </div>

            {/* KPI Cards */}
            <InfraStats {...stats} />

            {/* Quick Actions Grid */}
            <h3 className="text-lg font-bold text-slate-900 px-1">Módulos Operativos</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <ActionCard
                    title="Mapa Operativo"
                    description="Visualizar estado en tiempo real"
                    icon={<Map size={24} />}
                    onClick={() => onNavigate('MAPA')}
                    color="bg-amber-500 text-white"
                />
                <ActionCard
                    title="Gestión Catastro"
                    description="Inventario de infraestructura"
                    icon={<LayoutGrid size={24} />}
                    onClick={() => onNavigate('CATASTRO')}
                    color="bg-slate-800 text-white"
                />
                <ActionCard
                    title="Reportar Actividad"
                    description="Registrar mantenimientos"
                    icon={<Hammer size={24} />}
                    onClick={() => onNavigate('ACTIVIDAD')}
                    color="bg-white border-slate-200 text-slate-700 hover:border-amber-500 hover:text-amber-600"
                />
                <ActionCard
                    title="Solicitudes"
                    description="Monitor ITS y Requerimientos"
                    icon={<ClipboardList size={24} />}
                    onClick={() => onNavigate('SOLICITUDES')}
                    color="bg-white border-slate-200 text-slate-700 hover:border-amber-500 hover:text-amber-600"
                />
            </div>

            {/* Recent Activity Section */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h3 className="font-bold text-slate-900 flex items-center gap-2">
                        <Clock size={18} className="text-slate-400" /> Actividad Reciente
                    </h3>
                    <button onClick={() => onNavigate('SOLICITUDES')} className="text-xs font-semibold text-amber-600 hover:text-amber-700 uppercase tracking-wide">
                        Ver Todo
                    </button>
                </div>
                <div className="divide-y divide-slate-100">
                    {recentLogs.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 italic">No hay actividad reciente registrada.</div>
                    ) : (
                        recentLogs.slice(0, 5).map((log) => (
                            <div key={log.id} className="px-6 py-4 hover:bg-slate-50 transition-colors flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className={`w-2 h-10 rounded-full ${['EMERGENCIA', 'REPARACION'].includes(log.activity_type) ? 'bg-red-500' : 'bg-emerald-500'
                                        }`}></div>
                                    <div>
                                        <h4 className="font-bold text-slate-800 text-sm">{log.green_areas?.name || 'Área Desconocida'}</h4>
                                        <p className="text-xs text-slate-500 line-clamp-1">{log.description}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="block text-xs font-bold text-slate-900 uppercase">{log.activity_type}</span>
                                    <span className="text-[10px] text-slate-400 font-medium">{new Date(log.created_at).toLocaleDateString()}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

function ActionCard({ title, description, icon, onClick, color }: any) {
    return (
        <button
            onClick={onClick}
            className={`${color} p-6 rounded-xl shadow-sm hover:shadow-md transition-all text-left group relative overflow-hidden flex flex-col justify-between h-32 border`}
        >
            <div className="flex justify-between items-start z-10">
                <div className="p-2 rounded-lg bg-white/20 w-fit backdrop-blur-sm">{icon}</div>
                <ChevronRight className="opacity-0 group-hover:opacity-100 transition-opacity -mr-2" />
            </div>
            <div className="z-10 mt-2">
                <h3 className="font-bold text-sm">{title}</h3>
                <p className="text-[10px] opacity-80 font-medium mt-0.5">{description}</p>
            </div>
        </button>
    );
}
