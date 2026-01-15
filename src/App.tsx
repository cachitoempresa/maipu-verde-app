import { useState, useEffect, useCallback } from 'react';
import { supabase } from './lib/supabase';
import { Session } from '@supabase/supabase-js'; 
import { DashboardSupervisor } from './components/DashboardSupervisor';
import { DriverDashboard } from './components/DriverDashboard';
import { Login } from './components/Login';
import { Loader2, TreePine } from 'lucide-react';

const ALJIBE_EMAILS = [
  'aljibe1@maipu.cl', 
  'aljibe2@maipu.cl',
  'riego.maipu@gmail.com'
];


function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Usamos useCallback para que refreshSession sea una referencia estable
  const refreshSession = useCallback(async () => {
    try {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
    } catch (error) {
      console.error('Error al refrescar sesión:', error);
    }
  }, []);

  useEffect(() => {
    // 1. Definimos una función asíncrona interna para inicializar
    const initialize = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        setSession(data.session);
      } catch (error) {
        console.error('Error inicializando sesión:', error);
      } finally {
        // Solo quitamos el loading al terminar la carga inicial
        setLoading(false);
      }
    };

    initialize();

    // 2. Escuchamos cambios en el estado de autenticación
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
    // Definimos el callback de éxito para que simplemente refresque la sesión
    // Ignoramos el argumento 'user' que envía Login.tsx porque Supabase gestiona la sesión globalmente
    return <Login onLoginSuccess={() => refreshSession()} />;
  }

  const userEmail = session.user.email?.toLowerCase() || '';

  // Redirección por Rol (Aljibe vs Supervisor)
  if (ALJIBE_EMAILS.includes(userEmail)) {
    return (
      <DriverDashboard 
        user={{ email: userEmail }} 
        onLogout={handleLogout} 
      />
    );
  }

  return (
    <DashboardSupervisor 
      user={{ 
        email: userEmail,
        user_metadata: session.user.user_metadata // Pasamos metadata por si la necesitas (nombres, etc)
      }} 
      onLogout={handleLogout} 
    />
  );
}

export default App;