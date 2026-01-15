import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { BrandHeader } from './ui/BrandHeader';
import { MapModule } from './MapModule';
// Se eliminó InventoryStats para corregir el error de "defined but never used"
import { AttendanceModule } from './AttendanceModule'; 
import { TeamManagement } from './TeamManagement'; 
import { VehicleReportForm } from './VehicleReportForm';
import { ControlCenter } from './ControlCenter'; 
import { 
  ClipboardList, AlertTriangle, X, Megaphone, Map, 
  AlertOctagon, FileWarning, Database, 
  CheckCircle2, Trees, Sprout, Users, UserPlus, Camera,
  LayoutDashboard, ShieldCheck
} from 'lucide-react';

interface Ticket {
  id: number;
  area: string;
  priority: 'ALTA' | 'MEDIA' | 'BAJA';
  detail: string;
  author: string;
  time: string;
  status: string;
  category?: string;
}

interface UserData {
  email: string;
  user_metadata?: {
    full_name?: string;
  };
}

interface DashboardProps {
  user: UserData;
  onLogout: () => void;
}

// DEFINICIÓN DE CORREOS CON ACCESO AL CENTRO DE CONTROL
const ADMIN_EMAILS = [
    'esteban@maipu.cl',
    'mjn@maipu.cl',
    'admin@maipu.cl'
];

const getTimeAgo = (isoString: string) => {
    const diff = Date.now() - new Date(isoString).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Ahora';
    if (mins < 60) return `${mins}m`;
    return `${Math.floor(mins / 60)}h`;
};

export function DashboardSupervisor({ user, onLogout }: DashboardProps) {
  const [activeTab, setActiveTab] = useState('RESUMEN'); 
  const [showMJNAlert, setShowMJNAlert] = useState(false);
  const [areaCount, setAreaCount] = useState(0); 
  const [dbLoading, setDbLoading] = useState(true);
  
  const isAdmin = ADMIN_EMAILS.includes(user.email.toLowerCase());

  const [isAttendanceOpen, setIsAttendanceOpen] = useState(false);
  const [isTeamOpen, setIsTeamOpen] = useState(false);
  const [isVehicleReportOpen, setIsVehicleReportOpen] = useState(false);

  const [filterPriority, setFilterPriority] = useState<'ALTA' | 'MEDIA' | 'BAJA' | null>(null);

  const [treeStats, setTreeStats] = useState({
      totalTrees: 0,
      highRiskAreas: 0,
      badHealthAreas: 0,
      auditedAreas: 0
  });

  const [tickets] = useState<Ticket[]>(() => {
    const savedData = localStorage.getItem('maipu_tickets');
    return savedData ? JSON.parse(savedData) : [];
  });

  const urgentTicket = useMemo(() => {
    return tickets.find((t) => t.priority === 'ALTA' || t.priority === 'MEDIA') || null;
  }, [tickets]);

  const filteredTickets = useMemo(() => {
    if (!filterPriority) return tickets;
    return tickets.filter(t => t.priority === filterPriority);
  }, [tickets, filterPriority]);

  useEffect(() => {
    const fetchRealData = async () => {
        try {
            const { count } = await supabase.from('green_areas').select('*', { count: 'exact', head: true });
            if (count !== null) setAreaCount(count);

            const { data: inventory } = await supabase
                .from('area_inventory')
                .select('tree_count, tree_data');

            if (inventory) {
                let total = 0, risk = 0, health = 0, audited = 0;
                inventory.forEach(item => {
                    if (item.tree_count > 0 || item.tree_data) {
                        audited++;
                        total += (item.tree_count || 0);
                        const data = item.tree_data as { risk?: string; health?: string } | null;
                        if (data) {
                            if (data.risk === 'ALTO') risk++;
                            if (data.health === 'ENFERMO' || data.health === 'SECO') health++;
                        }
                    }
                });
                setTreeStats({ totalTrees: total, highRiskAreas: risk, badHealthAreas: health, auditedAreas: audited });
            }
        } catch (e) { console.error("Error stats:", e); } finally { setDbLoading(false); }
    };
    fetchRealData();
  }, []);

  useEffect(() => {
    if (user.email.toLowerCase().includes('mjn')) {
        const timer = setTimeout(() => { setShowMJNAlert(true); }, 500);
        return () => clearTimeout(timer);
    }
  }, [user.email]);

  const handleAreaSelect = (area: { name: string; code?: string }) => {
    console.log("Área seleccionada:", area.name);
  };

  const currentStats = useMemo(() => {
    const censoProgress = areaCount > 0 ? Math.round((treeStats.auditedAreas / areaCount) * 100) : 0;

    switch (activeTab) {
        case 'OPERATIVOS':
            return [
                { icon: ClipboardList, label: 'Pendientes', value: tickets.length.toString(), color: 'text-indigo-600', filter: null },
                { icon: AlertOctagon, label: 'Prioridad Alta', value: tickets.filter(t => t.priority === 'ALTA').length.toString(), color: 'text-red-600', filter: 'ALTA' },
                { icon: AlertTriangle, label: 'Prioridad Media', value: tickets.filter(t => t.priority === 'MEDIA').length.toString(), color: 'text-amber-500', filter: 'MEDIA' },
                { icon: FileWarning, label: 'Prioridad Baja', value: tickets.filter(t => t.priority === 'BAJA').length.toString(), color: 'text-blue-500', filter: 'BAJA' },
            ];
        case 'PODA':
            return [
                { icon: Trees, label: 'Árboles Censo', value: treeStats.totalTrees.toLocaleString(), color: 'text-emerald-600', filter: null },
                { icon: AlertOctagon, label: 'Zonas Riesgo', value: treeStats.highRiskAreas.toString(), color: 'text-red-600', filter: null },
                { icon: Sprout, label: 'Sanidad Crítica', value: treeStats.badHealthAreas.toString(), color: 'text-amber-600', filter: null },
                { icon: CheckCircle2, label: 'Avance', value: `${censoProgress}%`, color: 'text-blue-500', filter: null },
            ];
        default:
            return [
                { icon: AlertTriangle, label: 'Solicitudes ITS', value: tickets.length.toString(), color: 'text-red-500', filter: null },
                { icon: Database, label: 'Total Áreas', value: dbLoading ? '...' : areaCount.toString(), color: 'text-blue-600', filter: null },
            ];
    }
  }, [activeTab, tickets, areaCount, dbLoading, treeStats]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans pb-20 relative antialiased text-slate-900">
      <BrandHeader user={user} onLogout={onLogout} />

      {isAttendanceOpen && <AttendanceModule userEmail={user.email} onClose={() => setIsAttendanceOpen(false)} />}
      {isTeamOpen && <TeamManagement userEmail={user.email} onClose={() => setIsTeamOpen(false)} />}
      {isVehicleReportOpen && <VehicleReportForm userEmail={user.email} onClose={() => setIsVehicleReportOpen(false)} />}

      {showMJNAlert && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] animate-in fade-in duration-300">
              <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden border border-slate-100">
                  <div className={`${urgentTicket ? (urgentTicket.priority === 'ALTA' ? 'bg-red-600' : 'bg-amber-500') : 'bg-slate-900'} p-8 text-white`}>
                      <div className="flex justify-between items-start mb-4">
                          <Megaphone size={32} className="animate-bounce" />
                          <button onClick={() => setShowMJNAlert(false)} className="hover:bg-white/20 p-1 rounded-full transition-colors"><X size={20}/></button>
                      </div>
                      <h3 className="font-black text-2xl uppercase italic tracking-tight leading-none">Instrucción Diaria</h3>
                  </div>
                  <div className="p-8 space-y-6">
                      {urgentTicket ? (
                          <div className="bg-slate-50 p-4 rounded-2xl border-l-4 border-red-500 shadow-sm">
                              <p className="font-bold text-slate-800 text-sm leading-tight">"{urgentTicket.detail}"</p>
                              <p className="text-[10px] text-slate-400 mt-2 font-bold uppercase">{urgentTicket.area}</p>
                          </div>
                      ) : <p className="text-slate-500 text-sm italic text-center">Sin novedades para hoy.</p>}
                      <button onClick={() => setShowMJNAlert(false)} className="w-full bg-slate-900 hover:bg-black text-white font-black py-4 rounded-2xl shadow-lg transition-all uppercase tracking-widest text-xs text-center">Entendido</button>
                  </div>
              </div>
          </div>
      )}

      <main className="max-w-7xl mx-auto px-6 mt-8 space-y-8 relative z-0">
          
          <nav className="flex items-center gap-3 overflow-x-auto pb-4 scrollbar-hide">
              <button onClick={() => setActiveTab('RESUMEN')} className={`px-6 py-3 rounded-2xl text-[11px] font-black transition-all whitespace-nowrap ${activeTab === 'RESUMEN' ? 'bg-slate-900 text-white shadow-xl shadow-slate-200' : 'bg-white text-slate-500 hover:border-slate-300 border border-transparent shadow-sm'}`}>RESUMEN</button>
              
              {isAdmin && (
                  <button onClick={() => setActiveTab('CONTROLES')} className={`px-6 py-3 rounded-2xl text-[11px] font-black transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === 'CONTROLES' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' : 'bg-white text-slate-500 border border-transparent shadow-sm'}`}>
                      <LayoutDashboard size={14}/> CENTRO DE CONTROL
                  </button>
              )}

              <button onClick={() => setActiveTab('OPERATIVOS')} className={`px-6 py-3 rounded-2xl text-[11px] font-black transition-all whitespace-nowrap ${activeTab === 'OPERATIVOS' ? 'bg-amber-500 text-white shadow-xl shadow-amber-100' : 'bg-white text-slate-500 border border-transparent shadow-sm'}`}>OPERATIVOS</button>
              <button onClick={() => setActiveTab('PODA')} className={`px-6 py-3 rounded-2xl text-[11px] font-black transition-all whitespace-nowrap ${activeTab === 'PODA' ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-100' : 'bg-white text-slate-500 border border-transparent shadow-sm'}`}>PODA Y ARBOLADO</button>
              
              <div className="h-6 w-px bg-slate-200 mx-2 hidden sm:block" />
              
              <button onClick={() => setIsVehicleReportOpen(true)} className="flex items-center gap-2 px-6 py-3 rounded-2xl text-[11px] font-black bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-200 transition-all whitespace-nowrap">
                <Camera size={16}/> REPORTE VEHÍCULO
              </button>
              <button onClick={() => setIsAttendanceOpen(true)} className="flex items-center gap-2 px-6 py-3 rounded-2xl text-[11px] font-black bg-white text-indigo-600 hover:bg-indigo-50 border border-indigo-100 transition-all shadow-sm whitespace-nowrap">
                <Users size={16}/> ASISTENCIA
              </button>
              <button onClick={() => setIsTeamOpen(true)} className="flex items-center gap-2 px-6 py-3 rounded-2xl text-[11px] font-black bg-white text-blue-600 hover:bg-blue-50 border border-blue-100 transition-all shadow-sm whitespace-nowrap">
                <UserPlus size={16}/> MI EQUIPO
              </button>
          </nav>

          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {currentStats?.map((stat, index) => (
                      <div 
                        key={index} 
                        onClick={() => stat.filter && setFilterPriority(stat.filter as 'ALTA' | 'MEDIA' | 'BAJA')}
                        className={`p-6 rounded-[2rem] border-2 transition-all group relative overflow-hidden h-32 flex flex-col justify-between cursor-pointer
                            ${filterPriority === stat.filter && stat.filter ? 'bg-white border-slate-900 shadow-xl scale-[1.02]' : 'bg-white border-transparent shadow-sm hover:shadow-md'}
                        `}
                      >
                          <div className={`${stat.color} group-hover:scale-110 transition-transform`}><stat.icon size={24} /></div>
                          <div>
                              <span className="text-3xl font-black text-slate-800 tracking-tighter">{stat.value}</span>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{stat.label}</p>
                          </div>
                          <div className={`absolute -right-4 -top-4 w-16 h-16 rounded-full opacity-[0.03] ${stat.color.replace('text-', 'bg-')}`}></div>
                      </div>
                  ))}
              </div>
          </div>

          {activeTab === 'CONTROLES' && isAdmin ? (
              <ControlCenter />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-4 relative z-20">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="font-black text-slate-800 flex items-center gap-2 tracking-tight text-lg uppercase italic">
                          <Map size={20} className="text-emerald-500"/> Visor Territorial
                        </h3>
                    </div>
                    <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden h-[550px] relative group transition-all hover:shadow-xl">
                        <MapModule onSelectArea={handleAreaSelect} userRole="Supervisor" tickets={tickets} />
                    </div>
                </div>

                <div className="space-y-4 relative z-10">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="font-black text-slate-800 flex items-center gap-2 tracking-tight text-lg uppercase italic">
                          <ClipboardList size={20} className="text-indigo-500"/> Solicitudes
                        </h3>
                        {filterPriority && (
                            <button onClick={() => setFilterPriority(null)} className="text-[10px] font-black text-red-500 bg-red-50 px-3 py-1 rounded-full border border-red-100 animate-pulse transition-all">Limpiar</button>
                        )}
                    </div>
                    <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-4 max-h-[550px] overflow-y-auto custom-scrollbar shadow-inner">
                        {filteredTickets.length === 0 ? (
                            <div className="text-center py-12">
                                <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-200"><CheckCircle2 size={32} /></div>
                                <p className="text-sm font-bold text-slate-400 italic">Sin registros</p>
                            </div>
                        ) : (
                          filteredTickets.map((t) => (
                                <div key={t.id} className="group p-5 bg-slate-50 hover:bg-white hover:shadow-xl rounded-[2rem] transition-all border border-transparent hover:border-slate-100 cursor-pointer">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter ${t.priority === 'ALTA' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                                            PRIORIDAD {t.priority}
                                        </span>
                                        <span className="text-[10px] font-bold text-slate-300 uppercase">{getTimeAgo(t.time)}</span>
                                    </div>
                                    <p className="font-black text-slate-800 text-sm mb-1 leading-tight tracking-tight">{t.area}</p>
                                    <p className="text-xs text-slate-500 leading-relaxed italic line-clamp-2">"{t.detail}"</p>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
          )}
      </main>

      <div className="fixed bottom-4 left-4 z-50">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-md border text-[10px] font-black uppercase tracking-widest ${isAdmin ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-600' : 'bg-slate-500/10 border-slate-500/20 text-slate-600'}`}>
              <ShieldCheck size={14}/>
              {isAdmin ? 'Nivel Supervisor' : 'Nivel Capataz'}
          </div>
      </div>
    </div>
  );
}