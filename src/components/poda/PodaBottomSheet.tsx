import { useState, useRef, useMemo } from 'react';
import { X, Camera, Send, TreeDeciduous, Leaf, Loader2, Calendar, Check, Hash } from 'lucide-react';

import { GreenArea } from '../../types';
import { SPECIES_LIST, BARRIOS, LABOR_TYPES, LABOR_CATEGORIES } from './podaData';

interface PodaBottomSheetProps {
    area: GreenArea;
    onClose: () => void;
    onSubmit: (
        id: number,
        task: string,
        desc: string,
        file: File | null,
        date?: string,
        species?: string,
        neighborhood?: string,
        laborCategory?: string,
        photoBefore?: File | null,
        photoAfter?: File | null,
        quantity?: number,
        coords?: { lat: number, lng: number },
        isEmergency?: boolean,
        planificacionId?: number
    ) => void;
    onOpenInventory: (area: GreenArea) => void;
}

export function PodaBottomSheet({ area, onClose, onSubmit, onOpenInventory }: PodaBottomSheetProps) {
    const [step, setStep] = useState<'INITIAL' | 'FORM'>('INITIAL');

    // Form State
    const [laborType, setLaborType] = useState<string>('');
    const [laborCategory, setLaborCategory] = useState<string>('');
    const [neighborhood, setNeighborhood] = useState<string>('');
    const [quantity, setQuantity] = useState<string>(''); // Capture as string for input handling
    const isEmergency = false; // Emergency Flag (Unused state removed)

    // Species State
    const [speciesQuery, setSpeciesQuery] = useState('');
    const [species, setSpecies] = useState('');
    const [customSpecies, setCustomSpecies] = useState('');
    const [showSpeciesList, setShowSpeciesList] = useState(false);

    const [description, setDescription] = useState('');
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

    // Photos
    const [beforeImage, setBeforeImage] = useState<File | null>(null);
    const [afterImage, setAfterImage] = useState<File | null>(null);
    const beforeInputRef = useRef<HTMLInputElement>(null);
    const afterInputRef = useRef<HTMLInputElement>(null);

    const [isSubmitting, setIsSubmitting] = useState(false);

    // Filter species logic
    const filteredSpecies = useMemo(() => {
        if (!speciesQuery) return [];
        return SPECIES_LIST.filter(s => s.toLowerCase().includes(speciesQuery.toLowerCase()));
    }, [speciesQuery]);

    const handleSubmit = async () => {
        if (!laborType || !laborCategory || !neighborhood || !species) return;

        // Final species resolution
        const finalSpecies = species === 'OTRO' ? customSpecies : species;
        if (species === 'OTRO' && !customSpecies) return;

        setIsSubmitting(true);

        // Geolocation Capture
        const getCoords = (): Promise<{ lat: number, lng: number } | undefined> => {
            return new Promise((resolve) => {
                if (!navigator.geolocation) resolve(undefined);
                navigator.geolocation.getCurrentPosition(
                    (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                    (err) => { console.warn("Geo Error", err); resolve(undefined); },
                    { timeout: 5000, enableHighAccuracy: true }
                );
            });
        };

        const coords = await getCoords();

        // Pass all data to onSubmit
        await onSubmit(
            area.id,
            laborType, // Task/Activity Type
            description,
            afterImage, // Legacy "file" argument (usually represents the completed work)
            selectedDate,
            finalSpecies,
            neighborhood,
            laborCategory,
            beforeImage,
            afterImage, // Explicit photo params
            quantity ? parseInt(quantity) : 1,
            coords,
            isEmergency // Pass Emergency Flag
        );
        setIsSubmitting(false);
        onClose();
    };

    const handleSpeciesSelect = (s: string) => {
        setSpecies(s);
        setSpeciesQuery(s);
        setShowSpeciesList(false);
    };

    return (
        <div className="absolute inset-0 z-[5000] flex flex-col justify-end" style={{ zIndex: 5000 }}>
            {/* Dimmed Overlay (Clicking closes) */}
            <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px]" onClick={onClose}></div>

            <div className="bg-white w-full rounded-t-[2rem] shadow-2xl relative z-10 animate-in slide-in-from-bottom duration-300 max-h-[90vh] flex flex-col">

                {/* Header Handle */}
                <div className="w-full flex justify-center pt-3 pb-1 flex-shrink-0" onClick={onClose}>
                    <div className="w-16 h-1.5 bg-slate-200 rounded-full"></div>
                </div>

                {/* Content */}
                <div className="p-6 pb-8 space-y-6 overflow-y-auto flex-1 custom-scrollbar">

                    {/* Header */}
                    <div className="flex justify-between items-start flex-shrink-0">
                        <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Área Seleccionada</span>
                            <h2 className="text-xl font-black text-slate-800 uppercase leading-none mt-1">{area.name}</h2>
                        </div>
                        <button onClick={onClose} className="p-2 bg-slate-100 rounded-full text-slate-400 hover:bg-slate-200">
                            <X size={20} />
                        </button>
                    </div>

                    {step === 'INITIAL' && (
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => setStep('FORM')}
                                className="bg-emerald-600 text-white p-6 rounded-2xl shadow-lg shadow-emerald-600/20 active:scale-95 transition-all text-left flex flex-col justify-between h-32"
                            >
                                <Leaf size={32} />
                                <span className="font-black uppercase text-sm">Registrar<br />Actividad</span>
                            </button>

                            <button
                                onClick={() => onOpenInventory(area)}
                                className="bg-white text-blue-600 p-6 rounded-2xl shadow-lg border-2 border-blue-100 active:scale-95 transition-all text-left flex flex-col justify-between h-32"
                            >
                                <TreeDeciduous size={32} />
                                <span className="font-black uppercase text-sm">Ver<br />Catastro</span>
                            </button>
                        </div>
                    )}

                    {step === 'FORM' && (
                        <div className="space-y-5 animate-in fade-in zoom-in-95">

                            {/* 1. Neighborhood (Barrio) */}
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-400 uppercase">Barrio</label>
                                <select
                                    className="w-full p-3 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-emerald-500 text-sm font-bold text-slate-700 outline-none"
                                    value={neighborhood}
                                    onChange={(e) => setNeighborhood(e.target.value)}
                                >
                                    <option value="">Seleccione Barrio...</option>
                                    {BARRIOS.map(b => <option key={b} value={b}>{b}</option>)}
                                </select>
                            </div>

                            {/* 2. Labor Type & Category */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-400 uppercase">Tipo Labor</label>
                                    <select
                                        className="w-full p-3 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-emerald-500 text-sm font-bold text-slate-700 outline-none"
                                        value={laborType}
                                        onChange={(e) => setLaborType(e.target.value)}
                                    >
                                        <option value="">Seleccione...</option>
                                        {LABOR_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-400 uppercase">Categoría</label>
                                    <select
                                        className="w-full p-3 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-emerald-500 text-sm font-bold text-slate-700 outline-none"
                                        value={laborCategory}
                                        onChange={(e) => setLaborCategory(e.target.value)}
                                    >
                                        <option value="">Seleccione...</option>
                                        {LABOR_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* 3. Species / Others */}
                            <div className="space-y-1 relative">
                                <label className="text-xs font-bold text-slate-400 uppercase">Especie</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Buscar especie..."
                                        value={species === 'OTRO' ? 'OTRO / NO LISTADO' : speciesQuery}
                                        onChange={(e) => {
                                            if (species === 'OTRO') {
                                                setSpecies(''); // Reset if they start typing again
                                            }
                                            setSpeciesQuery(e.target.value);
                                            setShowSpeciesList(true);
                                        }}
                                        onFocus={() => setShowSpeciesList(true)}
                                        // onBlur={() => setTimeout(() => setShowSpeciesList(false), 200)} // Delay for click to register
                                        className="w-full p-3 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium text-slate-700 placeholder:text-slate-400"
                                    />
                                    {species && species !== 'OTRO' && (
                                        <Check className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500" size={16} />
                                    )}
                                </div>

                                {/* Autocomplete Dropdown */}
                                {showSpeciesList && (
                                    <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-100 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                                        {!speciesQuery && (
                                            <div onClick={() => { handleSpeciesSelect('OTRO'); setShowSpeciesList(false); }} className="p-3 text-sm font-bold text-amber-600 hover:bg-amber-50 cursor-pointer border-b border-slate-50">
                                                OTRO / NO LISTADO
                                            </div>
                                        )}
                                        {filteredSpecies.slice(0, 50).map(s => (
                                            <div
                                                key={s}
                                                onClick={() => handleSpeciesSelect(s)}
                                                className="p-3 text-sm text-slate-600 hover:bg-slate-50 cursor-pointer border-b border-slate-50 flex justify-between items-center"
                                            >
                                                {s}
                                            </div>
                                        ))}
                                        <div onClick={() => { handleSpeciesSelect('OTRO'); setShowSpeciesList(false); }} className="p-3 text-sm font-bold text-amber-600 hover:bg-amber-50 cursor-pointer">
                                            OTRO / NO LISTADO
                                        </div>
                                    </div>
                                )}

                                {/* Other logic */}
                                {species === 'OTRO' && (
                                    <div className="animate-in slide-in-from-top-2 pt-2">
                                        <input
                                            type="text"
                                            placeholder="Especifique la especie..."
                                            value={customSpecies}
                                            onChange={(e) => setCustomSpecies(e.target.value)}
                                            className="w-full p-3 bg-amber-50 border border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-500 text-sm font-bold text-amber-900 placeholder:text-amber-400/70"
                                            autoFocus
                                        />
                                    </div>
                                )}
                            </div>

                            {/* 4. Date & Description & Quantity */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-400 uppercase">Fecha</label>
                                    <div className="relative">
                                        <input
                                            type="date"
                                            value={selectedDate}
                                            onChange={(e) => setSelectedDate(e.target.value)}
                                            className="w-full p-3 pl-10 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium text-slate-700"
                                        />
                                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-400 uppercase">Cantidad</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            min="1"
                                            value={quantity}
                                            onChange={(e) => setQuantity(e.target.value)}
                                            placeholder="1"
                                            className="w-full p-3 pl-10 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-emerald-500 text-sm font-bold text-slate-700"
                                        />
                                        <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    </div>
                                </div>
                            </div>

                            <textarea
                                placeholder="Observaciones adicionales..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full p-3 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-emerald-500 text-sm h-20 resize-none"
                            />

                            {/* Photos & Submit */}
                            <div className="grid grid-cols-2 gap-3">
                                <input type="file" ref={beforeInputRef} className="hidden" accept="image/*" capture="environment" onChange={(e) => setBeforeImage(e.target.files?.[0] || null)} />
                                <input type="file" ref={afterInputRef} className="hidden" accept="image/*" capture="environment" onChange={(e) => setAfterImage(e.target.files?.[0] || null)} />

                                <button
                                    onClick={() => beforeInputRef.current?.click()}
                                    className={`py-4 rounded-xl font-bold uppercase text-[10px] flex items-center justify-center gap-2 border-2 border-dashed transition-colors ${beforeImage ? 'border-amber-500 bg-amber-50 text-amber-600' : 'border-slate-300 text-slate-400'
                                        }`}
                                >
                                    <Camera size={16} /> {beforeImage ? 'ANTES OK' : 'FOTO ANTES'}
                                </button>

                                <button
                                    onClick={() => afterInputRef.current?.click()}
                                    className={`py-4 rounded-xl font-bold uppercase text-[10px] flex items-center justify-center gap-2 border-2 border-dashed transition-colors ${afterImage ? 'border-emerald-500 bg-emerald-50 text-emerald-600' : 'border-slate-300 text-slate-400'
                                        }`}
                                >
                                    <Camera size={16} /> {afterImage ? 'DESPUÉS OK' : 'FOTO DESPUÉS'}
                                </button>
                            </div>

                            <button
                                disabled={!laborType || !neighborhood || !selectedDate || !species || (species === 'OTRO' && !customSpecies) || isSubmitting}
                                onClick={handleSubmit}
                                className="w-full bg-emerald-600 text-white py-4 rounded-xl font-black uppercase text-sm shadow-xl shadow-emerald-600/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? <Loader2 className="animate-spin" /> : <Send size={16} />}
                                Registrar Actividad
                            </button>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}

