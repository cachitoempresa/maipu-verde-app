import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { BrandHeader } from './ui/BrandHeader';
import { MapModule } from './MapModule';
import { AttendanceModule } from './AttendanceModule'; 
import { TeamManagement } from './TeamManagement'; 
import { VehicleReportForm } from './VehicleReportForm';
import { ControlCenter } from './ControlCenter'; 
import { 
  ClipboardList, AlertTriangle, X, Megaphone, Map as MapIcon, 
  AlertOctagon, Database, 
  CheckCircle2, Users, UserPlus, Camera,
  LayoutDashboard, ShieldCheck, Inbox, Mail, Activity
} from 'lucide-react';

// --- INTERFACES ---
interface Ticket {
  id: number;
  area: string;
  priority: 'ALTA' | 'MEDIA' | 'BAJA';
  detail: string;
  author: string;
  time: string;
  status: string;
}

interface EmailRequest {
  id: number;
  sender: string;
  description: string;
  created_at: string;
  status: string;
  is_emergency: boolean;
}

interface InventoryRow {
  escanos: number | null;
  basureros: number | null;
  juegos_infantiles: number | null;
}

interface UserData {
  email: string;
  user_metadata?: { full_name?: string };
}

const ADMIN_EMAILS = ['esteban@maipu.cl', 'mjn@maipu.cl', 'admin@maipu.cl', 'salvador@maipu.cl'];

export function DashboardSupervisor({ user, onLogout }: { user: UserData; onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState('RESUMEN'); 
  const [areaCount, setAreaCount] = useState(0); 
  const [dbLoading, setDbLoading] = useState(true);
  const [showMJNAlert, setShowMJNAlert] = useState(false);
  
  const [isAttendanceOpen, setIsAttendanceOpen] = useState(false);
  const [isTeamOpen, setIsTeamOpen] = useState(false);
  const [isVehicleReportOpen, setIsVehicleReportOpen] = useState(false);

  const [filterPriority, setFilterPriority] = useState<'ALTA' | 'MEDIA' | 'BAJA' | null>(null);
  const [infraStats, setInfraStats] = useState({ totalEscanos: 0, totalBasureros: 0, totalJuegos: 0, areasAuditadas: 0 });
  const [tickets] = useState<Ticket[]>(() => JSON.parse(localStorage.getItem('maipu_tickets') || '[]'));
  
  const [emailRequests, setEmailRequests] = useState<EmailRequest[]>([]);
  const [unreadEmails, setUnreadEmails] = useState(0);

  const isAdmin = ADMIN_EMAILS.includes(user.email.toLowerCase());

  const fetchEmailRequests = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('requests')
        .select('*')
        .or('status.eq.PENDIENTE,status.is.null')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) {
        setEmailRequests(data as EmailRequest[]);
        setUnreadEmails(data.length);
      }
    } catch (e) {
      console.error("Error cargando solicitudes:", e);
    }
  }, []);

  const handleMarkAsDone = async (id: number) => {
    try {
      await supabase.from('requests').update({ status: 'GESTIONADO' }).eq('id', id);
      setEmailRequests(prev => prev.filter(r => r.id !== id));
      setUnreadEmails(prev => Math.max(0, prev - 1));
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    const fetchAllData = async () => {
        setDbLoading(true);
        try {
            const { count } = await supabase.from('green_areas').select('*', { count: 'exact', head: true });
            if (count !== null) setAreaCount(count);

            const { data: inv } = await supabase.from('area_inventory').select('escanos, basureros, juegos_infantiles');
            if (inv) {
                let esc = 0, bas = 0, jue = 0;
                (inv as unknown as InventoryRow[]).forEach((item) => {
                    esc += (item.escanos || 0);
                    bas += (item.basureros || 0);
                    jue += (item.juegos_infantiles || 0);
                });
                setInfraStats({ totalEscanos: esc, totalBasureros: bas, totalJuegos: jue, areasAuditadas: inv.length });
            }
            await fetchEmailRequests();
        } catch (e) { console.error(e); } finally { setDbLoading(false); }
    };

    fetchAllData();

    const channel = supabase.channel('requests-realtime').on('postgres_changes', 
        { event: '*', schema: 'public', table: 'requests' }, 
        () => { fetchEmailRequests(); }
    ).subscribe();

    const isAssistant = user.email.toLowerCase().includes('mjn') || user.email.toLowerCase().includes('salvador');
    if (isAssistant) {
      const timer = setTimeout(() => setShowMJNAlert(true), 1500);
      return () => clearTimeout(timer);
    }
    
    return () => { supabase.removeChannel(channel); };
  }, [user.email, fetchEmailRequests]);

  const currentStats = useMemo(() => {
    if (activeTab === 'OPERATIVOS') return [
      { icon: ClipboardList, label: 'Tickets', value: tickets.length.toString(), color: 'text-indigo-600', filter: null },
      { icon: AlertOctagon, label: 'Urgente', value: tickets.filter(t => t.priority === 'ALTA').length.toString(), color: 'text-red-600', filter: 'ALTA' as const },
      { icon: AlertTriangle, label: 'Pendiente', value: tickets.filter(t => t.priority === 'MEDIA').length.toString(), color: 'text-amber-500', filter: 'MEDIA' as const },
      { icon: CheckCircle2, label: 'Cerrado', value: '0', color: 'text-emerald-600', filter: 'BAJA' as const },
    ];
    return [
      { icon: Mail, label: 'Mails ITS', value: unreadEmails.toString(), color: 'text-indigo-600', filter: null },
      { icon: Database, label: 'Áreas', value: dbLoading ? '...' : areaCount.toString(), color: 'text-blue-600', filter: null },
      { icon: Activity, label: 'Escaños', value: infraStats.totalEscanos.toString(), color: 'text-emerald-500', filter: null },
      { icon: ShieldCheck, label: 'Sistema', value: 'OK', color: 'text-slate-400', filter: null },
    ];
  }, [activeTab, tickets, infraStats, areaCount, dbLoading, unreadEmails]);

  const filteredTickets = filterPriority ? tickets.filter(t => t.priority === filterPriority) : tickets;

  // --- EL RETURN DEBE ESTAR DENTRO DE LA FUNCIÓN DashboardSupervisor ---
  return (
    <div className="min-h-screen bg-[#F8FAFC] antialiased text-slate-900 pb-20">
      <BrandHeader user={user} onLogout={onLogout} />

      {isAttendanceOpen && <AttendanceModule userEmail={user.email} onClose={() => setIsAttendanceOpen(false)} />}
      {isTeamOpen && <TeamManagement userEmail={user.email} onClose={() => setIsTeamOpen(false)} />}
      {isVehicleReportOpen && <VehicleReportForm userEmail={user.email} onClose={() => setIsVehicleReportOpen(false)} />}

      {showMJNAlert && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-[9999] animate-in fade-in">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
            <div className="bg-red-600 p-8 text-white flex justify-between items-center">
              <h3 className="font-black text-xl uppercase italic flex items-center gap-3">
                <Megaphone className="animate-bounce" /> Instrucción Supervisor
              </h3>
              <button onClick={() => setShowMJNAlert(false)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>
            <div className="p-8">
              <p className="text-slate-600 font-medium italic mb-6">Se ha recibido una nueva directiva prioritaria. Favor revisar la bandeja de entrada.</p>
              <button onClick={() => setShowMJNAlert(false)} className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-all">
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-6 mt-8 space-y-8">
          <nav className="flex items-center gap-3 overflow-x-auto pb-4 scrollbar-hide">
              <button onClick={() => setActiveTab('RESUMEN')} className={`px-6 py-3 rounded-2xl text-[11px] font-black transition-all whitespace-nowrap ${activeTab === 'RESUMEN' ? 'bg-slate-900 text-white shadow-xl shadow-slate-200' : 'bg-white text-slate-500 hover:border-slate-300 border border-transparent shadow-sm'}`}>RESUMEN</button>
              <button onClick={() => setActiveTab('ITS_MAIL')} className={`px-6 py-3 rounded-2xl text-[11px] font-black transition-all flex items-center gap-2 ${activeTab === 'ITS_MAIL' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' : 'bg-white text-slate-500 shadow-sm'}`}>
                  <Inbox size={14}/> SOLICITUDES MAIL {unreadEmails > 0 && `(${unreadEmails})`}
              </button>
              <button onClick={() => setActiveTab('OPERATIVOS')} className={`px-6 py-3 rounded-2xl text-[11px] font-black transition-all ${activeTab === 'OPERATIVOS' ? 'bg-amber-500 text-white shadow-xl' : 'bg-white text-slate-500 shadow-sm'}`}>OPERATIVOS</button>
              {isAdmin && (
                  <button onClick={() => setActiveTab('CONTROLES')} className={`px-6 py-3 rounded-2xl text-[11px] font-black transition-all flex items-center gap-2 ${activeTab === 'CONTROLES' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' : 'bg-white text-indigo-600 border border-indigo-100 shadow-sm'}`}>
                      <LayoutDashboard size={14}/> CENTRO DE CONTROL
                  </button>
              )}
              <div className="h-6 w-px bg-slate-200 mx-2" />
              <button onClick={() => setIsVehicleReportOpen(true)} className="bg-red-600 text-white px-6 py-3 rounded-2xl text-[11px] font-black flex items-center gap-2 shadow-lg shadow-red-200 transition-all active:scale-95"><Camera size={16}/> REPORTE</button>
              <button onClick={() => setIsAttendanceOpen(true)} className="bg-white text-indigo-600 border border-indigo-100 px-6 py-3 rounded-2xl text-[11px] font-black flex items-center gap-2 shadow-sm"><Users size={16}/> ASISTENCIA</button>
              <button onClick={() => setIsTeamOpen(true)} className="bg-white text-blue-600 border border-blue-100 px-6 py-3 rounded-2xl text-[11px] font-black flex items-center gap-2 shadow-sm"><UserPlus size={16}/> EQUIPO</button>
          </nav>

          {activeTab === 'ITS_MAIL' ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in duration-500">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center px-2">
                        <h3 className="font-black text-slate-400 uppercase tracking-widest text-[10px]">Peticiones desde Email</h3>
                        <button onClick={fetchEmailRequests} className="text-[9px] font-black text-indigo-600 uppercase">Actualizar</button>
                    </div>
                    {emailRequests.map(req => (
                        <div key={req.id} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 hover:shadow-md transition-all group relative">
                            {req.is_emergency && <div className="absolute top-6 right-16 px-2 py-0.5 bg-red-100 text-red-600 text-[8px] font-black rounded-full uppercase">Urgente</div>}
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center font-black text-xs uppercase">
                                        {req.sender ? req.sender[0] : '?'}
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-800 leading-none">{req.sender}</p>
                                        <p className="text-[9px] text-slate-400 mt-1 uppercase font-bold">{new Date(req.created_at).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <button onClick={() => handleMarkAsDone(req.id)} className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all border border-emerald-100">
                                    <CheckCircle2 size={16}/>
                                </button>
                            </div>
                            <h4 className="font-black text-slate-800 text-sm mb-2 italic">Requerimiento ITS</h4>
                            <p className="text-xs text-slate-500 italic bg-slate-50 p-4 rounded-xl border border-slate-100 line-clamp-3">
                                "{req.description}"
                            </p>
                        </div>
                    ))}
                  </div>
                  <div className="bg-indigo-900 rounded-[3rem] p-12 text-white flex flex-col justify-center relative overflow-hidden shadow-2xl">
                      <Mail size={64} className="mb-8 opacity-20"/>
                      <h2 className="text-4xl font-black italic tracking-tighter mb-6 leading-tight">Centralizador</h2>
                      <p className="text-indigo-200 text-sm leading-relaxed max-w-xs">Buzón inteligente sincronizado con Make.com y Supabase.</p>
                      <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
                  </div>
              </div>
          ) : activeTab === 'CONTROLES' ? (
              <ControlCenter />
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {currentStats.map((stat, i) => (
                      <div key={i} onClick={() => stat.filter && setFilterPriority(stat.filter)} className={`p-6 rounded-[2rem] border-2 transition-all h-32 flex flex-col justify-between cursor-pointer bg-white ${filterPriority === stat.filter && stat.filter ? 'border-slate-900 shadow-xl' : 'border-transparent shadow-sm'}`}>
                          <div className={stat.color}><stat.icon size={24} /></div>
                          <div>
                            <span className="text-3xl font-black text-slate-800 tracking-tighter">{stat.value}</span>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{stat.label}</p>
                          </div>
                      </div>
                  ))}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2">
                      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden h-[550px]">
                          <MapModule userRole="Supervisor" tickets={tickets} />
                      </div>
                  </div>
                  <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 h-[550px] overflow-y-auto custom-scrollbar space-y-4">
                      <h3 className="font-black text-slate-800 flex items-center gap-2 uppercase italic text-sm"><MapIcon size={18} className="text-emerald-500"/> Feed Operativo</h3>
                      {filteredTickets.map(t => (
                          <div key={t.id} className="p-5 bg-slate-50 rounded-[1.5rem] border border-transparent hover:border-slate-200 transition-all cursor-pointer">
                              <span className="text-[9px] font-black text-indigo-600 uppercase tracking-tighter">Prioridad {t.priority}</span>
                              <p className="font-black text-slate-800 text-sm leading-tight mt-1">{t.area}</p>
                              <p className="text-xs text-slate-500 mt-2 line-clamp-2 italic">"{t.detail}"</p>
                          </div>
                      ))}
                  </div>
              </div>
            </>
          )}
      </main>
    </div>
  );
}