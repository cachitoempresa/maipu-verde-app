import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Users, MapPin, X, Plus, Trash2, 
  CheckCircle2, Sprout, Activity, Search, UserPlus, Fingerprint, User
} from 'lucide-react';

interface Gardener {
  email: string;
  rut: string;
  full_name: string;
  plazas: { id: number; name: string; status: string }[];
}

export function TeamManagement({ onClose }: { userEmail: string; onClose: () => void }) {
  const [team, setTeam] = useState<Gardener[]>([]);
  const [allPlazas, setAllPlazas] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  
  // SOLUCIÓN A ERRORES DE VARIABLE: searchTerm y setSearchTerm aplicados
  const [searchTerm, setSearchTerm] = useState('');
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRut, setNewRut] = useState('');
  const [newEmail, setNewEmail] = useState('');

  const fetchTeamData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: users } = await supabase.from('personnel').select('*').eq('role', 'operator');
      const { data: areas } = await supabase.from('green_areas').select('id, name, current_status, assigned_to');

      if (users && areas) {
        const formattedTeam = users.map(u => ({
          email: u.email,
          rut: u.rut || 'S/R',
          full_name: u.full_name || u.name || u.email.split('@')[0],
          plazas: areas.filter(a => a.assigned_to === u.email).map(a => ({
            id: a.id, name: a.name, status: a.current_status
          }))
        }));
        setTeam(formattedTeam);
        setAllPlazas(areas.map(a => ({ id: a.id, name: a.name })));
      }
    } catch (error) { console.error("Error cargando equipo:", error); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchTeamData(); }, [fetchTeamData]);

  const handleAddGardener = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newRut) return;

    const { error } = await supabase.from('personnel').insert([
      { 
        full_name: newName, 
        rut: newRut.trim(),
        email: newEmail.toLowerCase().trim() || `${newRut.replace(/[^0-9kK]/g, '')}@maipu.cl`,
        role: 'operator' 
      }
    ]);

    if (!error) {
      setNewName(''); setNewRut(''); setNewEmail('');
      setShowAddForm(false);
      fetchTeamData();
    } else {
      alert("Error al registrar: El RUT o Email ya existe.");
    }
  };

  const assignPlazaToGardener = async (plazaId: number, email: string) => {
    await supabase.from('green_areas').update({ assigned_to: email }).eq('id', plazaId);
    fetchTeamData();
  };

  const unassignPlaza = async (plazaId: number) => {
    await supabase.from('green_areas').update({ assigned_to: null }).eq('id', plazaId);
    fetchTeamData();
  };

  // SOLUCIÓN: Filtrado dinámico usando searchTerm
  const filteredTeam = team.filter(member => 
    member.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    member.rut.includes(searchTerm)
  );

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-4 z-[9999] animate-in fade-in">
      <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col border border-white/20">
        
        {/* Header */}
        <div className="p-8 bg-slate-900 text-white flex justify-between items-center relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="text-2xl font-black flex items-center gap-3 uppercase italic">
              <Users className="text-indigo-400" /> Registro de Equipo
            </h3>
            <div className="flex gap-2 mt-3">
               <button 
                onClick={() => setShowAddForm(!showAddForm)}
                className="bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-black px-4 py-2 rounded-xl flex items-center gap-2 transition-all shadow-lg"
              >
                {showAddForm ? <X size={14}/> : <UserPlus size={14}/>}
                {showAddForm ? 'CERRAR' : 'AGREGAR JARDINERO'}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4 relative z-10">
            {/* SOLUCIÓN: Uso del icono Search y la variable setSearchTerm */}
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14}/>
              <input 
                type="text" 
                placeholder="Buscar por Nombre o RUT..."
                className="bg-white/10 border-none rounded-xl py-2 pl-9 pr-4 text-xs font-bold text-white placeholder:text-slate-500 w-64 focus:ring-2 focus:ring-indigo-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button onClick={onClose} className="p-3 bg-white/10 rounded-full hover:bg-red-500 transition-all"><X size={20}/></button>
          </div>
        </div>

        {/* Formulario de Alta */}
        {showAddForm && (
          <div className="bg-indigo-600 p-6 animate-in slide-in-from-top duration-300">
            <form onSubmit={handleAddGardener} className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={16}/>
                <input 
                  type="text" placeholder="NOMBRE COMPLETO" 
                  className="w-full bg-white/10 border-2 border-white/10 rounded-2xl py-3 pl-11 pr-4 text-white placeholder:text-white/40 font-bold text-xs outline-none focus:border-white/30"
                  value={newName} onChange={(e) => setNewName(e.target.value)}
                />
              </div>
              <div className="relative">
                <Fingerprint className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={16}/>
                <input 
                  type="text" placeholder="RUT" 
                  className="w-full bg-white/10 border-2 border-white/10 rounded-2xl py-3 pl-11 pr-4 text-white placeholder:text-white/40 font-bold text-xs outline-none focus:border-white/30"
                  value={newRut} onChange={(e) => setNewRut(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <input 
                  type="email" placeholder="EMAIL (OPCIONAL)" 
                  className="flex-1 bg-white/10 border-2 border-white/10 rounded-2xl py-3 px-4 text-white placeholder:text-white/40 font-bold text-xs outline-none focus:border-white/30"
                  value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
                />
                <button type="submit" className="bg-white text-indigo-600 px-6 rounded-2xl font-black text-[10px] uppercase hover:bg-emerald-400 hover:text-white transition-all">
                  Registrar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Lista de Personal */}
        <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Activity className="animate-spin text-indigo-600" size={40} />
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Sincronizando Personal...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTeam.map((member) => (
                <div key={member.email} className="bg-white rounded-[2.5rem] p-6 border border-slate-100 shadow-sm flex flex-col group hover:shadow-xl transition-all duration-300">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-black text-2xl shadow-lg">
                      {member.full_name[0].toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-black text-slate-800 uppercase text-sm flex items-center gap-2">
                        {member.full_name} <CheckCircle2 size={14} className="text-emerald-500" />
                      </h4>
                      <p className="text-[10px] text-slate-400 font-black uppercase flex items-center gap-1">
                        <Fingerprint size={10} /> {member.rut}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {/* SOLUCIÓN: Uso del icono Sprout */}
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1 px-1">
                      <Sprout size={10} className="text-emerald-500" /> Plazas Asignadas ({member.plazas.length})
                    </p>
                    <div className="space-y-2 min-h-[60px]">
                      {member.plazas.map(plaza => (
                        <div key={plaza.id} className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-100 group/item hover:bg-white transition-all">
                          <div className="flex items-center gap-2">
                            <MapPin size={12} className="text-indigo-500" />
                            <span className="text-[11px] font-black text-slate-700">{plaza.name}</span>
                          </div>
                          <button onClick={() => unassignPlaza(plaza.id)} className="text-slate-300 hover:text-red-500 transition-colors p-1">
                            <Trash2 size={14}/>
                          </button>
                        </div>
                      ))}
                    </div>
                    
                    <div className="pt-4 border-t border-slate-100">
                      <div className="relative group/select">
                        <Plus size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-500 pointer-events-none" />
                        <select 
                          onChange={(e) => assignPlazaToGardener(Number(e.target.value), member.email)}
                          className="w-full bg-slate-100/50 border-none rounded-2xl text-[10px] font-black text-indigo-600 py-3 pl-9 pr-4 appearance-none outline-none cursor-pointer hover:bg-indigo-50 transition-all"
                          value=""
                        >
                          <option value="">+ VINCULAR OTRA AAVV</option>
                          {allPlazas.filter(p => !member.plazas.find(mp => mp.id === p.id)).map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}