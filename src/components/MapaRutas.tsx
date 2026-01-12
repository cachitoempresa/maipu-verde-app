import { useState } from 'react';
import { ArrowLeft, Navigation, Droplets, Map as MapIcon, Layers, Info, User } from 'lucide-react';

interface MapaRutasProps {
  user: { name: string; role: string } | null;
  onBack: () => void;
}

export function MapaRutas({ user, onBack }: MapaRutasProps) {
  const [activeLayer, setActiveLayer] = useState<'riego' | 'poda' | 'todos'>('todos');
  
  // DATOS SIMULADOS CON POSICIONES CSS
  // Ahora incluimos la posición exacta de cada zona en el mapa
  const zonas = [
    { 
      id: 'Z1-A', 
      nombre: 'Parque Central', 
      tipo: 'riego', 
      estado: 'en-curso', 
      color: 'bg-blue-500/40 border-blue-600 text-blue-900',
      icon: <Droplets size={12} />,
      posicion: { top: '4%', left: '4%', width: '50%', height: '30%' } 
    },
    { 
      id: 'Z1-B', 
      nombre: 'Bandejón Pajaritos', 
      tipo: 'riego', 
      estado: 'completado', 
      color: 'bg-green-500/40 border-green-600 text-green-900',
      icon: <span>✓</span>,
      posicion: { bottom: '20%', left: '4%', right: '4%', height: '15%' } 
    },
    { 
      id: 'Z2-C', 
      nombre: 'Plaza Los Robles', 
      tipo: 'poda', 
      estado: 'pendiente', 
      color: 'bg-orange-500/40 border-orange-600 text-orange-900',
      icon: <Layers size={12} />,
      posicion: { top: '35%', right: '4%', width: '35%', height: '25%' } 
    },
  ];

  // AQUÍ ESTABA EL ERROR ANTES: Calculábamos esto pero no lo usábamos.
  // Ahora sí lo usamos abajo en el .map()
  const filteredZonas = activeLayer === 'todos' ? zonas : zonas.filter(z => z.tipo === activeLayer);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col font-sans overflow-hidden">
      
      {/* HEADER FLOTANTE */}
      <div className="bg-white p-4 shadow-md z-20 flex flex-col gap-4 sticky top-0 rounded-b-2xl">
        <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 active:scale-95 transition-all">
              <ArrowLeft size={20} className="text-gray-600" />
            </button>
            <div className="flex-1">
              <h1 className="text-lg font-black text-gray-800 uppercase leading-none flex items-center gap-2">
                  <MapIcon size={18} /> Mapa Zona 1
              </h1>
              {/* USO DE VARIABLE 'user': Ahora mostramos quién está viendo el mapa */}
              <p className="text-xs text-gray-500 font-bold mt-1 flex items-center gap-1">
                 <User size={10} /> Operador: {user?.name}
              </p>
            </div>
        </div>
        
        {/* Selector de Capas */}
        <div className="flex bg-gray-100 p-1 rounded-lg">
            <button 
                onClick={() => setActiveLayer('riego')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-xs font-bold transition-all ${activeLayer === 'riego' ? 'bg-white shadow text-blue-600' : 'text-gray-400'}`}
            >
                <Droplets size={14} /> Riego
            </button>
            <button 
                onClick={() => setActiveLayer('poda')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-xs font-bold transition-all ${activeLayer === 'poda' ? 'bg-white shadow text-orange-600' : 'text-gray-400'}`}
            >
                <Layers size={14} /> Poda
            </button>
             <button 
                onClick={() => setActiveLayer('todos')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-xs font-bold transition-all ${activeLayer === 'todos' ? 'bg-white shadow text-gray-800' : 'text-gray-400'}`}
            >
                Todos
            </button>
        </div>
      </div>

      {/* MAPA INTERACTIVO */}
      <div className="relative flex-1 bg-gray-300 w-full h-full overflow-hidden">
        {/* Fondo Satelital */}
        <div 
            className="absolute inset-0 bg-cover bg-center grayscale-[30%]"
            style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&q=80&w=800")' }}
        ></div>

        {/* USO DE VARIABLE 'filteredZonas': Renderizamos dinámicamente las zonas */}
        <div className="absolute inset-0 w-full h-full">
            {filteredZonas.map((zona) => (
                <div 
                    key={zona.id}
                    className={`absolute border-2 rounded-2xl flex items-center justify-center p-2 backdrop-blur-[2px] transition-all duration-500 ${zona.color} ${zona.estado === 'en-curso' ? 'animate-pulse' : ''}`}
                    style={zona.posicion} // Aplicamos la posición definida en el array
                >
                    <span className="bg-white/90 px-2 py-1 rounded text-[10px] font-bold shadow-sm flex items-center gap-1">
                        {zona.icon} {zona.nombre}
                    </span>
                </div>
            ))}

            {/* Camión GPS (Siempre visible si estamos en Riego o Todos) */}
            {(activeLayer === 'riego' || activeLayer === 'todos') && (
                 <div className="absolute top-1/4 left-1/4 transform translate-x-4 translate-y-4 flex flex-col items-center z-10 animate-bounce">
                    <div className="bg-blue-600 p-1.5 rounded-full border-2 border-white shadow-xl">
                        <Navigation size={20} className="text-white" fill="currentColor" />
                    </div>
                    <span className="bg-blue-600 text-white px-2 py-0.5 rounded text-[8px] font-bold shadow mt-1 whitespace-nowrap">
                        Aljibe CJ-22-LK
                    </span>
                </div>
            )}
        </div>
        
        {/* Leyenda */}
        <div className="absolute bottom-4 right-4 bg-white/90 p-3 rounded-xl shadow-lg text-xs z-20 backdrop-blur-sm">
            <h4 className="font-bold mb-2 flex items-center gap-1 text-gray-500 uppercase text-[10px]">
                <Info size={12}/> Simbología
            </h4>
            <div className="space-y-1.5">
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-blue-500 rounded-sm"></div><span>Riego Activo</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-green-500 rounded-sm"></div><span>Completado</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-orange-500 rounded-sm"></div><span>Poda</span></div>
            </div>
        </div>
      </div>
    </div>
  );
}