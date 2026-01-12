import { Building2 } from 'lucide-react';

interface BrandHeaderProps {
  theme?: 'light' | 'dark'; 
}

export const BrandHeader = ({ theme = 'light' }: BrandHeaderProps) => {
  // Lógica simple: Si es 'dark', fondo transparente y texto blanco. Si es 'light', fondo blanco.
  const isDark = theme === 'dark';

  return (
    <header 
      className={`w-full py-4 px-6 flex justify-between items-center z-20 relative transition-all duration-300 ${
        isDark 
          ? 'bg-transparent text-white border-b border-white/20'  // MODO LOGIN (Transparente)
          : 'bg-white text-slate-900 border-b border-slate-200 shadow-sm' // MODO NORMAL
      }`}
    >
      
      {/* Lado Izquierdo */}
      <div className="flex flex-col">
        <h1 className={`text-sm font-bold leading-tight ${isDark ? 'text-white' : 'text-slate-800'}`}>
          Gestión Áreas Verdes
        </h1>
        <p className={`text-xs font-medium ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>
          Zona 1: Longitudinal - La Farfana
        </p>
      </div>

      {/* Lado Derecho: LOGO */}
      <div>
        {/* Usamos una etiqueta img simple primero para asegurar que cargue */}
        <img 
          src="/logo-empresa.png" 
          alt="Logo Cooperativa" 
          className="h-14 w-auto object-contain"
          onError={(e) => {
            // Si falla la imagen, mostramos el icono de respaldo
            e.currentTarget.style.display = 'none';
            document.getElementById('fallback-logo')?.classList.remove('hidden');
            document.getElementById('fallback-logo')?.classList.add('flex');
          }}
        />
        
        {/* Respaldo por si la imagen no está en la carpeta public */}
        <div id="fallback-logo" className="hidden items-center gap-2 opacity-80">
           <span className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-700'}`}>
             COOPERATIVA
           </span>
           <div className={`p-2 rounded-lg ${isDark ? 'bg-white/20' : 'bg-slate-100'}`}>
             <Building2 size={24} />
           </div>
        </div>
      </div>
    </header>
  );
};