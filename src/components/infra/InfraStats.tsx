import { TrendingUp, AlertTriangle, CheckCircle2, Map } from 'lucide-react';

interface StatsProps {
    totalAreas: number;
    catastroCount: number;
    alertCount: number;
}

export function InfraStats({ totalAreas, catastroCount, alertCount }: StatsProps) {
    const completionRate = totalAreas > 0 ? Math.round((catastroCount / totalAreas) * 100) : 0;

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Catastro Card */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Avance Catastro</p>
                        <h3 className="text-3xl font-bold text-slate-900 mt-1">{catastroCount} <span className="text-lg text-slate-400 font-normal">/ {totalAreas}</span></h3>
                    </div>
                    <div className={`p-3 rounded-lg ${completionRate === 100 ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                        <CheckCircle2 size={24} />
                    </div>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all duration-1000 ${completionRate === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                        style={{ width: `${completionRate}%` }}
                    />
                </div>
                <p className="text-xs font-semibold text-slate-400 mt-2 text-right">{completionRate}% Completado</p>
            </div>

            {/* Alerts Card */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Alertas Activas</p>
                        <h3 className="text-3xl font-bold text-slate-900 mt-1">{alertCount}</h3>
                    </div>
                    <div className={`p-3 rounded-lg ${alertCount > 0 ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-400'}`}>
                        <AlertTriangle size={24} />
                    </div>
                </div>
                <div className="mt-4 flex items-center gap-2 text-xs font-medium text-slate-500">
                    <TrendingUp size={14} className={alertCount > 0 ? "text-red-500" : "text-emerald-500"} />
                    {alertCount > 0 ? 'Requiere atención inmediata' : 'Sin incidentes reportados'}
                </div>
            </div>

            {/* Map Coverage Card */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Cobertura Mapa</p>
                        <h3 className="text-3xl font-bold text-slate-900 mt-1">100%</h3>
                    </div>
                    <div className="p-3 rounded-lg bg-amber-100 text-amber-600">
                        <Map size={24} />
                    </div>
                </div>
                <p className="text-xs text-slate-400 mt-4 leading-relaxed">
                    Visualización operativa de todas las áreas verdes asignadas al sector Sol Poniente.
                </p>
            </div>
        </div>
    );
}
