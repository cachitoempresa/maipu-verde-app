import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '../../lib/supabase';
import { GreenArea } from '../../types';
import { X, Upload, FileSpreadsheet, Check, AlertTriangle, Edit2, Calendar as CalendarIcon, Loader2, Save } from 'lucide-react';
import { format, addDays } from 'date-fns';

interface PlanificacionImporterProps {
    areas: GreenArea[];
    onClose: () => void;
    onSuccess: () => void;
}

interface ImportedRow {
    id: number; // Row index for key
    area_id?: number;
    direccion: string;
    tipo: string;
    zona: string;
    labor: string;
    especie: string;
    altura: string;
    barrio: string;
    cantidad: number;
    observacion: string;
    fecha_programada: string; // ISO Date
    status_match: 'MATCH' | 'NO_MATCH' | 'MANUAL';
    duracion_dias: number;
    fecha_fin: string;
}

export function PlanificacionImporter({ areas, onClose, onSuccess }: PlanificacionImporterProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [step, setStep] = useState<'UPLOAD' | 'PREVIEW'>('UPLOAD');
    const [rows, setRows] = useState<ImportedRow[]>([]);
    const [baseDate, setBaseDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [defaultDuration, setDefaultDuration] = useState<number>(1);
    const [isSaving, setIsSaving] = useState(false);
    const [editingRowId, setEditingRowId] = useState<number | null>(null);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            const bstr = evt.target?.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            // Clean file: Headers are at row 0 (default). No skip needed.
            const data: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });
            processData(data);
        };
        reader.readAsBinaryString(file);
    };

    const processData = (data: any[]) => {
        // Log keys of first row to debug
        if (data.length > 0) {
            console.log("Detected Headers:", Object.keys(data[0]));
        }

        const processed: ImportedRow[] = data.map((row, idx) => {
            // Clean headers mapping
            const rawType = (row['TIPO'] || row['TIPO (AA.VV. O AU)'] || '').toString().trim();
            const rawUbicacion = (row['UBICACIÓN'] || row['UBICACIÓN (COD AA.VV. O DIRECCIÓN AU)'] || '').toString().trim();
            const rawLabor = (row['LABOR'] || 'Poda').toString().trim();
            const rawEspecie = (row['ESPECIE_ARBOL'] || '').toString().trim();
            const rawZona = (row['ZONA'] || '').toString().trim();

            // Clean Altura: "15, 5, 6" -> "15"
            const rawAlturaStr = (row['ALTURA (m)'] || row['ALTURA'] || '').toString().trim();
            const cleanAltura = rawAlturaStr.split(',')[0].trim();

            const rawBarrio = (row['BARRIO'] || '').toString().trim();
            const rawCantidad = parseInt((row['CANTIDAD'] || '1').toString().trim()) || 1;
            const rawObs = (row['OBSERVACION'] || row['OBSERVACIONES'] || '').toString().trim();

            let areaId: number | undefined;
            let finalAddress = rawUbicacion;
            let matchStatus: 'MATCH' | 'NO_MATCH' | 'MANUAL' = 'NO_MATCH';

            // Logic: AA.VV. Match
            if (rawType.toUpperCase().includes('AA.VV') || rawType.toUpperCase() === 'PLAZA' || rawType.toUpperCase() === 'PARQUE') {
                const area = areas.find(a =>
                    a.code.toLowerCase() === rawUbicacion.toLowerCase() ||
                    a.name.toLowerCase() === rawUbicacion.toLowerCase()
                );

                if (area) {
                    areaId = area.id;
                    finalAddress = `${area.code} - ${area.name}`;
                    matchStatus = 'MATCH';
                }
            }
            // Logic: AU
            else if (rawType.toUpperCase() === 'AU' || rawType.toUpperCase() === 'CALLE') {
                matchStatus = 'MANUAL';
            }

            const startDate = new Date(baseDate);
            const endDate = addDays(startDate, defaultDuration - 1);

            return {
                id: idx,
                area_id: areaId,
                direccion: finalAddress,
                tipo: rawType || 'AU',
                zona: rawZona,
                labor: rawLabor,
                especie: rawEspecie,
                altura: cleanAltura,
                barrio: rawBarrio,
                cantidad: rawCantidad,
                observacion: rawObs,
                fecha_programada: baseDate,
                duracion_dias: defaultDuration,
                fecha_fin: endDate.toISOString().split('T')[0],
                status_match: matchStatus
            };
        });

        setRows(processed);
        setStep('PREVIEW');
    };

    const handleDateChange = (id: number, newDate: string) => {
        setRows(prev => prev.map(r => {
            if (r.id === id) {
                const startDate = new Date(newDate);
                const endDate = addDays(startDate, r.duracion_dias - 1);
                return { ...r, fecha_programada: newDate, fecha_fin: endDate.toISOString().split('T')[0] };
            }
            return r;
        }));
        setEditingRowId(null);
    };

    const handleBaseDateChange = (newDate: string) => {
        setBaseDate(newDate);
        setRows(prev => prev.map(r => {
            const startDate = new Date(newDate);
            const endDate = addDays(startDate, r.duracion_dias - 1);
            return { ...r, fecha_programada: newDate, fecha_fin: endDate.toISOString().split('T')[0] };
        }));
    };

    const handleDurationChange = (newDuration: number) => {
        setDefaultDuration(newDuration);
        setRows(prev => prev.map(r => {
            const startDate = new Date(r.fecha_programada);
            const endDate = addDays(startDate, newDuration - 1);
            return { ...r, duracion_dias: newDuration, fecha_fin: endDate.toISOString().split('T')[0] };
        }));
    };

    const handleConfirm = async () => {
        if (rows.length === 0) return;
        setIsSaving(true);
        try {
            // Filter valid rows (Matched Areas or valid AU addresses)
            // Ideally we want to save all, even if NO_MATCH for code, but maybe as address?
            // User requirement: "Si TIPO === 'AA.VV.', vincula... Si TIPO === 'AU', trátalo como dirección".
            // If AA.VV fails to match, we should probably warn or save as address.
            // For now, save everything.

            const inserts = rows.map(r => {
                // Calculate End Date: Start + Duration - 1
                const start = new Date(r.fecha_programada);
                const end = new Date(start);
                end.setDate(end.getDate() + (r.duracion_dias - 1));
                const fechaFin = end.toISOString().split('T')[0];

                return {
                    area_id: r.area_id || null,
                    direccion: r.direccion,
                    fecha_programada: r.fecha_programada,
                    fecha_fin: fechaFin,
                    duracion_dias: r.duracion_dias,
                    tipo_labor: r.labor,
                    especie: r.especie,
                    cantidad: r.cantidad,
                    barrio: r.barrio,
                    zona: r.zona,
                    altura: parseFloat(r.altura) || 0, // Parse numeric assumption
                    observacion: r.observacion,
                    tipo: r.tipo,
                    estado: 'PENDIENTE'
                };
            });

            const { error } = await supabase.from('planificacion_poda').insert(inserts);
            if (error) throw error;

            alert("Planificación importada exitosamente");
            onSuccess();
            onClose();

        } catch (e) {
            console.error("Import Error:", e);
            alert("Error al importar la planificación (ver logs)");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[6000] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-7xl shadow-2xl flex flex-col max-h-[95vh] animate-in fade-in zoom-in-95">

                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-slate-100">
                    <h3 className="font-black text-xl text-slate-800 flex items-center gap-2">
                        <FileSpreadsheet className="text-emerald-600" />
                        Importar Planificación Masiva
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full">
                        <X size={20} className="text-slate-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden p-6 flex flex-col">

                    {step === 'UPLOAD' ? (
                        <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer group"
                            onClick={() => fileInputRef.current?.click()}>
                            <input ref={fileInputRef} type="file" accept=".xlsx, .xls, .csv" className="hidden" onChange={handleFileUpload} />

                            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <Upload size={32} className="text-emerald-600" />
                            </div>
                            <h4 className="font-bold text-slate-700 text-lg mb-2">Sube tu archivo Excel o CSV</h4>
                            <p className="text-slate-400 text-sm max-w-sm text-center">
                                Columnas requeridas: TIPO, UBICACIÓN, LABOR, ESPECIE_ARBOL, ZONA, ALTURA (m), CANTIDAD, BARRIO, OBSERVACION.
                            </p>
                            <button className="mt-6 px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20">
                                Seleccionar Archivo
                            </button>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col overflow-hidden">
                            {/* Controls */}
                            <div className="flex justify-between items-end mb-4 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                <div className="flex gap-6">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-400 uppercase">Fecha Inicio</label>
                                        <div className="relative">
                                            <CalendarIcon className="absolute left-3 top-3 text-slate-400" size={16} />
                                            <input
                                                type="date"
                                                value={baseDate}
                                                onChange={(e) => handleBaseDateChange(e.target.value)}
                                                className="pl-10 p-3 bg-white rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 w-40 border border-slate-200 shadow-sm"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-400 uppercase">Duración (Días)</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={defaultDuration}
                                            onChange={(e) => handleDurationChange(parseInt(e.target.value) || 1)}
                                            className="p-3 bg-white rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 w-24 border border-slate-200 shadow-sm text-center"
                                        />
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 text-sm font-medium text-slate-600 pb-2">
                                    <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-emerald-500"></span> Vinculado</div>
                                    <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-500"></span> AU/Dirección</div>
                                    <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-500"></span> Sin Match</div>
                                </div>

                                <button
                                    onClick={handleConfirm}
                                    disabled={isSaving}
                                    className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all flex items-center gap-2"
                                >
                                    {isSaving ? <Loader2 className="animate-spin" /> : <Check size={20} />}
                                    Confirmar Importación
                                </button>
                            </div>

                            {/* Table with Horizontal Scroll */}
                            <div className="flex-1 overflow-auto border border-slate-200 rounded-xl relative shadow-inner bg-slate-100">
                                <table className="w-full text-sm text-left border-collapse whitespace-nowrap">
                                    <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0 z-10 shadow-sm font-black tracking-wide">
                                        <tr>
                                            <th className="px-4 py-3 min-w-[50px] bg-slate-50 sticky left-0 z-20 border-r border-slate-200">St</th>
                                            <th className="px-4 py-3 min-w-[80px]">Tipo</th>
                                            <th className="px-4 py-3 min-w-[250px]">Ubicación / Código</th>
                                            <th className="px-4 py-3 min-w-[80px]">Zona</th>
                                            <th className="px-4 py-3 min-w-[150px]">Labor</th>
                                            <th className="px-4 py-3 min-w-[150px]">Especie</th>
                                            <th className="px-4 py-3 min-w-[80px]">Alt (m)</th>
                                            <th className="px-4 py-3 min-w-[60px] text-center">Cant.</th>
                                            <th className="px-4 py-3 min-w-[150px]">Barrio</th>
                                            <th className="px-4 py-3 min-w-[200px]">Observación</th>
                                            <th className="px-4 py-3 min-w-[120px] bg-slate-50 sticky right-0 z-20 border-l border-slate-200">Fecha</th>
                                            <th className="px-4 py-3 min-w-[50px] text-center">Ed</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 bg-white">
                                        {rows.map((row) => (
                                            <tr key={row.id} className="hover:bg-slate-50 group">
                                                {/* Status (Sticky Left) */}
                                                <td className="px-4 py-3 bg-white sticky left-0 z-10 border-r border-slate-100 group-hover:bg-slate-50">
                                                    {row.status_match === 'MATCH' && <Check size={16} className="text-emerald-500" strokeWidth={3} />}
                                                    {row.status_match === 'MANUAL' && <span className="text-[10px] font-black bg-blue-100 text-blue-600 px-2 py-1 rounded">AU</span>}
                                                    {row.status_match === 'NO_MATCH' && <AlertTriangle size={16} className="text-amber-500" />}
                                                </td>

                                                <td className="px-4 py-3 text-slate-500 font-mono text-xs">{row.tipo}</td>

                                                <td className="px-4 py-3">
                                                    <div className="font-bold text-slate-700">{row.direccion}</div>
                                                </td>

                                                <td className="px-4 py-3 text-slate-500">{row.zona}</td>
                                                <td className="px-4 py-3 text-slate-700 font-medium">{row.labor}</td>
                                                <td className="px-4 py-3 text-slate-600 italic">{row.especie}</td>
                                                <td className="px-4 py-3 text-slate-500 font-mono">{row.altura}</td>
                                                <td className="px-4 py-3 text-center font-bold text-slate-800 bg-slate-50/50">{row.cantidad}</td>
                                                <td className="px-4 py-3 text-slate-500">{row.barrio}</td>
                                                <td className="px-4 py-3 text-slate-400 text-xs max-w-[200px] truncate" title={row.observacion}>{row.observacion}</td>

                                                {/* Date (Sticky Right) */}
                                                <td className="px-4 py-3 bg-white sticky right-0 z-10 border-l border-slate-100 group-hover:bg-slate-50">
                                                    {editingRowId === row.id ? (
                                                        <input
                                                            type="date"
                                                            value={row.fecha_programada}
                                                            onChange={(e) => handleDateChange(row.id, e.target.value)}
                                                            className="p-1 border rounded text-xs font-bold w-full"
                                                            autoFocus
                                                            onBlur={() => setEditingRowId(null)}
                                                        />
                                                    ) : (
                                                        <span className="font-mono text-emerald-600 font-bold cursor-pointer hover:underline" onClick={() => setEditingRowId(row.id)}>
                                                            {format(new Date(row.fecha_programada), 'dd/MM')}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <button onClick={() => setEditingRowId(row.id)} className="p-1 hover:bg-slate-200 rounded text-slate-400 transition-colors">
                                                        <Edit2 size={14} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                        </div>
                    )}
                </div>

                {/* Footer */}
                {step === 'PREVIEW' && (
                    <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50 rounded-b-3xl">
                        <div className="flex-1 text-xs text-slate-400 flex items-center gap-2">
                            <span className="font-bold">{rows.length}</span> registros encontrados.
                            <span className="font-bold text-emerald-600">{rows.filter(r => r.status_match === 'MATCH').length}</span> vinculados.
                        </div>
                        <button onClick={() => setStep('UPLOAD')} className="px-6 py-3 font-bold text-slate-500 hover:bg-slate-200 rounded-xl transition-colors">
                            Volver
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={isSaving}
                            className="px-8 py-3 bg-emerald-600 text-white font-black rounded-xl shadow-lg shadow-emerald-600/20 active:scale-95 transition-all flex items-center gap-2"
                        >
                            {isSaving ? (
                                <>Guardando...</>
                            ) : (
                                <>
                                    <Save size={18} /> Confirmar Importación
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
