import { BrandHeader } from './ui/BrandHeader'; 
import { MapModule } from './MapModule'; 
import { ClipboardList } from 'lucide-react';

interface DashboardProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  user: any; 
  onLogout: () => void;
}

export function DashboardITS({ user, onLogout }: DashboardProps) {

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-10">
      <BrandHeader user={user} onLogout={onLogout} />

      <main className="max-w-7xl mx-auto px-4 mt-6 space-y-6">
          
          {/* Header Simple */}
          <div className="flex items-center justify-between">
              <div>
                  <h2 className="text-2xl font-bold text-slate-800">Panel ITS</h2>
                  <p className="text-sm text-slate-500">Gestión de Solicitudes y Fiscalización</p>
              </div>
              <div className="bg-slate-200 text-slate-600 px-4 py-2 rounded-lg text-xs font-bold border border-slate-300 flex items-center gap-2">
                  <ClipboardList size={16} /> Perfil Externo
              </div>
          </div>

          {/* CONTENEDOR DEL MAPA (Ocupa toda la atención) */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-300 overflow-hidden h-[75vh] relative z-0">
               {/* Pasamos ITS para bloquear catastro y habilitar formulario de solicitudes */}
               <MapModule 
                  userRole="ITS" 
               />
          </div>
          
      </main>
    </div>
  );
}