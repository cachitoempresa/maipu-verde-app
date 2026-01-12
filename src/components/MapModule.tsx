import { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Popup, Polygon, ZoomControl, Tooltip } from 'react-leaflet';
import { supabase } from '../lib/supabase';
// AGREGAMOS 'ArrowLeft' A LOS IMPORTES
import { MousePointerClick, Calendar, Plus, X, Eye, EyeOff, Check, ArrowLeft } from 'lucide-react';
import { User } from '@supabase/supabase-js';
import 'leaflet/dist/leaflet.css';

interface MapModuleProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onSelectArea?: (area: any) => void;
    // AGREGAMOS ESTA LÍNEA PARA QUE ACEPTE LA ORDEN DE VOLVER
    onBack?: () => void;
}

const COLORS = {
    OK: '#16a34a',      
    RIEGO: '#ea580c',   
    ASEO: '#2563eb',    
    CORTE: '#eab308',   
    MULTA: '#dc2626',   
    DEFAULT: '#4b5563', 
    ACTIVE_ROUTE: '#7c3aed' 
};

// LISTA VIP
const ROUTE_MANAGERS = [
    'esteban@maipu.cl',
    'mjn@maipu.cl',
    'salvador@maipu.cl',
    'ricardo@maipu.cl'
];

// RECIBIMOS onBack AQUÍ
export function MapModule({ onSelectArea, onBack }: MapModuleProps) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [areas, setAreas] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeCuts, setActiveCuts] = useState<number[]>([]); 
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    
    // ESTADOS
    const [showRoutesLayer, setShowRoutesLayer] = useState(false);
    const [isVipModalOpen, setIsVipModalOpen] = useState(false);

    const canManageRoutes = currentUser && ROUTE_MANAGERS.includes(currentUser.email || '');

    const routes = useMemo(() => {
        const groups: Record<string, number[]> = {};
        areas.forEach(area => {
            const route = area.route_name || 'Sin Ruta';
            if (!groups[route]) groups[route] = [];
            groups[route].push(area.id);
        });
        return groups;
    }, [areas]);

    const sortedRouteKeys = useMemo(() => {
        return Object.keys(routes).sort((a, b) => {
            const numA = parseInt(a.replace(/\D/g, '')) || 9999;
            const numB = parseInt(b.replace(/\D/g, '')) || 9999;
            return numA - numB;
        });
    }, [routes]);

    const formatRouteName = (name: string) => {
        if (!name || name === 'Sin Ruta') return 'Sin Ruta';
        const number = name.replace(/\D/g, '');
        return number || name; 
    };

    const fetchGreenAreas = async () => {
        try {
            const { data, error } = await supabase
                .from('green_areas')
                .select('id, code, name, current_status, path, route_name')
                .not('path', 'is', null);

            if (error) throw error;
            setAreas(data || []);
        } catch (error) {
            console.error("Error cargando mapa:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchActiveCuts = async () => {
        const { data } = await supabase
            .from('cutting_routes')
            .select('zone_id')
            .eq('status', 'EN_PROCESO');
        
        if (data) {
            setActiveCuts(data.map(r => r.zone_id));
        }
    };

    const toggleRouteGroup = async (routeName: string) => {
        if (!canManageRoutes || !currentUser) return; 
        const areaIds = routes[routeName];
        if (!areaIds) return;

        const isRouteActive = areaIds.every(id => activeCuts.includes(id));

        if (isRouteActive) {
            await supabase.from('cutting_routes').update({ status: 'FINALIZADO' }).in('zone_id', areaIds).eq('status', 'EN_PROCESO');
        } else {
            await supabase.from('cutting_routes').update({ status: 'FINALIZADO' }).in('zone_id', areaIds).eq('status', 'EN_PROCESO');
            const newInserts = areaIds.map(id => ({
                zone_id: id,
                zone_name: areas.find(a => a.id === id)?.name || 'Área Ruta',
                status: 'EN_PROCESO',
                operator_email: currentUser.email,
            }));
            await supabase.from('cutting_routes').insert(newInserts);
        }
        fetchActiveCuts();
    };

    useEffect(() => {
        fetchGreenAreas();
        fetchActiveCuts();
        supabase.auth.getUser().then(({ data }) => setCurrentUser(data.user));

        const channel = supabase
            .channel('realtime_cuts')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'cutting_routes' }, () => {
                fetchActiveCuts();
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'OK': return COLORS.OK;
            case 'RIEGO': return COLORS.RIEGO;
            case 'ASEO': return COLORS.ASEO;
            case 'CORTE': return COLORS.CORTE; 
            case 'MULTA': return COLORS.MULTA;
            default: return COLORS.DEFAULT;
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'OK': return 'Operativo';
            case 'RIEGO': return 'Falta Riego';
            case 'ASEO': return 'Falta Aseo';
            case 'CORTE': return 'Pasto Largo';
            case 'MULTA': return 'Infracción';
            default: return 'Sin Info';
        }
    };

    return (
        <div className="relative w-full h-[100vh] bg-slate-100"> {/* Cambié height a 100vh para pantalla completa */}
            
            {/* --- NUEVO BOTÓN VOLVER (Insertado Aquí) --- */}
            {onBack && (
                <button 
                    onClick={onBack}
                    className="absolute top-4 left-4 z-[9999] p-3 bg-white rounded-full shadow-xl hover:bg-gray-100 transition-all active:scale-95 text-gray-700 border border-gray-200 flex items-center justify-center group"
                >
                    <ArrowLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
                </button>
            )}
            {/* ------------------------------------------- */}

            {/* CONTROLES (Bottom Left) */}
            <div 
                className="absolute bottom-8 left-4 flex flex-col gap-3 items-start"
                style={{ zIndex: 9999 }} 
            >
                {/* 1. BOTÓN AGREGAR RUTA */}
                {canManageRoutes && (
                    <button 
                        onClick={() => setIsVipModalOpen(true)}
                        className="flex items-center gap-2 px-3 py-2 bg-slate-900 text-white rounded-lg shadow-xl hover:bg-black transition-all font-bold text-xs border border-slate-700 cursor-pointer w-full justify-center mb-1"
                    >
                        <Plus size={18} /> Agregar Ruta
                    </button>
                )}

                {/* 2. BOTÓN FILTRO ON/OFF */}
                <button 
                    onClick={() => setShowRoutesLayer(!showRoutesLayer)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg shadow-xl transition-all font-bold text-xs border cursor-pointer w-full justify-center
                        ${showRoutesLayer 
                            ? 'bg-violet-600 text-white border-violet-700 hover:bg-violet-700' 
                            : 'bg-white text-slate-600 border-gray-300 hover:bg-gray-100'}`}
                >
                    {showRoutesLayer ? <Eye size={18}/> : <EyeOff size={18}/>}
                    {showRoutesLayer ? 'Capa Corte ON' : 'Capa Corte OFF'}
                </button>
            </div>

            {/* MODAL DE GESTIÓN */}
            {isVipModalOpen && (
                <div 
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
                    style={{ zIndex: 10000 }}
                >
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col animate-in fade-in zoom-in duration-200 border border-gray-200">
                        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-slate-50 rounded-t-2xl">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <Calendar className="text-violet-600" size={20}/> 
                                Gestionar Rutas de Corte
                            </h3>
                            <button onClick={() => setIsVipModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                                <X size={20} className="text-slate-500"/>
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                            <p className="text-xs text-slate-500 mb-3 text-center bg-blue-50 p-2 rounded text-blue-700 border border-blue-100">
                                ℹ️ Toca un día para activar o desactivar el color violeta en el mapa.
                            </p>
                            
                            <div className="grid grid-cols-2 gap-2">
                                {sortedRouteKeys.map((routeName) => {
                                    if (routeName === 'Sin Ruta Asignada' || !routeName) return null;
                                    const ids = routes[routeName];
                                    const isActive = ids.length > 0 && ids.every(id => activeCuts.includes(id));
                                    const cleanName = formatRouteName(routeName);

                                    return (
                                        <button 
                                            key={routeName}
                                            onClick={() => toggleRouteGroup(routeName)}
                                            className={`p-3 rounded-xl border flex items-center justify-between group transition-all relative overflow-hidden
                                                ${isActive 
                                                    ? 'bg-violet-600 border-violet-700 text-white shadow-md ring-2 ring-violet-200' 
                                                    : 'bg-white border-gray-200 text-slate-600 hover:border-violet-300 hover:bg-violet-50'}`}
                                        >
                                            <div className="flex items-center gap-2 z-10">
                                                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shadow-sm ${isActive ? 'bg-white text-violet-700' : 'bg-slate-100 text-slate-500'}`}>
                                                    {cleanName}
                                                </div>
                                                <span className="text-sm font-bold">Día {cleanName}</span>
                                            </div>
                                            {isActive && <Check size={18} className="z-10"/>}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="p-4 border-t border-gray-100 bg-slate-50 rounded-b-2xl">
                             <button onClick={() => setIsVipModalOpen(false)} className="w-full py-2.5 bg-slate-900 text-white rounded-lg font-bold text-sm hover:bg-black shadow-lg transition-transform active:scale-95">
                                 Listo, volver al mapa
                             </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MAPA */}
            <div className="w-full h-full relative z-0"> 
                {loading && (
                    <div 
                        className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center gap-3"
                        style={{ zIndex: 5000 }}
                    >
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
                        <span className="text-emerald-600 font-bold animate-pulse">Cargando Mapa...</span>
                    </div>
                )}

                <MapContainer center={[-33.5106, -70.7573]} zoom={13} style={{ height: '100%', width: '100%' }} zoomControl={false}>
                    <ZoomControl position="topright" />
                    <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    
                    {areas.map((area) => {
                        const isCutting = activeCuts.includes(area.id);
                        const displayLayer = isCutting && showRoutesLayer;
                        const displayColor = displayLayer ? COLORS.ACTIVE_ROUTE : getStatusColor(area.current_status);

                        return (
                            <div key={area.id}>
                                {area.path && Array.isArray(area.path) && (
                                    <Polygon 
                                        positions={area.path} 
                                        pathOptions={{ 
                                            color: displayColor, 
                                            fillColor: displayColor,
                                            fillOpacity: displayLayer ? 0.7 : 0.5,
                                            weight: displayLayer ? 3 : 2,
                                            dashArray: displayLayer ? '5, 5' : undefined, 
                                            className: displayLayer ? 'animate-pulse-slow' : 'cursor-pointer'
                                        }}
                                    >
                                        <Popup className="custom-popup" minWidth={200}>
                                            <div className="p-1">
                                                <div className="mb-2 border-b border-gray-100 pb-2">
                                                    <strong className="block text-lg text-gray-800 leading-tight">{area.name}</strong>
                                                    <span className="text-xs font-mono text-gray-500 bg-gray-100 px-1 rounded block mt-1">{area.code}</span>
                                                </div>
                                                <div className="mb-3 flex items-center gap-2 text-sm">
                                                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: getStatusColor(area.current_status) }}></span>
                                                    <span className="text-gray-600 font-medium">{getStatusLabel(area.current_status)}</span>
                                                </div>
                                                <button onClick={() => onSelectArea && onSelectArea(area)} className="w-full bg-white border border-gray-200 text-gray-700 text-sm font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-2 hover:bg-gray-50">
                                                    <MousePointerClick size={16} /> Reportar
                                                </button>
                                            </div>
                                        </Popup>
                                        
                                        <Tooltip sticky direction="top" opacity={0.9}>
                                            <div className="text-center font-bold text-xs">{area.name}</div>
                                        </Tooltip>
                                    </Polygon>
                                )}
                            </div>
                        );
                    })}
                </MapContainer>
            </div>
        </div>
    );
}