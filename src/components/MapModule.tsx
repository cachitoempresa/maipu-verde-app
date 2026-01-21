import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Popup, Polygon, Tooltip, useMap } from 'react-leaflet';
import { supabase } from '../lib/supabase';
import { Eye, EyeOff, Activity, ArrowLeft } from 'lucide-react';
import { User } from '@supabase/supabase-js';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { ITSRequestForm } from './ITSRequestForm';
import { ServiceLogForm } from './ServiceLogForm';

// --- INTERFACES ---
interface GreenAreaMap { 
  id: number; 
  code: string; 
  name: string; 
  path: [number, number][]; 
  current_status: string; 
}

interface Ticket { 
  id: number; 
  area: string; 
  priority: 'ALTA' | 'MEDIA' | 'BAJA'; 
  detail: string; 
}

interface MapModuleProps { 
  onBack?: () => void; 
  userRole?: string; 
  tickets?: Ticket[]; 
  mapFilter?: 'RIEGO' | 'ASEO' | 'PODA' | 'PENDIENTES' | null; 
  areas: GreenAreaMap[]; 
}

const COLORS = { 
  OK: '#16a34a', 
  RIEGO: '#3b82f6', 
  ASEO: '#06b6d4', 
  CORTE: '#eab308', 
  ACTIVE_ROUTE: '#7c3aed' 
};

const normalize = (t: string) => t?.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "") || "";

function FitBoundsToData({ areas }: { areas: GreenAreaMap[] }) {
  const map = useMap();
  const hasZoomedRef = useRef(false);
  useEffect(() => {
    if (!hasZoomedRef.current && areas.length > 0) {
      const allPoints: [number, number][] = [];
      areas.forEach(area => { if (area.path) allPoints.push(...area.path); });
      if (allPoints.length > 0) {
        map.fitBounds(L.latLngBounds(allPoints), { padding: [50, 50] });
        hasZoomedRef.current = true;
      }
    }
  }, [areas, map]);
  return null;
}

export function MapModule({ onBack, userRole = 'Supervisor', tickets = [], mapFilter = null, areas }: MapModuleProps) {
    // Se eliminó 'loading' para resolver errores de ESLint
    const [activeCuts, setActiveCuts] = useState<number[]>([]); 
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [showRoutesLayer, setShowRoutesLayer] = useState(false);
    const [isRequestOpen, setIsRequestOpen] = useState(false);
    const [isServiceOpen, setIsServiceOpen] = useState(false);
    const [selectedArea, setSelectedArea] = useState<GreenAreaMap | null>(null);

    const isITS = (userRole && (userRole.toLowerCase().includes('its') || userRole.toLowerCase().includes('inspector'))) || (currentUser?.email?.includes('its@'));

    useEffect(() => {
        const fetchMeta = async () => {
            const { data: cutsRes } = await supabase.from('cutting_routes').select('zone_id').eq('status', 'EN_PROCESO');
            if (cutsRes) setActiveCuts(cutsRes.map(r => r.zone_id));
            const { data: { user } } = await supabase.auth.getUser();
            if (user) setCurrentUser(user);
        };
        fetchMeta();
    }, []);

    const getStatusLabel = (status: string) => {
        const s = status?.toUpperCase() || 'OK';
        if (s === 'RIEGO') return 'Falta Riego';
        if (s === 'ASEO') return 'Falta Aseo';
        if (s === 'PODA' || s === 'CORTE' || s === 'DESMALEZADO') return 'Requiere Poda / Corte';
        return 'Operativo'; 
    };

    return (
        <div className="relative w-full h-full bg-slate-100"> 
            {onBack && (
                <button onClick={onBack} className="absolute top-4 left-4 z-[9999] p-3 bg-white rounded-full shadow-xl text-gray-700 border border-gray-200"><ArrowLeft size={24} /></button>
            )}
            <div className="absolute bottom-8 left-4 z-[9999]">
                <button onClick={() => setShowRoutesLayer(!showRoutesLayer)} className={`flex items-center gap-2 px-3 py-2 rounded-lg shadow-xl font-bold text-xs border ${showRoutesLayer ? 'bg-violet-600 text-white' : 'bg-white text-slate-600'}`}>
                    {showRoutesLayer ? <Eye size={16}/> : <EyeOff size={16}/>} Capa Corte
                </button>
            </div>
            
            {isRequestOpen && selectedArea && <ITSRequestForm area={selectedArea} userEmail={currentUser?.email || ''} onClose={() => setIsRequestOpen(false)} />}
            {isServiceOpen && selectedArea && <ServiceLogForm area={selectedArea} userEmail={currentUser?.email || ''} onClose={() => setIsServiceOpen(false)} onSuccess={() => {}} />}

            <div className="w-full h-full relative z-0"> 
                <MapContainer center={[-33.5106, -70.7573]} zoom={13} style={{ height: '100%', width: '100%' }} zoomControl={false}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <FitBoundsToData areas={areas} />

                    {areas.map((area) => {
                        const areaTickets = (tickets || []).filter(t => normalize(t.area) === normalize(area.name));
                        const currentStatus = area.current_status?.toUpperCase() || 'OK';
                        const isFilterActive = mapFilter !== null;
                        
                        let displayColor = COLORS.OK;
                        let fillOp = 0.5;
                        let visible = true;

                        if (isFilterActive) {
                            let match = false;
                            if (mapFilter === 'RIEGO') match = currentStatus === 'RIEGO' || areaTickets.length > 0;
                            if (mapFilter === 'ASEO') match = currentStatus === 'ASEO' || areaTickets.length > 0;
                            if (mapFilter === 'PODA') match = (['PODA', 'CORTE', 'DESMALEZADO'].includes(currentStatus)) || areaTickets.length > 0;
                            
                            if (match) {
                                displayColor = mapFilter === 'RIEGO' ? COLORS.RIEGO : mapFilter === 'ASEO' ? COLORS.ASEO : COLORS.CORTE;
                                fillOp = 0.9;
                            } else { visible = false; }
                        } else {
                            if (currentStatus === 'RIEGO') displayColor = COLORS.RIEGO;
                            else if (currentStatus === 'ASEO') displayColor = COLORS.ASEO;
                            else if (['PODA', 'CORTE', 'DESMALEZADO'].includes(currentStatus)) displayColor = COLORS.CORTE;
                            if (showRoutesLayer && activeCuts.includes(area.id)) { displayColor = COLORS.ACTIVE_ROUTE; fillOp = 0.8; }
                        }

                        if (!visible || !area.path) return null;

                        return (
                            <Polygon 
                                key={`${area.id}-${currentStatus}-${mapFilter}`} 
                                positions={area.path} 
                                pathOptions={{ color: displayColor, fillColor: displayColor, fillOpacity: fillOp, weight: 2 }}
                            >
                                <Popup minWidth={220}>
                                    <strong className="block text-lg">{area.name}</strong>
                                    <div className="mb-3 flex items-center gap-2 text-sm"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: displayColor }}></span>{getStatusLabel(currentStatus)}</div>
                                    <button onClick={() => { setSelectedArea(area); if(isITS) setIsRequestOpen(true); else setIsServiceOpen(true); }} className="w-full bg-slate-900 text-white text-xs font-black py-3 rounded-xl flex items-center justify-center gap-2 uppercase"><Activity size={14}/> GESTIONAR</button>
                                </Popup>
                                <Tooltip sticky direction="top" opacity={0.9}><div className="text-center font-bold text-xs">{area.name}</div></Tooltip>
                            </Polygon>
                        );
                    })}
                </MapContainer>
            </div>
        </div>
    );
}