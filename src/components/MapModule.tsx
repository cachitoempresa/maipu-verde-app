import { useState } from 'react';
import { MapContainer, TileLayer, Polygon, Popup } from 'react-leaflet';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import type { GreenArea } from '../types'; // 👈 Importamos el tipo real
import 'leaflet/dist/leaflet.css';
import { Filter, XCircle } from 'lucide-react';

// Interfaz para los datos que usa el mapa
interface MapPolygon {
  id?: number;
  code: string;
  name: string;
  type: string;
  surface_m2: number;
  path: [number, number][];
  current_status?: string;
}

const STATUS_CONFIG = {
  'OK':              { color: '#22c55e', label: 'Operativo',      bg: 'bg-green-500' },
  'CORTE':           { color: '#eab308', label: 'Corte Pasto',    bg: 'bg-yellow-500' },
  'RIEGO':           { color: '#f97316', label: 'Falta Riego',    bg: 'bg-orange-500' },
  'MULTA':           { color: '#ef4444', label: 'Multas',         bg: 'bg-red-500' },
  'INFRAESTRUCTURA': { color: '#64748b', label: 'Infraestructura',bg: 'bg-gray-500' },
  'PLANTAS':         { color: '#a855f7', label: 'Jardinería',     bg: 'bg-purple-500' },
};

export function MapModule() {
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const areas = useLiveQuery<MapPolygon[]>(async () => {
    // 1. Obtenemos los datos
    const dbAreas = await db.greenAreas.toArray();
    
    // 2. Le decimos a TypeScript: "Esto es una lista de GreenArea"
    const typedAreas = dbAreas as unknown as GreenArea[];

    return typedAreas
      // Ahora TypeScript sabe que 'a' tiene propiedad 'path', no necesitamos 'any'
      .filter((a) => a.path && Array.isArray(a.path) && a.path.length > 0)
      .map((a) => {
        return {
          id: a.id,
          code: a.code,
          name: a.name,
          type: a.type,
          neighborhood: a.neighborhood,
          surface_m2: a.surface_m2,
          path: a.path!, // El signo ! asegura que path existe (ya lo filtramos arriba)
          current_status: a.current_status || 'OK' 
        };
      });
  }, []);

  if (!areas) return <div className="p-10 text-center animate-pulse">Cargando mapa...</div>;
  if (areas.length === 0) return <div className="p-10 text-center text-red-500 font-bold">⚠️ No hay polígonos cargados. Por favor reinicia los datos en el Resumen.</div>;

  const counts = areas.reduce((acc, area) => {
    const status = area.current_status || 'OK';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const filteredAreas = activeFilter 
    ? areas.filter(a => a.current_status === activeFilter)
    : areas;

  return (
    <div className="relative h-[650px] w-full rounded-xl overflow-hidden border border-gray-200 shadow-lg flex flex-col">
      <div className="bg-white p-3 border-b flex flex-wrap gap-2 items-center z-10 shadow-sm">
        <div className="flex items-center gap-2 text-gray-500 mr-2 text-sm font-bold uppercase tracking-wider">
          <Filter size={16} /> Filtros:
        </div>
        <button onClick={() => setActiveFilter(null)} className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border flex items-center gap-2 ${activeFilter === null ? 'bg-gray-800 text-white' : 'bg-gray-50'}`}>
          TODAS ({areas.length})
        </button>
        {Object.entries(STATUS_CONFIG).map(([key, config]) => (
          <button
            key={key}
            onClick={() => setActiveFilter(activeFilter === key ? null : key)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border flex items-center gap-2 ${activeFilter === key ? 'ring-2 ring-gray-400' : 'opacity-70 hover:opacity-100'}`}
            style={{ backgroundColor: activeFilter === key ? 'white' : 'transparent', borderColor: config.color, color: activeFilter === key ? 'black' : '#4b5563' }}
          >
            <div className={`w-3 h-3 rounded-full ${config.bg}`} />
            {config.label} <span className="bg-gray-100 text-gray-600 px-1.5 rounded ml-1">{counts[key] || 0}</span>
          </button>
        ))}
        {activeFilter && <button onClick={() => setActiveFilter(null)} className="ml-auto text-xs text-red-500"><XCircle size={14} /></button>}
      </div>

      <div className="flex-1 relative z-0">
        <MapContainer center={[-33.4950, -70.7600]} zoom={13} scrollWheelZoom={true} style={{ height: "100%", width: "100%" }}>
          <TileLayer attribution='&copy; OSM' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {filteredAreas.map((area) => {
            const config = STATUS_CONFIG[area.current_status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG['OK'];
            return (
              <Polygon key={`${area.id}-${area.current_status}`} positions={area.path} pathOptions={{ color: activeFilter ? config.color : '#14532d', fillColor: config.color, fillOpacity: activeFilter ? 0.8 : 0.5, weight: 1 }}>
                <Popup>
                  <div className="text-center p-1 min-w-[150px]">
                    <span className="text-xs uppercase font-bold text-gray-400 block mb-1">{area.code}</span>
                    <strong className="text-gray-800 text-sm block mb-3">{area.name}</strong>
                    <div className={`text-xs font-bold px-3 py-1.5 rounded-full text-white inline-block mb-2 ${config.bg}`}>{config.label.toUpperCase()}</div>
                    <div className="text-xs text-gray-500 border-t pt-2 mt-2">{area.type} • {area.surface_m2} m²</div>
                  </div>
                </Popup>
              </Polygon>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}