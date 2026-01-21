import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { 
  Target, Droplets, Scissors, Hammer, 
  Wrench, Trash2, MessageSquare, CheckCircle, Loader2, Send 
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface GreenArea {
  id: number;
  name: string;
  code: string;
  path: [number, number][];
  current_status: string;
}

interface MapModuleProps {
  userRole: string;
  areas: GreenArea[];
  userEmail: string;
  mapFilter?: string | null;
}

const userIcon = L.divIcon({
  className: 'gps-dot',
  html: `<div style="position: relative;"><div style="position: absolute; width: 22px; height: 22px; background: rgba(66, 133, 244, 0.2); border-radius: 50%; animation: pulse 2s infinite;"></div><div style="width: 12px; height: 12px; background: #4285F4; border: 2px solid white; border-radius: 50%; position: absolute; top: 5px; left: 5px; box-shadow: 0 0 5px rgba(0,0,0,0.5);"></div></div><style>@keyframes pulse { 0% { transform: scale(1); opacity: 1; } 100% { transform: scale(2.5); opacity: 0; } }</style>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

function LocationButton({ coords }: { coords: [number, number] | null }) {
  const map = useMap();
  return (
    <button 
      onClick={(e) => { e.stopPropagation(); if(coords) map.flyTo(coords, 18); }} 
      className="absolute bottom-24 right-4 z-[1000] bg-white p-3 rounded-2xl shadow-2xl border-2 border-blue-600 text-blue-600 active:scale-90 transition-all"
    >
      <Target size={24} />
    </button>
  );
}

export function MapModule({ areas, userEmail, mapFilter }: MapModuleProps) {
  // COORDENADAS ZONA 1 (Longitudinal - La Farfana)
  const ZONA_1_CENTER: [number, number] = [-33.482, -70.760];
  
  const [userCoords, setUserCoords] = useState<[number, number] | null>(null);
  const [actionDetail, setActionDetail] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [tempImageUrl, setTempImageUrl] = useState<string | null>(null);

  useEffect(() => {
    const watchId = navigator.geolocation.watchPosition(
      (pos) => setUserCoords([pos.coords.latitude, pos.coords.longitude]),
      () => {}, { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const handleFinalSubmit = async (areaId: number, areaName: string, statusToSet?: string) => {
    const finalStatus = statusToSet || selectedStatus;
    if (!finalStatus) return alert("Selecciona una actividad.");

    try {
      setIsProcessing(true);
      await supabase.from('green_areas').update({ current_status: finalStatus }).eq('id', areaId);
      await supabase.from('logs').insert([{
        area_id: areaId,
        activity_type: finalStatus,
        operator_email: userEmail,
        description: actionDetail || `Registro de ${finalStatus}`,
        image_url: tempImageUrl,
        created_at: new Date().toISOString()
      }]);
      alert(`✅ ${areaName}: ${finalStatus} registrado.`);
      setSelectedStatus(null);
      setActionDetail('');
      setTempImageUrl(null);
    } catch (error) {
      console.error(error);
      alert("Error al guardar");
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'RIEGO': return '#1E40AF';
      case 'PODA': return '#D97706';
      case 'REPARACIÓN': return '#7C3AED';
      case 'GASFITERÍA': return '#0891B2';
      case 'ASEO': return '#475569';
      case 'SOLICITUD': return '#DB2777';
      default: return '#022C22';
    }
  };

  const BUTTONS = [
    { id: 'RIEGO', icon: Droplets, color: 'text-blue-700', bg: 'bg-blue-50' },
    { id: 'PODA', icon: Scissors, color: 'text-amber-700', bg: 'bg-amber-50' },
    { id: 'REPARACIÓN', icon: Hammer, color: 'text-violet-700', bg: 'bg-violet-50' },
    { id: 'GASFITERÍA', icon: Wrench, color: 'text-cyan-700', bg: 'bg-cyan-50' },
    { id: 'ASEO', icon: Trash2, color: 'text-slate-700', bg: 'bg-slate-50' },
    { id: 'SOLICITUD', icon: MessageSquare, color: 'text-pink-700', bg: 'bg-pink-50' },
  ];

  return (
    <div className="relative w-full h-full bg-slate-200">
      <MapContainer 
        center={ZONA_1_CENTER} // INICIO EN ZONA 1
        zoom={15} 
        style={{ height: '100%', width: '100%' }} 
        zoomControl={false}
      >
        <TileLayer url="https://mt1.google.com/vt/lyrs=r&x={x}&y={y}&z={z}" attribution="Google Maps" />

        {areas
          .filter(a => !mapFilter || a.current_status === mapFilter) // Aplica el filtro del dashboard
          .map((area) => (
          <Polygon
            key={`${area.id}-${area.current_status}`}
            positions={area.path}
            pathOptions={{
              fillColor: getStatusColor(area.current_status),
              fillOpacity: 0.85,
              weight: 0,
            }}
          >
            <Popup minWidth={300}>
              <div className="p-2 font-sans space-y-4" onClick={(e) => e.stopPropagation()}>
                <header className="border-b pb-2 flex justify-between items-center">
                  <div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{area.code}</span>
                    <h4 className="font-black text-slate-800 text-sm uppercase italic">{area.name}</h4>
                  </div>
                </header>

                <div className="grid grid-cols-3 gap-2">
                  {BUTTONS.map((btn) => (
                    <button 
                      key={btn.id}
                      onClick={() => setSelectedStatus(btn.id)}
                      className={`flex flex-col items-center gap-1 p-2 rounded-2xl border-2 transition-all 
                        ${selectedStatus === btn.id ? 'border-blue-600 bg-blue-50 scale-105' : 'border-transparent bg-slate-50 opacity-60'}`}
                    >
                      <btn.icon size={20} className={btn.color}/>
                      <span className="text-[7px] font-black uppercase text-slate-600">{btn.id}</span>
                    </button>
                  ))}
                </div>

                <textarea 
                  value={actionDetail}
                  onChange={(e) => setActionDetail(e.target.value)}
                  placeholder="Comentarios..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none"
                  rows={2}
                />

                <div className="flex flex-col gap-2">
                  <button 
                    disabled={isProcessing}
                    onClick={() => handleFinalSubmit(area.id, area.name)}
                    className="w-full bg-blue-600 text-white p-4 rounded-2xl font-black uppercase text-[11px] flex items-center justify-center gap-2 shadow-lg"
                  >
                    {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    Registrar
                  </button>
                  
                  <button 
                    disabled={isProcessing}
                    onClick={() => handleFinalSubmit(area.id, area.name, 'OK')}
                    className="w-full bg-[#022C22] text-white p-4 rounded-2xl font-black uppercase text-[11px] flex items-center justify-center gap-2 shadow-lg"
                  >
                    <CheckCircle size={18} /> Finalizar (Todo OK)
                  </button>
                </div>
              </div>
            </Popup>
          </Polygon>
        ))}

        {userCoords && <Marker position={userCoords} icon={userIcon} />}
        <LocationButton coords={userCoords} />
      </MapContainer>
    </div>
  );
}