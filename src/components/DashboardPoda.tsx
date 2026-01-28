import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, ArrowLeft, Download, FileSpreadsheet, X } from 'lucide-react';
import * as XLSX from 'xlsx';

import { MapModule } from './MapModule';

// Poda Components
import { PodaHeader } from './poda/PodaHeader';
import { PodaOverview } from './poda/PodaOverview';
import { TreeInventoryList } from './poda/TreeInventoryList';
import { PodaCalendar } from './poda/PodaCalendar';

import { GreenArea } from '../types';

import { PlanificacionImporter } from './poda/PlanificacionImporter';

interface DailyStats {
    realizadas: number;
    pendientes: number;
    emergencias: number;
    cumplimiento: number; // NEW
}

export function DashboardPoda({ user, onLogout }: { user: { email: string }; onLogout: () => void }) {
    const [activeModule, setActiveModule] = useState<string | null>(null);
    const [areas, setAreas] = useState<GreenArea[]>([]);
    const [completedAreaIds, setCompletedAreaIds] = useState<number[]>([]);
    const [plannedAreas, setPlannedAreas] = useState<GreenArea[]>([]); // Areas with planned tasks today
    const [todayPlanRecords, setTodayPlanRecords] = useState<{ id: number; area_id: number }[]>([]);
    const [stats, setStats] = useState<DailyStats>({ realizadas: 0, pendientes: 0, emergencias: 0, cumplimiento: 100 });
    const [loading, setLoading] = useState(true);

    // Selected Area for Inventory Context
    const [selectedInventoryArea, setSelectedInventoryArea] = useState<GreenArea | null>(null);

    // Export & Import State
    const [showExportModal, setShowExportModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [exportMonth, setExportMonth] = useState<number>(new Date().getMonth() + 1); // 1-12
    const [exportYear, setExportYear] = useState<number>(new Date().getFullYear());
    const [isExporting, setIsExporting] = useState(false);

    const fetchAreas = useCallback(async () => {
        try {
            setLoading(true);

            // 1. Fetch Areas
            const { data: allAreas, error } = await supabase.from('green_areas')
                .select('*');

            if (error) {
                console.error("Supabase Error:", error);
                alert(`Error cargando áreas: ${error.message}`);
                throw error;
            }

            // 2. Fetch Today's Logs & Plans (Smart Stats)
            const today = new Date().toISOString().split('T')[0];

            // A. Logs (Realized & Emergency)
            const { data: todayLogsData, error: logError } = await supabase.from('poda_registros')
                .select('area_id, es_emergencia')
                .gte('fecha_poda', `${today}T00:00:00`)
                .lte('fecha_poda', `${today}T23:59:59`);

            if (logError) console.error("Error checking daily logs:", logError);
            const todayLogs = todayLogsData || [];

            const doneIds = todayLogs.map((l: any) => l.area_id);
            setCompletedAreaIds(doneIds);

            // B. Plans (Pending)
            const { data: todayPlansData, error: planError } = await supabase.from('planificacion_poda')
                .select('id, area_id, estado')
                .eq('fecha_programada', today);

            if (planError) console.error("Error checking daily plans:", planError);
            const todayPlans = todayPlansData || [];

            setTodayPlanRecords(todayPlans.map((p: any) => ({ id: p.id, area_id: p.area_id })));

            // C. Calculate Smart Stats
            const realizadasCount = todayLogs.length; // assuming logs = completions
            const emergenciasCount = todayLogs.filter((l: any) => l.es_emergencia).length;
            const pendientesCount = todayPlans.filter((p: any) =>
                p.estado !== 'REALIZADA' && !doneIds.includes(p.area_id)
            ).length;


            // Better: Total Plans Today = todayPlans.length.
            // But some logs might be unplanned.
            // Strict Compliance: (Plans marked Realized / Total Plans) * 100.
            const successfulPlans = todayPlans.filter((p: any) => p.estado === 'REALIZADA' || doneIds.includes(p.area_id)).length;
            const totalPlans = todayPlans.length;

            const compliance = totalPlans > 0 ? Math.round((successfulPlans / totalPlans) * 100) : 100;

            setStats({
                realizadas: realizadasCount,
                pendientes: pendientesCount,
                emergencias: emergenciasCount,
                cumplimiento: compliance
            });

            // Map Plans to Areas for "Programación de Hoy" List
            // We want to show ALL planned areas for today
            const plannedAreaIds = todayPlans.map((p: any) => p.area_id);
            // We need to resolve these IDs to partial GreenArea objects or filter 'allAreas'
            // But 'allAreas' is huge. We can filter 'validAreas' after we validate them below.
            // Let's store the IDs for now and filter after validation.



            // Filter & Validation
            const validAreas = (allAreas || []).map((a: any) => {
                // 1. Attempt Parse if string
                let parsedPath = a.path;
                if (typeof a.path === 'string') {
                    try {
                        parsedPath = JSON.parse(a.path);
                    } catch (e) {
                        console.error(`Error parsing path for Area ${a.id}`, e);
                        return null;
                    }
                }

                // 2. Validate Array
                const isValid = Array.isArray(parsedPath) && parsedPath.length > 0;

                if (!isValid) {
                    return null;
                }

                return { ...a, path: parsedPath };
            }).filter(Boolean); // Remove nulls

            const calculatedValidAreas = validAreas as GreenArea[];
            setAreas(calculatedValidAreas);

            // Update Planned Areas List
            const todayPlannedAreas = calculatedValidAreas.filter(a => plannedAreaIds.includes(a.id));
            setPlannedAreas(todayPlannedAreas);

        } catch (err) {
            console.error("Error cargando áreas:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchAreas(); }, [fetchAreas]);

    const handleExport = async () => {
        setIsExporting(true);
        try {
            // 1. Fetch Records from NEW 'poda_registros' table
            const startDate = new Date(exportYear, exportMonth - 1, 1).toISOString();
            const endDate = new Date(exportYear, exportMonth + 1, 1).toISOString();

            const query = supabase.from('poda_registros')
                .select('*')
                .gte('fecha_poda', startDate)
                .lt('fecha_poda', endDate)
                .order('fecha_poda', { ascending: false });

            const { data: records, error } = await query;
            if (error) throw error;
            if (!records || records.length === 0) {
                alert("No hay registros de poda para este período.");
                setIsExporting(false);
                return;
            }

            // 2. Prepare Data for Excel
            const reportData = records.map(rec => {
                const area = areas.find(a => a.id === rec.area_id);
                const dateObj = new Date(rec.fecha_poda);
                const formattedDate = dateObj.toLocaleDateString('es-CL');

                return {
                    "Fecha": formattedDate,
                    "Código de la Plaza": area?.code || area?.id || 'S/C',
                    "Nombre de la Plaza": area ? area.name : 'Desconocido',
                    "Especie": rec.especie || 'No registrada',
                    "Cantidad": rec.cantidad || 1,
                    "Barrio": rec.barrio || area?.neighborhood || '-',
                    "Tipo de Labor": rec.tipo_labor || '-',
                    "Categoría": rec.categoria_labor || '-',
                    "Link Foto Antes": rec.foto_antes_url || '',
                    "Link Foto Después": rec.foto_despues_url || ''
                };
            });

            // 3. Generate Excel
            const worksheet = XLSX.utils.json_to_sheet(reportData);

            // Widths
            const wscols = [
                { wch: 15 }, // Fecha
                { wch: 15 }, // Codigo
                { wch: 40 }, // Nombre
                { wch: 25 }, // Especie
                { wch: 10 }, // Cantidad
                { wch: 25 }, // Barrio
                { wch: 20 }, // Tipo Labor
                { wch: 25 }, // Categoria
                { wch: 40 }, // Foto Antes
                { wch: 40 }, // Foto Despues
            ];
            worksheet['!cols'] = wscols;

            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Informe Poda");

            // Filename
            const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
            const fileName = `Informe_Gestion_Poda_${monthNames[exportMonth - 1]}_${exportYear}.xlsx`;

            XLSX.writeFile(workbook, fileName);
            setShowExportModal(false);

        } catch (e) {
            console.error("Error exportando:", e);
            alert("Error generando el informe excel.");
        } finally {
            setIsExporting(false);
        }
    };

    const handleCatastroExport = async () => {
        setIsExporting(true);
        try {
            const { data: trees, error } = await supabase.from('trees').select('*');
            if (error) throw error;
            if (!trees || trees.length === 0) {
                alert("No hay árboles censados.");
                return;
            }

            const csvData = trees.map(t => {
                const area = areas.find(a => a.id === t.area_id);
                return {
                    ID: t.id,
                    Plaza: area ? area.name : 'Desconocido',
                    Especie: t.especie,
                    Nombre_Cientifico: t.nombre_cientifico || '-',
                    Altura: t.altura,
                    DAP: t.dap,
                    Radio_Copa: t.radio_copa,
                    Desarrollo: t.desarrollo || '-',
                    Estado_Fitosanitario: t.estado_fitosanitario,
                    Calle: t.calle || '-',
                    Numero: t.numero || '-',
                    UTM_Norte: t.norte || '-',
                    UTM_Este: t.este || '-',
                    Latitud: t.lat,
                    Longitud: t.lng,
                    Link_Foto: t.foto_url || ''
                };
            });

            const worksheet = XLSX.utils.json_to_sheet(csvData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Catastro");

            const dateStr = new Date().toISOString().split('T')[0];
            XLSX.writeFile(workbook, `catastro_arbolado_${dateStr}.xlsx`);

        } catch (e) {
            console.error("Export error:", e);
            alert("Error al exportar.");
        } finally {
            setIsExporting(false);
        }
    };

    // Derived State for PodaOverview - REMOVED
    // const plannedAreas = areas.filter(a => a.current_status === 'PODA');
    // const stats = {
    //     pending: plannedAreas.length - completedAreaIds.filter(id => plannedAreas.find(p => p.id === id)).length, // Pending = Total - Done (intersection with planned)
    //     emergency: areas.filter(a => a.current_status === 'EMERGENCIA').length
    // };

    if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-emerald-600" size={40} /></div>;

    return (
        <div className="h-screen bg-slate-50 flex flex-col font-sans overflow-hidden relative">
            <PodaHeader userEmail={user.email} onLogout={onLogout} />

            {/* Import Modal */}
            {showImportModal && (
                <PlanificacionImporter
                    areas={areas}
                    onClose={() => setShowImportModal(false)}
                    onSuccess={() => {
                        fetchAreas(); // Refresh data/stats
                    }}
                />
            )}

            {/* Export Modal */}
            {showExportModal && (
                <div className="absolute inset-0 z-[6000] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in fade-in zoom-in-95">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-black text-lg text-emerald-900 flex items-center gap-2">
                                <FileSpreadsheet size={24} className="text-emerald-500" />
                                Exportar Reporte
                            </h3>
                            <button onClick={() => setShowExportModal(false)} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200">
                                <X size={20} className="text-slate-500" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-400 uppercase">Mes</label>
                                <select
                                    value={exportMonth}
                                    onChange={(e) => setExportMonth(parseInt(e.target.value))}
                                    className="w-full p-3 bg-slate-50 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
                                >
                                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                        <option key={m} value={m}>{new Date(2000, m - 1).toLocaleString('es-CL', { month: 'long' }).toUpperCase()}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-400 uppercase">Año</label>
                                <select
                                    value={exportYear}
                                    onChange={(e) => setExportYear(parseInt(e.target.value))}
                                    className="w-full p-3 bg-slate-50 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
                                >
                                    {[2024, 2025, 2026, 2027].map(y => (
                                        <option key={y} value={y}>{y}</option>
                                    ))}
                                </select>
                            </div>

                            <button
                                onClick={handleExport}
                                disabled={isExporting}
                                className="w-full py-4 mt-2 bg-emerald-600 text-white rounded-xl font-black uppercase text-sm shadow-lg shadow-emerald-600/20 active:scale-95 flex items-center justify-center gap-2"
                            >
                                {isExporting ? <Loader2 className="animate-spin" /> : <Download size={18} />}
                                Descargar Excel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col relative overflow-hidden">
                {!activeModule ? (
                    <div className="flex-1 overflow-y-auto w-full relative">
                        {/* Wrapper for floating buttons to stack them */}
                        <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-3 items-end">

                            {/* Import Button */}
                            <button
                                onClick={() => setShowImportModal(true)}
                                className="bg-blue-600 text-white p-4 rounded-full shadow-xl hover:bg-blue-700 transition-all active:scale-90 flex items-center gap-2 pr-6"
                            >
                                <FileSpreadsheet size={24} />
                                <span className="font-bold text-sm">Importar Plan</span>
                            </button>

                            {/* Export Button */}
                            <button
                                onClick={() => setShowExportModal(true)}
                                className="bg-emerald-800 text-emerald-100 p-4 rounded-full shadow-2xl hover:bg-emerald-900 transition-all active:scale-90 flex items-center gap-2 pr-6"
                            >
                                <Download size={24} />
                                <span className="font-bold text-sm">Reportes</span>
                            </button>
                        </div>

                        <PodaOverview
                            onNavigate={setActiveModule}
                            stats={stats}
                            plannedAreas={plannedAreas}
                            completedAreaIds={completedAreaIds}
                        />
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col w-full h-full relative">
                        {/* Module Helper Header */}
                        <div className="bg-white border-b border-emerald-100 px-6 py-4 flex items-center gap-4 z-[40] shadow-sm">
                            <button
                                onClick={() => setActiveModule(null)}
                                className="p-2 -ml-2 hover:bg-emerald-50 rounded-lg text-emerald-600 transition-colors"
                            >
                                <ArrowLeft size={20} />
                            </button>
                            <h2 className="font-bold text-lg text-emerald-900 uppercase tracking-tight">
                                {activeModule === 'MAPA' ? 'Ruta de Poda' :
                                    activeModule === 'CATASTRO' ? 'Inventario Arbolado' :
                                        activeModule === 'CALENDARIO' ? 'Planificación' : activeModule}
                            </h2>
                            {activeModule === 'CATASTRO' && (
                                <button onClick={handleCatastroExport} disabled={isExporting} className="ml-auto bg-emerald-600 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase flex items-center gap-2 hover:bg-emerald-700 transition-colors">
                                    {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                                    Exportar Excel
                                </button>
                            )}
                        </div>

                        {/* Content Container */}
                        <div className="flex-1 relative w-full bg-slate-100">

                            {/* MAP MODULE */}
                            {activeModule === 'MAPA' && (
                                <div className="absolute inset-0">
                                    <MapModule
                                        areas={areas}
                                        userEmail={user.email}
                                        mapFilter={null} // Show all, or set 'PODA' if strictly filtered
                                        onAreaUpdate={fetchAreas}
                                        isCatastroMode={false}
                                        onOpenInfra={() => { }}
                                        onOpenVehicleReport={() => { }}
                                        isInfraProfile={false}
                                        isPodaProfile={true}
                                        plannedTasks={todayPlanRecords}
                                        onOpenPodaInventory={(area) => {
                                            setSelectedInventoryArea(area);
                                            setActiveModule('CATASTRO');
                                        }}
                                    />
                                </div>
                            )}

                            {/* OTHER MODULES (Scrollable) */}
                            {activeModule !== 'MAPA' && (
                                <div className="absolute inset-0 overflow-y-auto w-full pb-20">
                                    {/* CATASTRO VIEW: Now uses MapModule in CatastroMode */}
                                    {activeModule === 'CATASTRO' && (
                                        <div className="absolute inset-0">
                                            <MapModule
                                                areas={areas}
                                                userEmail={user.email}
                                                mapFilter={null}
                                                onAreaUpdate={fetchAreas}
                                                isCatastroMode={true} // ENABLE CATASTRO
                                                onOpenInfra={() => { }}
                                                onOpenVehicleReport={() => { }}
                                                isInfraProfile={false}
                                                isPodaProfile={true}
                                                plannedTasks={todayPlanRecords}
                                                onOpenPodaInventory={() => { }} // No loop
                                            />
                                        </div>
                                    )}
                                    {activeModule === 'CALENDARIO' && <PodaCalendar areas={areas} onNavigate={(mod) => setActiveModule(mod)} />}

                                    {/* Placeholder for Emergencies */}
                                    {activeModule === 'EMERGENCIA' && (
                                        <div className="p-8 text-center text-slate-500">
                                            <p>Módulo de Emergencias en construcción.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}


