import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Polygon, Popup } from 'react-leaflet';
import { supabase } from '../lib/supabase';
import 'leaflet/dist/leaflet.css';
import { XCircle, Wifi } from 'lucide-react';

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
  const [areas, setAreas] = useState<MapPolygon[]>([]);
  const [loading, setLoading] = useState(true);

  // Cargar datos y suscribirse a cambios en tiempo real
  useEffect(() => {
    
    // 1. DEFINIMOS LA FUNCIÓN DENTRO DEL EFECTO
    const fetchAreas = async () => {
      const { data, error } = await supabase.from('green_areas').select('*');
      if (error) console.error("Error cargando mapa:", error);
      if (data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setAreas(data as any[]);
      }
      setLoading(false);
    };

    // 2. LA LLAMAMOS INMEDIATAMENTE (Carga Inicial)
    fetchAreas();

    // 3. CONFIGURAMOS LA SUSCRIPCIÓN (Carga en Vivo)
    const channel = supabase
      .channel('cambios-mapa')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'green_areas' },
        (payload) => {
          console.log('Cambio detectado en vivo:', payload);
          fetchAreas(); // Como está en el mismo ámbito, podemos llamarla aquí
        }
      )
      .subscribe();

    // 4. LIMPIEZA AL SALIR
    return () => {
      supabase.removeChannel(channel);
    };
  }, []); // El array vacío asegura que esto solo corra al montar el componente

  if (loading) return <div className="p-10 text-center animate-pulse">Conectando satélite... 🛰️</div>;
  if (areas.length === 0) return <div className="p-10 text-center text-red-500 font-bold">⚠️ La Nube está vacía. Usa el botón "Inicializar Nube" en el Resumen.</div>;

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
        <div className="flex items-center gap-2 text-green-600 mr-2 text-xs font-bold uppercase tracking-wider bg-green-50 px-2 py-1 rounded-lg border border-green-100">
          <Wifi size={14} className="animate-pulse" /> En Vivo
        </div>
        
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