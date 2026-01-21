import { useState, useEffect, useCallback } from 'react';
import { supabase } from './lib/supabase';
import { Session } from '@supabase/supabase-js'; 
import { DashboardSupervisor } from './components/DashboardSupervisor';
import { DriverDashboard } from './components/DriverDashboard';
import { DashboardCapataz } from './components/DashboardCapataz';
import { Login } from './components/Login';
import { Loader2, TreePine, ShieldAlert } from 'lucide-react';

// 1. ADMINISTRADORES (Ven el Mapa Completo y Gestión Total)
const ADMIN_EMAILS = [
  'mjn@maipu.cl', 
  'esteban@maipu.cl', 
  'salvador@maipu.cl',
  'salvadortapia@maipu.cl'
];

// 2. CAPATACES (Marisol y equipo: Ven Botonera y Mapa Operativo)
const CAPATAZ_EMAILS = [
  'marisol@maipu.cl', 
  'capataz2@maipu.cl'
];

// 3. CONDUCTORES (Aljibe: Ven rutas de riego)
const ALJIBE_EMAILS = [
  'aljibe1@maipu.cl', 
  'aljibe2@maipu.cl',
  'riego.maipu@gmail.com'
];

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    try {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
    } catch (error) {
      console.error('Error al refrescar sesión:', error);
    }
  }, []);

  useEffect(() => {
    const initialize = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        setSession(data.session);
      } catch (error) {
        console.error('Error inicializando sesión:', error);
      } finally {
        setLoading(false);
      }
    };

    initialize();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center">
        <div className="animate-bounce mb-4 text-emerald-600">
          <TreePine size={48} />
        </div>
        <Loader2 className="animate-spin text-slate-400" size={24} />
        <p className="mt-4 text-slate-500 font-black text-[10px] uppercase tracking-[0.3em]">Iniciando Maipú Verde</p>
      </div>
    );
  }

  if (!session) {
    return <Login onLoginSuccess={() => refreshSession()} />;
  }

  const userEmail = session.user.email?.toLowerCase() || '';

  // --- LÓGICA DE DIRECCIONAMIENTO POR ROL ---

  // A. SI ES ADMIN / SUPERVISOR
  if (ADMIN_EMAILS.includes(userEmail)) {
    return (
      <DashboardSupervisor 
        /* FIX: Solo pasamos email para cumplir con la interfaz del componente */
        user={{ email: userEmail }} 
        onLogout={handleLogout} 
      />
    );
  }

  // B. SI ES CAPATAZ (Marisol)
  if (CAPATAZ_EMAILS.includes(userEmail)) {
    return (
      <DashboardCapataz 
        user={{ email: userEmail }} 
        onLogout={handleLogout} 
      />
    );
  }

  // C. SI ES CONDUCTOR (Aljibe)
  if (ALJIBE_EMAILS.includes(userEmail)) {
    return (
      <DriverDashboard 
        user={{ email: userEmail }} 
        onLogout={handleLogout} 
      />
    );
  }

  // D. ACCESO DENEGADO
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-10 text-center">
      <div className="bg-white p-10 rounded-[3rem] shadow-2xl border-t-[12px] border-red-500 max-w-sm">
        <ShieldAlert size={60} className="text-red-500 mx-auto mb-6" />
        <h2 className="text-xl font-black text-slate-800 uppercase italic leading-tight">Acceso Restringido</h2>
        <p className="text-slate-500 text-xs mt-4 font-bold leading-relaxed">
          El correo <span className="text-red-600">{userEmail}</span> no está autorizado para este sistema.
        </p>
        <button 
          onClick={handleLogout} 
          className="mt-8 w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-600 transition-colors"
        >
          Cerrar Sesión
        </button>
      </div>
    </div>
  );
}

export default App;