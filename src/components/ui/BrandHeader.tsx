import { Building2, LogOut, Sun, User as UserIcon } from 'lucide-react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function BrandHeader({ user, onLogout }: any) {

  // --- 1. LÓGICA SEGURA PARA DATOS DE USUARIO ---
  const getSafeData = () => {
    if (!user) return { name: 'Usuario', role: 'Invitado' };

    // Buscamos nombre en propiedad directa, metadata o email
    const rawName = user.name || (user.user_metadata && user.user_metadata.name) || user.email || 'Usuario';
    
    // Limpiamos el texto (si es email, sacamos lo de después del @)
    const cleanName = rawName.includes('@') ? rawName.split('@')[0] : rawName;
    
    // Capitalizar primera letra
    const finalName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);

    // Rol con nombre bonito
    let role = user.role || 'Supervisor';
    if (user.email && user.email.includes('its')) role = 'Inspección ITS';

    return { name: finalName, role };
  };

  const { name, role } = getSafeData();

  return (
    <header className="w-full py-3 px-6 flex justify-between items-center z-50 bg-slate-900 text-white shadow-md sticky top-0 border-b border-slate-800">
      
      {/* --- IZQUIERDA: LOGO --- */}
      <div className="flex items-center gap-4">
          <div className="h-10 w-auto md:h-12 flex items-center justify-center">
             {/* Logo Imagen */}
             <img 
                src="/logo-empresa.png" 
                alt="Logo Empresa" 
                className="h-full w-full object-contain"
                onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    document.getElementById('fallback-logo')?.classList.remove('hidden');
                }}
             />
             {/* Logo Respaldo (si falla la imagen) */}
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
              
              {/* Clima (Solo Desktop) */}
              <div className="hidden md:flex flex-col items-end border-r border-slate-700 pr-6">
                 <span className="text-xl font-bold leading-none">24°C</span>
                 <span className="text-[10px] text-yellow-400 flex items-center gap-1 font-bold uppercase mt-1">
                     <Sun size={12} /> Despejado
                 </span>
              </div>

              {/* Texto Nombre/Rol (Solo Desktop) */}
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

              {/* CORRECCIÓN: Avatar para Celular (Usa UserIcon para eliminar el error) */}
              <div className="sm:hidden bg-slate-800 p-2 rounded-full border border-slate-700">
                 <UserIcon size={20} className="text-slate-300"/>
              </div>

              {/* Botón Salir */}
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