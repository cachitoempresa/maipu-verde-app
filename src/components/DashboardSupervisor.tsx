import { Users, AlertTriangle, FileText, Truck, Droplets, ArrowRight, ClipboardCheck, LogOut, Sun } from 'lucide-react';

interface DashboardProps {
  user: { name: string; role: string } | null;
  onLogout: () => void;
  // NUEVO: Función opcional para navegar entre pantallas
  onNavigate?: (view: string) => void;
}

export function DashboardSupervisor({ user, onLogout, onNavigate }: DashboardProps) {
  
  // DATOS SIMULADOS
  const kpis = {
    dotacion: { total: 45, presentes: 42 }, 
    multas: { cantidad: 1, monto: "2 UTM", motivo: "Riego Plaza 1-004" },
    requerimientos: 5
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 font-sans">
      
      {/* HEADER */}
      <header className="bg-green-800 text-white p-6 rounded-b-3xl shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10 blur-2xl"></div>

        <div className="flex justify-between items-start relative z-10">
          <div>
            <p className="text-green-200 text-xs font-bold uppercase tracking-wider mb-1">Zona 1 Maipú</p>
            <h1 className="text-2xl font-bold">Hola, {user?.name.split(' ')[0]}</h1>
            <p className="text-green-100 text-sm opacity-90 font-medium">{user?.role}</p>
          </div>
          
          <div className="text-right bg-white/10 px-3 py-2 rounded-xl backdrop-blur-md border border-white/10 flex flex-col items-center">
            <Sun className="text-yellow-300 mb-1" size={20} />
            <span className="block text-lg font-bold">24°C</span>
          </div>
        </div>
        
        {/* ALERTA DE MULTA */}
        {kpis.multas.cantidad > 0 && (
          <div className="mt-6 bg-red-500/90 p-3 rounded-xl flex items-center gap-3 border border-red-400 shadow-lg animate-pulse cursor-pointer hover:bg-red-500 transition-colors">
            <div className="bg-white/20 p-2 rounded-full">
              <AlertTriangle className="text-white shrink-0" size={20} />
            </div>
            <div>
              <p className="font-bold text-sm text-white leading-tight">RIESGO DE MULTA ACTIVO</p>
              <p className="text-xs text-red-100 mt-0.5">{kpis.multas.motivo} ({kpis.multas.monto})</p>
            </div>
          </div>
        )}
      </header>

      <div className="p-4 space-y-5 -mt-2 relative z-10">
        
        {/* KPIS */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-3">
                <div className="bg-blue-50 p-2 rounded-lg text-blue-600">
                  <Users size={18} />
                </div>
                <span className="text-[10px] font-bold uppercase text-gray-400">Dotación</span>
            </div>
            <p className="text-3xl font-black text-gray-800 tracking-tight">{kpis.dotacion.presentes}<span className="text-gray-300 text-xl font-medium">/{kpis.dotacion.total}</span></p>
            <div className="w-full bg-gray-100 h-1.5 rounded-full mt-3 overflow-hidden">
                <div className="bg-blue-500 h-full rounded-full w-[93%]"></div>
            </div>
            <p className="text-[10px] text-gray-400 mt-2 font-medium text-right">93% Asistencia</p>
          </div>

          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-3">
                <div className="bg-orange-50 p-2 rounded-lg text-orange-600">
                  <ClipboardCheck size={18} />
                </div>
                <span className="text-[10px] font-bold uppercase text-gray-400">Solicitudes ITS</span>
            </div>
            <p className="text-3xl font-black text-gray-800 tracking-tight">{kpis.requerimientos}</p>
            <p className="text-xs text-orange-500 font-bold mt-2 bg-orange-50 inline-block px-2 py-1 rounded">2 Urgentes</p>
            <p className="text-[10px] text-gray-400 mt-2">Pendientes de cierre</p>
          </div>
        </div>

        {/* MENÚ DE GESTIÓN */}
        <div>
            <h3 className="text-gray-400 font-bold text-xs uppercase tracking-widest ml-1 mb-3">Gestión Diaria</h3>
            <div className="space-y-3">
                
                {/* BOTÓN LIBRO DE OBRAS - AHORA CON ONCLICK */}
                <button 
                  onClick={() => onNavigate && onNavigate('libro_obras')}
                  className="w-full bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between active:scale-95 transition-all group hover:border-green-500"
                >
                  <div className="flex items-center gap-4">
                      <div className="bg-green-100 p-3 rounded-full text-green-700 group-hover:bg-green-600 group-hover:text-white transition-colors">
                          <FileText size={20} />
                      </div>
                      <div className="text-left">
                          <p className="font-bold text-gray-800 text-sm">Libro de Obras Digital</p>
                          <p className="text-xs text-gray-400">3 firmas pendientes hoy</p>
                      </div>
                  </div>
                  <ArrowRight size={18} className="text-gray-300 group-hover:text-green-500" />
                </button>

                <button className="w-full bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between active:scale-95 transition-all group hover:border-cyan-500">
                  <div className="flex items-center gap-4">
                      <div className="bg-cyan-100 p-3 rounded-full text-cyan-700 group-hover:bg-cyan-600 group-hover:text-white transition-colors">
                          <Droplets size={20} />
                      </div>
                      <div className="text-left">
                          <p className="font-bold text-gray-800 text-sm">Programa de Riego</p>
                          <p className="text-xs text-gray-400">Ver planificación semanal</p>
                      </div>
                  </div>
                  <ArrowRight size={18} className="text-gray-300 group-hover:text-cyan-500" />
                </button>

                <button className="w-full bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between active:scale-95 transition-all group hover:border-purple-500">
                  <div className="flex items-center gap-4">
                      <div className="bg-purple-100 p-3 rounded-full text-purple-700 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                          <Truck size={20} />
                      </div>
                      <div className="text-left">
                          <p className="font-bold text-gray-800 text-sm">Control de Flota GPS</p>
                          <p className="text-xs text-gray-400">1 Camioneta en taller</p>
                      </div>
                  </div>
                  <ArrowRight size={18} className="text-gray-300 group-hover:text-purple-500" />
                </button>
            </div>
        </div>

        {/* BOTÓN SALIR */}
        <button 
            onClick={onLogout} 
            className="w-full mt-4 py-4 text-red-500 font-bold text-sm flex justify-center items-center gap-2 hover:bg-red-50 rounded-xl transition-colors active:scale-95"
        >
            <LogOut size={18} /> 
            Cerrar Sesión Segura
        </button>

      </div>
    </div>
  );
}