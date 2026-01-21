import { useState, useEffect, useCallback } from 'react';
import { supabase } from './lib/supabase';
import { Session } from '@supabase/supabase-js'; 
import { DashboardSupervisor } from './components/DashboardSupervisor';
import { DriverDashboard } from './components/DriverDashboard';
import { DashboardCapataz } from './components/DashboardCapataz'; // Nuevo
import { Login } from './components/Login';
import { Loader2, TreePine, ShieldAlert } from 'lucide-react';

// 1. ADMINISTRADORES (Ven el Mapa Completo)
const ADMIN_EMAILS = [
  'mjn@maipu.cl', 
  'esteban@maipu.cl', 
  'salvador@maipu.cl',
  'salvadortapia@maipu.cl'
];

// 2. CAPATACES (Ven la botonera de celular: Riego, Aseo, Poda)
const CAPATAZ_EMAILS = [
  'marisol@maipu.cl', // Agrega aquí el correo real de Marisol
  'capataz2@maipu.cl'
];

// 3. CONDUCTORES (Ven la ruta del Aljibe)
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
        <p className="mt-4 text-slate-500 font-bold text-xs uppercase tracking-widest">Iniciando Maipú Verde...</p>
      </div>
    );
  }

  if (!session) {
    return <Login onLoginSuccess={() => refreshSession()} />;
  }

  const userEmail = session.user.email?.toLowerCase() || '';

  // --- LÓGICA DE DIRECCIONAMIENTO POR CORREO ---

  // A. SI ES ADMIN (Tú o Esteban)
  if (ADMIN_EMAILS.includes(userEmail)) {
    return (
      <DashboardSupervisor 
        user={{ 
          email: userEmail,
          user_metadata: session.user.user_metadata 
        }} 
        onLogout={handleLogout} 
      />
    );
  }

  // B. SI ES CAPATAZ (Marisol) -> VERÁ LA BOTONERA
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

  // D. SI NO ESTÁ EN NINGUNA LISTA
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-10 text-center">
      <ShieldAlert size={60} className="text-red-500 mb-4" />
      <h2 className="text-xl font-black text-slate-800 uppercase italic">Sin Acceso</h2>
      <p className="text-slate-500 text-sm mt-2 max-w-xs">
        Tu correo <b>{userEmail}</b> no tiene un rol asignado. Contacta a MJN o Esteban.
      </p>
      <button onClick={handleLogout} className="mt-8 text-indigo-600 font-black text-xs uppercase underline">Cerrar Sesión</button>
    </div>
  );
}

export default App;