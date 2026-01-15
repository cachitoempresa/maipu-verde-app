import { useEffect, useState, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Popup, Polygon, ZoomControl, Tooltip, useMap } from 'react-leaflet';
import { supabase } from '../lib/supabase';
import { MousePointerClick, Plus, X, Eye, EyeOff, ArrowLeft, Layers, AlertCircle, Trees, Warehouse, Check, Scissors, AlertTriangle } from 'lucide-react';
import { User } from '@supabase/supabase-js';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { InventoryForm } from './InventoryForm'; 
import { TreeForm } from './TreeForm'; 
import { ITSRequestForm } from './ITSRequestForm';
import { ServiceLogForm } from './ServiceLogForm'; // <--- NUEVA IMPORTACIÓN

interface Ticket {
  id: number;
  area: string;
  priority: 'ALTA' | 'MEDIA' | 'BAJA';
  detail: string;
  category?: string;
}

interface MapModuleProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onSelectArea?: (area: any) => void;
    onBack?: () => void;
    userRole?: string;
    tickets?: Ticket[]; 
}

const COLORS = {
    OK: '#16a34a', RIEGO: '#3b82f6', ASEO: '#06b6d4', CORTE: '#eab308', 
    DESMALEZADO: '#f59e0b', OPERATIVO: '#8b5cf6', MULTA: '#dc2626', 
    DEFAULT: '#94a3b8', ACTIVE_ROUTE: '#7c3aed', INVENTORY_DONE: '#2563eb', INVENTORY_PENDING: '#cbd5e1',
    ITS_HIGH: '#dc2626', ITS_MEDIUM: '#f59e0b', ITS_LOW: '#3b82f6'
};

const ROUTE_MANAGERS = ['esteban@maipu.cl', 'mjn@maipu.cl', 'salvador@maipu.cl', 'ricardo@maipu.cl'];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function FitBoundsToData({ areas }: { areas: any[] }) {
  const map = useMap();
  const hasZoomedRef = useRef(false);
  useEffect(() => {
    if (!hasZoomedRef.current && areas.length > 0) {
      try {
        const allPoints: [number, number][] = [];
        areas.forEach(area => {
          if (area.path && Array.isArray(area.path)) allPoints.push(...area.path);
        });
        if (allPoints.length > 0) {
          const bounds = L.latLngBounds(allPoints);
          map.fitBounds(bounds, { padding: [50, 50] });
          hasZoomedRef.current = true; 
        }
      } catch (e) { console.error("Error zoom:", e); }
    }
  }, [areas, map]);
  return null;
}

export function MapModule({ onSelectArea, onBack, userRole = 'Supervisor', tickets = [] }: MapModuleProps) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [areas, setAreas] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeCuts, setActiveCuts] = useState<number[]>([]); 
    const [inventoryIds, setInventoryIds] = useState<number[]>([]); 
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    
    // CAPAS
    const [showRoutesLayer, setShowRoutesLayer] = useState(false);
    const [showInventoryLayer, setShowInventoryLayer] = useState(false);
    const [showITSLayer, setShowITSLayer] = useState(false); 
    
    // MODALES
    const [isVipModalOpen, setIsVipModalOpen] = useState(false);
    const [isInfraOpen, setIsInfraOpen] = useState(false); 
    const [isTreeOpen, setIsTreeOpen] = useState(false);   
    const [isRequestOpen, setIsRequestOpen] = useState(false);
    const [isServiceOpen, setIsServiceOpen] = useState(false); // <--- NUEVO MODAL SERVICIO
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [selectedArea, setSelectedArea] = useState<any>(null);

    const canManageRoutes = currentUser && ROUTE_MANAGERS.includes(currentUser.email || '');
    const isITS = (userRole && (userRole.toLowerCase().includes('its') || userRole.toLowerCase().includes('inspector'))) || (currentUser?.email?.includes('its@'));

    // ... (El resto de la lógica de rutas y fetch se mantiene igual) ...
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
        return name.replace(/\D/g, '') || name; 
    };

    const fetchGreenAreas = async () => {
        try {
            const { data, error } = await supabase.from('green_areas').select('*').not('path', 'is', null);
            if (error) throw error;
            setAreas(data || []);
        } catch (error) { console.error("Error cargando mapa:", error); } finally { setLoading(false); }
    };

    const fetchActiveCuts = async () => {
        const { data } = await supabase.from('cutting_routes').select('zone_id').eq('status', 'EN_PROCESO');
        if (data) setActiveCuts(data.map(r => r.zone_id));
    };

    const fetchInventoryStatus = async () => {
        const { data } = await supabase.from('area_inventory').select('area_id');
        if (data) setInventoryIds(data.map(i => i.area_id));
    };

    const toggleRouteGroup = async (routeName: string) => {
        if (!canManageRoutes || !currentUser) return; 
        const areaIds = routes[routeName];
        if (!areaIds) return;
        const isRouteActive = areaIds.every(id => activeCuts.includes(id));
        await supabase.from('cutting_routes').update({ status: 'FINALIZADO' }).in('zone_id', areaIds).eq('status', 'EN_PROCESO');
        if (!isRouteActive) {
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
        fetchGreenAreas(); fetchActiveCuts(); fetchInventoryStatus();
        supabase.auth.getUser().then(({ data }) => setCurrentUser(data.user));
    }, []);

    // -------------------------------------------------------------
    // LOGICA PRINCIPAL DE CLICS
    // -------------------------------------------------------------
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleMainAction = (area: any) => {
        setSelectedArea(area);
        
        if (isITS) {
            // ITS -> Abre Solicitudes
            setIsRequestOpen(true); 
        } else {
            // SUPERVISOR -> Abre Reporte Operativo (ServiceLogForm)
            setIsServiceOpen(true); 
        }
        
        if (onSelectArea) onSelectArea(area);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleOpenInfra = (area: any) => { setSelectedArea(area); setIsInfraOpen(true); };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleOpenTree = (area: any) => { setSelectedArea(area); setIsTreeOpen(true); };

    // ... (Helpers de estado y capas se mantienen igual) ...
    const getAreaTickets = (areaName: string) => tickets.filter(t => t.area === areaName);

    const getStatusColor = (status: string) => {
        const s = status?.toUpperCase() || 'OK';
        if (s === 'OK' || s === 'VISITA') return COLORS.OK;
        if (s === 'RIEGO') return COLORS.RIEGO;
        if (s === 'ASEO') return COLORS.ASEO;
        if (s === 'CORTE') return COLORS.CORTE;
        if (s === 'DESMALEZADO') return COLORS.DESMALEZADO;
        return COLORS.DEFAULT;
    };

    const getStatusLabel = (status: string) => {
        const s = status?.toUpperCase() || 'OK';
        if (s === 'OK' || s === 'VISITA') return 'Operativo';
        if (s === 'RIEGO') return 'Falta Riego';
        return s;
    };

    const toggleLayer = (layer: 'ROUTES' | 'INVENTORY' | 'ITS') => {
        if (layer === 'ROUTES') {
            setShowRoutesLayer(!showRoutesLayer);
            setShowInventoryLayer(false);
            setShowITSLayer(false);
        } else if (layer === 'INVENTORY') {
            setShowInventoryLayer(!showInventoryLayer);
            setShowRoutesLayer(false);
            setShowITSLayer(false);
        } else if (layer === 'ITS') {
            setShowITSLayer(!showITSLayer);
            setShowRoutesLayer(false);
            setShowInventoryLayer(false);
        }
    };

    return (
        <div className="relative w-full h-full bg-slate-100"> 
            
            {onBack && (
                <button onClick={onBack} className="absolute top-4 left-4 z-[9999] p-3 bg-white rounded-full shadow-xl hover:bg-gray-100 transition-all active:scale-95 text-gray-700 border border-gray-200 group">
                    <ArrowLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
                </button>
            )}

            {/* CONTROLES DE CAPAS */}
            <div className="absolute bottom-8 left-4 flex flex-col gap-2 items-start" style={{ zIndex: 9999 }}>
                <button onClick={() => toggleLayer('ROUTES')} className={`flex items-center gap-2 px-3 py-2 rounded-lg shadow-xl transition-all font-bold text-xs border cursor-pointer w-full justify-start ${showRoutesLayer ? 'bg-violet-600 text-white border-violet-700' : 'bg-white text-slate-600 border-gray-300'}`}>
                    {showRoutesLayer ? <Eye size={16}/> : <EyeOff size={16}/>} Capa Corte
                </button>

                {!isITS && (
                    <>
                        <button onClick={() => toggleLayer('INVENTORY')} className={`flex items-center gap-2 px-3 py-2 rounded-lg shadow-xl transition-all font-bold text-xs border cursor-pointer w-full justify-start ${showInventoryLayer ? 'bg-blue-600 text-white border-blue-700' : 'bg-white text-slate-600 border-gray-300'}`}>
                            <Layers size={16}/> {showInventoryLayer ? 'Ocultar Catastro' : 'Ver Catastro'}
                        </button>

                        <button onClick={() => toggleLayer('ITS')} className={`flex items-center gap-2 px-3 py-2 rounded-lg shadow-xl transition-all font-bold text-xs border cursor-pointer w-full justify-start ${showITSLayer ? 'bg-amber-500 text-white border-amber-600' : 'bg-white text-slate-600 border-gray-300'}`}>
                            <AlertCircle size={16}/> {showITSLayer ? 'Ocultar ITS' : 'Solicitudes ITS'}
                        </button>
                    </>
                )}

                {canManageRoutes && (
                    <button onClick={() => setIsVipModalOpen(true)} className="flex items-center gap-2 px-3 py-2 bg-slate-900 text-white rounded-lg shadow-xl hover:bg-black transition-all font-bold text-xs border border-slate-700 cursor-pointer w-full justify-center mt-2">
                        <Plus size={16} /> Gestionar Rutas
                    </button>
                )}
            </div>

            {/* MODALES */}
            {isVipModalOpen && (
                 <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" style={{ zIndex: 999999 }} onClick={() => setIsVipModalOpen(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
                        {/* ... Contenido del modal de rutas ... */}
                        <div className="flex justify-between items-center p-4 border-b bg-slate-50">
                            <div className="flex items-center gap-2">
                                <div className="bg-violet-100 p-2 rounded-full text-violet-600"><Scissors size={20} /></div>
                                <div><h3 className="font-black text-lg text-slate-800 leading-none">Gestor de Rutas</h3><p className="text-xs text-slate-500 mt-1">Activar/Desactivar cortes en masa</p></div>
                            </div>
                            <button onClick={() => setIsVipModalOpen(false)} className="p-2 bg-white border rounded-full hover:bg-red-50 hover:text-red-600 transition-colors shadow-sm"><X size={20}/></button>
                        </div>
                        <div className="overflow-y-auto p-4 bg-slate-50/50">
                            <div className="grid grid-cols-2 gap-3">
                            {sortedRouteKeys.map((routeName) => {
                                const isActive = routes[routeName].every(id => activeCuts.includes(id));
                                return (
                                    <button key={routeName} onClick={() => toggleRouteGroup(routeName)} className={`relative p-3 border rounded-xl text-left transition-all active:scale-95 group ${isActive ? 'bg-violet-600 text-white border-violet-700 shadow-lg shadow-violet-200 ring-2 ring-violet-200' : 'bg-white text-slate-600 border-slate-200 hover:border-violet-300 hover:shadow-md'}`}>
                                        <div className="flex justify-between items-start mb-1"><span className="text-xs font-bold uppercase tracking-wider opacity-70">Ruta</span>{isActive && <div className="bg-white/20 p-1 rounded-full"><Check size={12}/></div>}</div>
                                        <span className={`text-xl font-black ${isActive ? 'text-white' : 'text-slate-800'}`}>{formatRouteName(routeName)}</span>
                                        <div className="mt-2 text-[10px] font-medium flex items-center gap-1 opacity-80">{isActive ? 'En Proceso' : 'Inactivo'}</div>
                                    </button>
                                );
                            })}
                            </div>
                        </div>
                    </div>
                 </div>
            )}

            {/* Formularios Condicionales */}
            {isInfraOpen && selectedArea && !isITS && <InventoryForm area={selectedArea} userEmail={currentUser?.email} onClose={() => setIsInfraOpen(false)} onSuccess={() => fetchInventoryStatus()} />}
            {isTreeOpen && selectedArea && !isITS && <TreeForm area={selectedArea} userEmail={currentUser?.email} onClose={() => setIsTreeOpen(false)} onSuccess={() => fetchInventoryStatus()} />}
            {isRequestOpen && selectedArea && isITS && <ITSRequestForm area={selectedArea} userEmail={currentUser?.email} onClose={() => setIsRequestOpen(false)} />}
            {isServiceOpen && selectedArea && !isITS && <ServiceLogForm area={selectedArea} userEmail={currentUser?.email} onClose={() => setIsServiceOpen(false)} onSuccess={() => fetchGreenAreas()} />}

            {/* MAPA */}
            <div className="w-full h-full relative z-0"> 
                {loading && <div className="absolute inset-0 bg-white/90 flex items-center justify-center z-[5000]"><span className="text-emerald-600 font-bold animate-pulse">Cargando Mapa...</span></div>}
                <MapContainer center={[-33.5106, -70.7573]} zoom={13} style={{ height: '100%', width: '100%' }} zoomControl={false}>
                    <ZoomControl position="topright" />
                    <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <FitBoundsToData areas={areas} />

                    {areas.map((area) => {
                        const areaTickets = getAreaTickets(area.name);
                        const hasTickets = areaTickets.length > 0;
                        const isCutting = activeCuts.includes(area.id);
                        const hasInventory = inventoryIds.includes(area.id);
                        
                        let displayColor = getStatusColor(area.current_status);
                        let fillOp = 0.5;
                        let dashed = undefined;

                        if (showRoutesLayer && isCutting) { 
                            displayColor = COLORS.ACTIVE_ROUTE; fillOp = 0.7; dashed = '5, 5'; 
                        } 
                        else if (showInventoryLayer) { 
                            displayColor = hasInventory ? COLORS.INVENTORY_DONE : COLORS.INVENTORY_PENDING; fillOp = hasInventory ? 0.6 : 0.4; 
                        }
                        else if (showITSLayer && hasTickets) {
                            const hasHigh = areaTickets.some(t => t.priority === 'ALTA');
                            const hasMedium = areaTickets.some(t => t.priority === 'MEDIA');
                            displayColor = hasHigh ? COLORS.ITS_HIGH : hasMedium ? COLORS.ITS_MEDIUM : COLORS.ITS_LOW;
                            fillOp = 0.8;
                        }

                        return (
                            <div key={area.id}>
                                {area.path && Array.isArray(area.path) && (
                                    <Polygon positions={area.path} pathOptions={{ color: displayColor, fillColor: displayColor, fillOpacity: fillOp, weight: 2, dashArray: dashed, className: 'cursor-pointer' }}>
                                        <Popup className="custom-popup" minWidth={220}>
                                            <div className="p-1">
                                                <div className="mb-2 border-b border-gray-100 pb-2">
                                                    <strong className="block text-lg text-gray-800 leading-tight">{area.name}</strong>
                                                    <span className="text-xs font-mono text-gray-500 bg-gray-100 px-1 rounded block mt-1">{area.code}</span>
                                                </div>

                                                <div className="mb-3 flex items-center gap-2 text-sm">
                                                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: getStatusColor(area.current_status) }}></span>
                                                    <span className="text-gray-600 font-medium">{getStatusLabel(area.current_status)}</span>
                                                </div>

                                                {hasTickets && (
                                                    <div className="mb-3 bg-red-50 p-2 rounded-lg border border-red-100">
                                                        <h4 className="text-[10px] font-bold text-red-600 uppercase mb-1 flex items-center gap-1">
                                                            <AlertTriangle size={12}/> Reportes Activos ({areaTickets.length})
                                                        </h4>
                                                        <ul className="space-y-1">
                                                            {areaTickets.slice(0, 2).map((t, idx) => (
                                                                <li key={idx} className="text-[10px] text-slate-600 leading-tight">
                                                                    • {t.category ? `[${t.category}] ` : ''}{t.detail.substring(0, 40)}...
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}

                                                <div className="space-y-2">
                                                    <button onClick={() => handleMainAction(area)} className={`w-full border text-sm font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-colors ${isITS ? 'bg-slate-900 text-white border-slate-900 hover:bg-black' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
                                                        {isITS ? <AlertCircle size={16} /> : <MousePointerClick size={16} />}
                                                        {isITS ? 'Ingresar Solicitud / Reporte' : 'Reportar / Gestionar'}
                                                    </button>
                                                    
                                                    {!isITS && (
                                                        <div className="grid grid-cols-2 gap-2 mt-2">
                                                            <button onClick={() => handleOpenInfra(area)} className="bg-blue-600 text-white text-xs font-bold py-2 px-2 rounded-lg flex flex-col items-center justify-center gap-1 hover:bg-blue-700 transition-colors shadow-sm">
                                                                <Warehouse size={16} /> Infra
                                                            </button>
                                                            <button onClick={() => handleOpenTree(area)} className="bg-green-600 text-white text-xs font-bold py-2 px-2 rounded-lg flex flex-col items-center justify-center gap-1 hover:bg-green-700 transition-colors shadow-sm">
                                                                <Trees size={16} /> Árboles
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </Popup>
                                        <Tooltip sticky direction="top" opacity={0.9}><div className="text-center font-bold text-xs">{area.name}</div></Tooltip>
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