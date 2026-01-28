import { useState, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { X, Save, TreeDeciduous, Camera, Move, Ruler, Activity, MapPin, Hash, Leaf } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { SPECIES_LIST } from './podaData'; // Reusing species list

interface TreeFormModalProps {
    initialLat: number;
    initialLng: number;
    areaId: number;
    userEmail?: string;
    onClose: () => void;
    onSuccess: () => void;
}

// Subcomponent for Draggable Marker
function DraggableMarker({ lat, lng, onDragEnd }: { lat: number, lng: number, onDragEnd: (lat: number, lng: number) => void }) {
    const markerRef = useRef<any>(null);
    const eventHandlers = useMemo(
        () => ({
            dragend() {
                const marker = markerRef.current;
                if (marker != null) {
                    const { lat, lng } = marker.getLatLng();
                    onDragEnd(lat, lng);
                }
            },
        }),
        [onDragEnd],
    );

    return (
        <Marker
            draggable={true}
            eventHandlers={eventHandlers}
            position={[lat, lng]}
            ref={markerRef}
        />
    );
}

export function TreeFormModal({ initialLat, initialLng, areaId, userEmail, onClose, onSuccess }: TreeFormModalProps) {
    const [lat, setLat] = useState(initialLat);
    const [lng, setLng] = useState(initialLng);

    // Form States
    const [species, setSpecies] = useState('');
    const [scientificName, setScientificName] = useState(''); // NEW
    const [speciesQuery, setSpeciesQuery] = useState('');
    const [showSpeciesList, setShowSpeciesList] = useState(false);

    const [height, setHeight] = useState('');
    const [dap, setDap] = useState('');
    const [crownRadius, setCrownRadius] = useState('');
    const [health, setHealth] = useState('BUENO');
    const [development, setDevelopment] = useState('JOVEN'); // NEW

    // Location Extra
    const [street, setStreet] = useState(''); // NEW
    const [number, setNumber] = useState(''); // NEW
    const [utmNorth, setUtmNorth] = useState(''); // NEW
    const [utmEast, setUtmEast] = useState(''); // NEW

    const [imageFile, setImageFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const filteredSpecies = useMemo(() => {
        if (!speciesQuery) return [];
        return SPECIES_LIST.filter(s => s.toLowerCase().includes(speciesQuery.toLowerCase()));
    }, [speciesQuery]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            let imageUrl = null;

            // Upload Photo if exists
            if (imageFile) {
                const filename = `trees/${areaId}-${Date.now()}.jpg`;
                const { data, error } = await supabase.storage.from('evidence').upload(filename, imageFile);
                if (!error && data) {
                    const { data: publicUrl } = supabase.storage.from('evidence').getPublicUrl(filename);
                    imageUrl = publicUrl.publicUrl;
                }
            }

            const { error } = await supabase.from('trees').insert([{
                area_id: areaId,
                lat: lat,
                lng: lng,
                especie: species || 'DESCONOCIDA',
                nombre_cientifico: scientificName,
                altura: height ? parseFloat(height) : null,
                dap: dap ? parseFloat(dap) : null,
                radio_copa: crownRadius ? parseFloat(crownRadius) : null,
                estado_fitosanitario: health,
                desarrollo: development,
                calle: street,
                numero: number,
                norte: utmNorth ? parseFloat(utmNorth) : null,
                este: utmEast ? parseFloat(utmEast) : null,
                foto_url: imageUrl,
                updated_by: userEmail
            }]);

            if (error) throw error;

            alert("Árbol censado exitosamente.");
            onSuccess();
            onClose();

        } catch (error) {
            console.error(error);
            alert("Error al guardar árbol: " + JSON.stringify(error));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="bg-emerald-600 p-4 flex justify-between items-center text-white shrink-0">
                    <h3 className="font-black text-lg flex items-center gap-2">
                        <TreeDeciduous /> Catastro Técnica
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full"><X size={20} /></button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col md:flex-row">

                    {/* LEFT COLUMN: MAP & LOCATION */}
                    <div className="w-full md:w-1/3 bg-slate-50 border-r border-slate-100 flex flex-col">
                        <div className="h-48 w-full relative bg-slate-200">
                            <div className="absolute top-2 left-2 z-[1000] bg-white/90 px-2 py-1 rounded text-[10px] font-bold shadow text-slate-600 flex items-center gap-1">
                                <Move size={12} /> Pin Draggable
                            </div>
                            <MapContainer
                                center={[initialLat, initialLng]}
                                zoom={19}
                                style={{ height: '100%', width: '100%' }}
                                zoomControl={false}
                            >
                                <TileLayer url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}" />
                                <DraggableMarker
                                    lat={lat}
                                    lng={lng}
                                    onDragEnd={(newLat, newLng) => {
                                        setLat(newLat);
                                        setLng(newLng);
                                    }}
                                />
                            </MapContainer>
                        </div>
                        <div className="p-4 space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1"><MapPin size={10} /> Calle Principal</label>
                                <input type="text" value={street} onChange={e => setStreet(e.target.value)} className="w-full p-2 bg-white rounded border border-slate-200 text-xs" placeholder="Ej: Av. Pajaritos" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1"><Hash size={10} /> Número / Ref</label>
                                <input type="text" value={number} onChange={e => setNumber(e.target.value)} className="w-full p-2 bg-white rounded border border-slate-200 text-xs" placeholder="Ej: 1240" />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">UTM Norte</label>
                                    <input type="number" value={utmNorth} onChange={e => setUtmNorth(e.target.value)} className="w-full p-2 bg-white rounded border border-slate-200 text-xs" placeholder="---" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">UTM Este</label>
                                    <input type="number" value={utmEast} onChange={e => setUtmEast(e.target.value)} className="w-full p-2 bg-white rounded border border-slate-200 text-xs" placeholder="---" />
                                </div>
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono text-center pt-2 border-t">
                                {lat.toFixed(6)}, {lng.toFixed(6)}
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: DATA CONTENT */}
                    <div className="flex-1 p-6 space-y-5">
                        <form onSubmit={handleSubmit} className="space-y-5" id="tree-form">
                            {/* Especie */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1 relative">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Nombre Común</label>
                                    <input
                                        type="text"
                                        placeholder="Buscar..."
                                        value={speciesQuery}
                                        onChange={(e) => {
                                            setSpecies(e.target.value);
                                            setSpeciesQuery(e.target.value);
                                            setShowSpeciesList(true);
                                        }}
                                        onFocus={() => setShowSpeciesList(true)}
                                        className="w-full p-2 bg-slate-50 rounded-lg border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-slate-700 text-sm"
                                        required
                                    />
                                    {showSpeciesList && speciesQuery && (
                                        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-100 rounded-xl shadow-xl max-h-40 overflow-y-auto">
                                            {filteredSpecies.slice(0, 10).map(s => (
                                                <div key={s} onClick={() => { setSpecies(s); setSpeciesQuery(s); setShowSpeciesList(false); }} className="p-3 text-sm hover:bg-slate-50 cursor-pointer border-b border-slate-50">
                                                    {s}
                                                </div>
                                            ))}
                                            <div onClick={() => { setSpecies(speciesQuery); setShowSpeciesList(false); }} className="p-3 text-sm font-bold text-amber-600 hover:bg-amber-50 cursor-pointer">
                                                Usar: {speciesQuery}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Nombre Científico</label>
                                    <input type="text" value={scientificName} onChange={e => setScientificName(e.target.value)} className="w-full p-2 bg-slate-50 rounded-lg border-slate-200 text-sm italic" placeholder="Ej: Quillaja saponaria" />
                                </div>
                            </div>

                            {/* Medidas Grid */}
                            <div className="grid grid-cols-3 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1"><Ruler size={10} /> Altura (m)</label>
                                    <input type="number" step="0.1" value={height} onChange={e => setHeight(e.target.value)} className="w-full p-2 bg-slate-50 rounded-lg border-slate-200" placeholder="Ej: 5.5" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1"><Activity size={10} /> DAP (cm)</label>
                                    <input type="number" step="1" value={dap} onChange={e => setDap(e.target.value)} className="w-full p-2 bg-slate-50 rounded-lg border-slate-200" placeholder="Ej: 30" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">Copa (m)</label>
                                    <input type="number" step="0.1" value={crownRadius} onChange={e => setCrownRadius(e.target.value)} className="w-full p-2 bg-slate-50 rounded-lg border-slate-200" placeholder="Ej: 3.0" />
                                </div>
                            </div>

                            {/* Desarrollo */}
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1"><Leaf size={12} /> Etapa Desarrollo</label>
                                <div className="grid grid-cols-4 gap-1">
                                    {['NUEVO', 'JOVEN', 'MADURO', 'SOBREM.'].map(d => (
                                        <button
                                            key={d}
                                            type="button"
                                            onClick={() => setDevelopment(d)}
                                            className={`p-1.5 rounded text-[9px] font-bold border transition-all ${development === d
                                                ? 'bg-emerald-600 text-white border-emerald-600'
                                                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                                        >
                                            {d}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Estado y Foto */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Estado Sanitario</label>
                                    <select
                                        value={health}
                                        onChange={e => setHealth(e.target.value)}
                                        className="w-full p-2 bg-slate-50 rounded-lg border border-slate-200 text-xs font-bold"
                                    >
                                        <option value="BUENO">OK / BUENO</option>
                                        <option value="REGULAR">REGULAR</option>
                                        <option value="MALO">MALO</option>
                                        <option value="MUERTO">MUERTO</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Fotografía</label>
                                    <label className={`flex flex-col items-center justify-center w-full h-10 border border-dashed rounded-lg cursor-pointer hover:bg-slate-50 transition-colors ${imageFile ? 'border-emerald-500 bg-emerald-50' : 'border-slate-300'}`}>
                                        <input type="file" className="hidden" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
                                        <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                                            <Camera size={12} /> {imageFile ? 'Listo' : 'Adjuntar'}
                                        </span>
                                    </label>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting || !species}
                                className="w-full py-4 bg-emerald-600 text-white rounded-xl font-black uppercase shadow-xl hover:bg-emerald-700 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
                            >
                                {isSubmitting ? 'Guardando...' : <><Save size={18} /> Guardar Catastro</>}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
