import { useState, useEffect } from 'react';
import { Building2, LogOut, Sun, Cloud, CloudRain, User as UserIcon } from 'lucide-react';

// --- COMPONENTE DE APOYO (Fuera del principal para evitar el error ESLint) ---
const WeatherIcon = ({ code }: { code: number }) => {
  if (code >= 51) return <CloudRain size={12} className="text-blue-400" />;
  if (code >= 1) return <Cloud size={12} className="text-slate-400" />;
  return <Sun size={12} className="text-yellow-400" />;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function BrandHeader({ user, onLogout }: any) {
  const [weather, setWeather] = useState({ temp: 24, text: 'Despejado', code: 0 });

  useEffect(() => {
    async function fetchWeather() {
      try {
        // Coordenadas Maipú: -33.51, -70.76
        const response = await fetch(
          "https://api.open-meteo.com/v1/forecast?latitude=-33.51&longitude=-70.76&current=temperature_2m,weather_code"
        );
        const data = await response.json();
        
        const currentTemp = Math.round(data.current.temperature_2m);
        const currentCode = data.current.weather_code;

        let text = 'Despejado';
        if (currentCode >= 1 && currentCode <= 3) text = 'Parcialmente Nublado';
        if (currentCode >= 45 && currentCode <= 48) text = 'Niebla';
        if (currentCode >= 51 && currentCode <= 67) text = 'Llovizna';
        if (currentCode >= 71 && currentCode <= 82) text = 'Lluvia';

        setWeather({ temp: currentTemp, text, code: currentCode });
      } catch (error) {
        console.error("Error al obtener clima:", error);
      }
    }
    fetchWeather();
    const interval = setInterval(fetchWeather, 1800000);
    return () => clearInterval(interval);
  }, []);

  // --- LÓGICA SEGURA PARA DATOS DE USUARIO ---
  const getSafeData = () => {
    if (!user) return { name: 'Usuario', role: 'Invitado' };
    const rawName = user.name || (user.user_metadata && user.user_metadata.name) || user.email || 'Usuario';
    const cleanName = rawName.includes('@') ? rawName.split('@')[0] : rawName;
    const finalName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
    let roleStr = user.role || 'Supervisor';
    if (user.email && user.email.includes('its')) roleStr = 'Inspección ITS';
    return { name: finalName, role: roleStr };
  };

  const { name, role } = getSafeData();

  return (
    <header className="w-full py-3 px-6 flex justify-between items-center z-50 bg-slate-900 text-white shadow-md sticky top-0 border-b border-slate-800">
      
      {/* --- IZQUIERDA: LOGO --- */}
      <div className="flex items-center gap-4">
          <div className="h-10 w-auto md:h-12 flex items-center justify-center">
             <img 
                src="/logo-empresa.png" 
                alt="Logo Empresa" 
                className="h-full w-full object-contain"
                onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    document.getElementById('fallback-logo')?.classList.remove('hidden');
                }}
             />
             <div id="fallback-logo" className="hidden flex items-center gap-2">
                <Building2 size={32} className="text-green-500" />
             </div>
          </div>

          <div className="flex flex-col border-l border-slate-700 pl-4">
            <h1 className="text-sm md:text-lg font-bold leading-tight text-white">
               Gestión Áreas Verdes
            </h1>
            <p className="text-[10px] md:text-xs font-medium uppercase tracking-wider text-slate-400">
               Zona 1: Longitudinal
            </p>
          </div>
      </div>

      {/* --- DERECHA: USUARIO --- */}
      {user && (
          <div className="flex items-center gap-4 sm:gap-6">
              
              {/* Clima Actual (Corregido) */}
              <div className="hidden md:flex flex-col items-end border-r border-slate-700 pr-6">
                 <span className="text-xl font-bold leading-none">{weather.temp}°C</span>
                 <span className="text-[10px] text-slate-400 flex items-center gap-1 font-bold uppercase mt-1">
                     <WeatherIcon code={weather.code} /> {weather.text}
                 </span>
              </div>

              {/* Texto Nombre/Rol */}
              <div className="hidden sm:flex flex-col items-end">
                 <p className="text-sm font-bold text-white leading-tight">
                    {name}
                 </p>
                 <div className="flex items-center gap-1 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    <p className="text-[10px] text-green-400 uppercase font-mono tracking-wide">
                        {role}
                    </p>
                 </div>
              </div>

              <div className="sm:hidden bg-slate-800 p-2 rounded-full border border-slate-700">
                 <UserIcon size={20} className="text-slate-300"/>
              </div>

              <button 
                onClick={onLogout}
                className="bg-slate-800 hover:bg-red-600 hover:text-white text-slate-400 p-2.5 rounded-xl transition-all shadow-sm active:scale-95 border border-slate-700"
                title="Cerrar Sesión"
              >
                <LogOut size={20} />
              </button>
          </div>
      )}
    </header>
  );
}