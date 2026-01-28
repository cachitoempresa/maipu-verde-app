import { useRef, useState } from 'react';
import {
    Hammer, AlertTriangle, LayoutGrid, Camera,
    Send, Loader2, X, ChevronUp, MapPin
} from 'lucide-react';

import { GreenArea } from '../../types';

interface InfraBottomSheetProps {
    area: GreenArea;
    onClose: () => void;
    onSubmit: (areaId: number, task: string | undefined, desc: string, file: File | null) => Promise<void>;
    onOpenInfra: (area: GreenArea) => void;
}

export function InfraBottomSheet({ area, onClose, onSubmit, onOpenInfra }: InfraBottomSheetProps) {
    const [step, setStep] = useState<'INITIAL' | 'DETAILS'>('INITIAL');
    const [selectedTask, setSelectedTask] = useState<string | null>(null);
    const [description, setDescription] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const TASKS = ['GASFITERÍA', 'REPARACIÓN', 'INFRAESTRUCTURA', 'PINTURA', 'MOBILIARIO', 'ILUMINACIÓN'];

    const handleInternalSubmit = async () => {
        if (!selectedTask && step === 'DETAILS') return;
        setIsSubmitting(true);
        try {
            await onSubmit(area.id, selectedTask || undefined, description, imageFile);
            onClose(); // Auto close on success
        } catch (e) {
            console.error(e);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="absolute bottom-0 left-0 right-0 z-[1000] p-4 pointer-events-none flex flex-col justify-end h-full">
            {/* Wrapper to allow map interaction above, but capture clicks on the card */}
            <div className="pointer-events-auto bg-slate-900 border-t-4 border-amber-500 rounded-t-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in slide-in-from-bottom duration-300">

                {/* Header / Handle */}
                <div className="px-6 py-4 bg-slate-900 border-b border-white/5 flex justify-between items-center shrink-0" onClick={() => { }}>
                    <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-bold text-amber-500 tracking-wider flex items-center gap-1">
                            <MapPin size={12} /> Área Activa
                        </span>
                        <h3 className="text-xl font-bold text-white leading-tight">{area.name}</h3>
                    </div>
                    <button onClick={onClose} className="p-2 bg-white/10 rounded-full text-slate-400 hover:text-white hover:bg-white/20 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="p-6 overflow-y-auto custom-scrollbar space-y-6 bg-slate-900/95 backdrop-blur-md">

                    {step === 'INITIAL' ? (
                        <div className="grid grid-cols-1 gap-3">
                            <button
                                onClick={() => setStep('DETAILS')}
                                className="w-full bg-amber-500 hover:bg-amber-400 text-slate-900 py-4 rounded-xl font-black uppercase text-sm shadow-lg active:scale-95 flex items-center justify-center gap-3 transition-all"
                            >
                                <Hammer size={20} /> Registrar Actividad
                            </button>

                            <div className="grid grid-cols-2 gap-3">
                                <button onClick={() => { setSelectedTask('EMERGENCIA'); handleInternalSubmit(); }} className="bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 p-4 rounded-xl font-black uppercase text-xs flex flex-col items-center gap-2 active:scale-95 transition-all">
                                    <AlertTriangle size={24} /> Reportar Alerta ITS
                                </button>
                                <button onClick={() => onOpenInfra(area)} className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 p-4 rounded-xl font-black uppercase text-xs flex flex-col items-center gap-2 active:scale-95 transition-all">
                                    <LayoutGrid size={24} /> Ver Catastro
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                            <button onClick={() => setStep('INITIAL')} className="text-xs font-bold text-slate-400 hover:text-white flex items-center gap-1">
                                <ChevronUp className="rotate-[-90deg]" size={14} /> Volver a Opciones
                            </button>

                            <div className="space-y-2">
                                <span className="text-[10px] font-bold text-slate-500 uppercase">Seleccione Tarea</span>
                                <div className="grid grid-cols-2 gap-2">
                                    {TASKS.map(t => (
                                        <button
                                            key={t}
                                            onClick={() => setSelectedTask(t)}
                                            className={`p-3 rounded-lg text-[10px] font-bold border transition-all ${selectedTask === t
                                                ? 'bg-amber-500 text-slate-900 border-amber-500'
                                                : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600'
                                                }`}
                                        >
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Describa el trabajo realizado..."
                                className="w-full bg-slate-950 text-white rounded-xl p-3 text-sm border border-slate-700 focus:border-amber-500 outline-none resize-none"
                                rows={3}
                            />

                            <div className="flex gap-3">
                                <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`flex-1 py-3 rounded-xl text-xs font-bold border flex items-center justify-center gap-2 ${imageFile ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' : 'bg-slate-800 text-slate-400 border-slate-700'
                                        }`}
                                >
                                    <Camera size={16} /> {imageFile ? 'Foto Lista' : 'Agregar Foto'}
                                </button>
                            </div>

                            <button
                                onClick={handleInternalSubmit}
                                disabled={!selectedTask || isSubmitting}
                                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 rounded-xl font-black uppercase text-sm shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all"
                            >
                                {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                                Confirmar Reporte
                            </button>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
