import { useAuth } from './contexts/AuthContext';
import { DashboardSupervisor } from './components/DashboardSupervisor';
import { DashboardITS } from './components/DashboardITS';
import { DashboardCapataz } from './components/DashboardCapataz';
import { DriverDashboard } from './components/DriverDashboard';
import { DashboardInfra } from './components/DashboardInfra';
import { DashboardPoda } from './components/DashboardPoda';
import { Login } from './components/Login';
import { Loader2 } from 'lucide-react';

export default function App() {
  const { session, profile, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-900">
        <Loader2 className="animate-spin text-emerald-500" size={40} />
      </div>
    );
  }

  if (!session || !profile) {
    return <Login onLoginSuccess={() => { }} />; // Authentication handled by context, but Login might need callback
  }

  // RBAC Routing based on public.profiles role
  switch (profile.role) {
    case 'admin':
    case 'supervisor':
      return <DashboardSupervisor user={{ email: profile.email }} onLogout={signOut} />;

    case 'its':
      return <DashboardITS user={{ email: profile.email }} onLogout={signOut} />;

    case 'infra':
      return <DashboardInfra user={{ email: profile.email }} onLogout={signOut} />;

    case 'poda':
      return <DashboardPoda user={{ email: profile.email }} onLogout={signOut} />;

    case 'capataz':
      return <DashboardCapataz user={{ email: profile.email }} onLogout={signOut} />;

    case 'driver':
    default:
      return <DriverDashboard user={{ email: profile.email }} onLogout={signOut} />;
  }
}