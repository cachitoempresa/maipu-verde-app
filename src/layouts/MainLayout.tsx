import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Map as MapIcon, 
  ClipboardList, 
  History, 
  Menu, 
  X, 
  LogOut, 
  Lock, 
  Inbox, 
  UserCircle 
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js'; // Importamos el tipo correcto

// Corregimos el "any" por el tipo estricto "Session"
interface MainLayoutProps {
  session: Session;
}

export const MainLayout = ({ session }: MainLayoutProps) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  
  // Lógica de permisos
  const isRestricted = session?.user.email === 'its@maipu.cl';

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login'); // Redirigimos al login al salir
  };

  const menuItems = [
    { id: '/', label: 'Inicio', icon: LayoutDashboard, hidden: isRestricted },
    { id: '/mapa', label: 'Mapa General', icon: MapIcon, hidden: false },
    { id: '/buzon', label: 'Buzón Solicitudes', icon: Inbox, hidden: isRestricted },
    { id: '/reporte', label: 'Ingreso', icon: ClipboardList, hidden: false },
    { id: '/historial', label: 'Historial', icon: History, hidden: isRestricted },
  ];

  const visibleMenuItems = menuItems.filter(item => !item.hidden);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex">
      
      {/* SIDEBAR CON TUS ESTILOS ORIGINALES */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 text-white transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:block shadow-2xl ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-full flex flex-col">
            
            {/* Header del Sidebar (Uso de Lock y X) */}
            <div className="h-24 flex items-center px-8 border-b border-slate-800">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isRestricted ? 'bg-orange-500' : 'bg-emerald-500'} shadow-lg shadow-emerald-500/20`}>
                        {isRestricted ? <Lock className="text-white" size={24} /> : <LayoutDashboard className="text-white" size={24} />}
                    </div>
                    <div>
                        <h1 className="text-xl font-bold leading-none tracking-tight">MAIPÚ</h1>
                        <p className={`text-[10px] font-bold tracking-[0.2em] mt-1 ${isRestricted ? 'text-orange-400' : 'text-emerald-400'}`}>
                            {isRestricted ? 'MODO ITS' : 'VERDE'}
                        </p>
                    </div>
                </div>
                {/* Botón cerrar menú móvil */}
                <button className="ml-auto lg:hidden text-slate-400 hover:text-white" onClick={() => setIsMobileMenuOpen(false)}>
                    <X size={24} />
                </button>
            </div>

            {/* Navegación */}
            <nav className="flex-1 px-4 py-8 space-y-2">
                <p className="px-4 text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Menú Principal</p>
                {visibleMenuItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => { navigate(item.id); setIsMobileMenuOpen(false); }}
                        className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-200 group
                            ${location.pathname === item.id 
                                ? (isRestricted ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20')
                                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                            }`}
                    >
                        <item.icon size={20} className={`transition-colors ${location.pathname === item.id ? (isRestricted ? 'text-orange-400' : 'text-emerald-400') : 'text-slate-500 group-hover:text-white'}`} />
                        {item.label}
                    </button>
                ))}
            </nav>

            {/* Footer de Usuario (Uso de UserCircle y LogOut) */}
            <div className="p-6 border-t border-slate-800">
                <div className="flex items-center gap-3 mb-6 px-2">
                    <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
                        <UserCircle size={24} />
                    </div>
                    <div className="overflow-hidden">
                        <p className="text-sm font-bold text-white truncate">{session.user.email?.split('@')[0]}</p>
                        <p className="text-xs text-slate-500 truncate">{session.user.email}</p>
                    </div>
                </div>
                <button 
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 justify-center px-4 py-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg text-sm font-medium transition-colors"
                >
                    <LogOut size={16} /> Cerrar Sesión
                </button>
            </div>
        </div>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden h-screen bg-slate-50 relative">
        
        {/* Header Móvil (Uso de Menu) */}
        <header className="bg-white border-b border-slate-200 p-4 flex items-center justify-between lg:hidden shadow-sm z-40 relative">
            <span className="font-bold text-slate-800">
                {visibleMenuItems.find(i => i.id === location.pathname)?.label || 'Maipú Verde'}
            </span>
            <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 bg-slate-100 rounded-lg text-slate-600">
                <Menu size={24} />
            </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 lg:p-10 scroll-smooth relative z-0">
            {/* Outlet renderiza las páginas hijas (Dashboard, Mapa, Reporte, etc.) */}
            <Outlet />
        </div>
      </main>

      {/* Overlay Móvil */}
      {isMobileMenuOpen && (
        <div 
            className="fixed inset-0 bg-slate-900/80 z-40 lg:hidden backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </div>
  );
};