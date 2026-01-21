import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { 
  User, ChevronRight, Building2, ShieldCheck, 
  Lock, ArrowRight, Loader2, Truck, AlertTriangle, SearchCode 
} from 'lucide-react';

interface LoginUser {
  name: string;
  email: string;
  role: string;
  type: string;
}

interface LoginProps {
  onLoginSuccess: (user: { name: string; email: string; role: string }) => void;
}

const usersList: LoginUser[] = [
    { name: 'Esteban N.', email: 'esteban@maipu.cl', role: 'Supervisor', type: 'supervisor' },
    { name: 'Salvador M.', email: 'salvador@maipu.cl', role: 'Ayudante', type: 'supervisor' },
    { name: 'MJN', email: 'mjn@maipu.cl', role: 'Ayudante', type: 'supervisor' },
    // AGREGADO: Inspector ITS/ITC
    { name: 'Inspector ITS', email: 'its@maipu.cl', role: 'Inspector Técnico', type: 'its' },
    { name: 'Marisol G.', email: 'marisol@maipu.cl', role: 'Capataz', type: 'capataz' },
    { name: 'Rosario M.', email: 'rosario@maipu.cl', role: 'Capataz', type: 'capataz' },
    { name: 'Angelina D.', email: 'angelina@maipu.cl', role: 'Capataz', type: 'capataz' },
    { name: 'Diana E.', email: 'diana@maipu.cl', role: 'Capataz', type: 'capataz' },
    { name: 'Aljibe 1', email: 'aljibe1@maipu.cl', role: 'Conductor Aljibe', type: 'aljibe' },
    { name: 'Aljibe 2', email: 'aljibe2@maipu.cl', role: 'Conductor Aljibe', type: 'aljibe' },
    { name: 'Control Riego', email: 'riego.maipu@gmail.com', role: 'Operador Riego', type: 'aljibe' },
];

export function Login({ onLoginSuccess }: LoginProps) {
  const [selectedUser, setSelectedUser] = useState<LoginUser | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    
    setError('');
    setLoading(true);

    try {
        const { data, error: authError } = await supabase.auth.signInWithPassword({
            email: selectedUser.email,
            password: password,
        });

        if (authError) throw authError;

        if (data.user) {
            onLoginSuccess({
                name: selectedUser.name,
                email: selectedUser.email,
                role: selectedUser.role
            });
        }
    } catch (err) {
        console.error("Error de acceso:", err);
        setError('Contraseña incorrecta. Intente nuevamente.');
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0F172A] relative overflow-hidden font-sans">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#064e3b] to-slate-900 opacity-90"></div>
      
      <div className="w-full max-w-md p-6 relative z-10">
        <div className="flex flex-col items-center mb-8">
           <div className="mb-6 flex items-center justify-center w-32 h-32">
              <img 
                src="/logo-empresa.png" 
                alt="Logo Corporativo" 
                className="w-full h-full object-contain filter brightness-110"
                onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    document.getElementById('login-fallback')?.classList.remove('hidden');
                }}
              />
              <div id="login-fallback" className="hidden text-green-500"><Building2 size={60} /></div>
           </div>
           
           <h1 className="text-3xl font-bold text-white tracking-tight text-center">
             MAIPÚ <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-300">VERDE</span>
           </h1>
        </div>

        <div className="bg-white/95 backdrop-blur-xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/20 relative">
          <div className="px-8 py-5 border-b border-gray-100 bg-white flex items-center gap-3">
            {selectedUser ? (
                 <button onClick={() => { setSelectedUser(null); setPassword(''); setError(''); }} className="text-slate-400 hover:text-slate-600">
                    <ChevronRight size={20} className="rotate-180" />
                 </button>
            ) : <ShieldCheck size={18} className="text-green-600" />}
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">
              {selectedUser ? 'Ingresar Clave' : 'Seleccione Perfil'}
            </h2>
          </div>

          <div className="p-2">
            {!selectedUser ? (
                <div className="max-h-[400px] overflow-y-auto custom-scrollbar p-2 space-y-1">
                    {usersList.map((user) => (
                    <button
                        key={user.email}
                        onClick={() => setSelectedUser(user)}
                        className="w-full px-4 py-4 flex items-center justify-between hover:bg-slate-50 rounded-2xl group transition-all border border-transparent hover:border-slate-100"
                    >
                        <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-sm shadow-sm transition-transform group-hover:scale-105
                            ${user.type === 'supervisor' ? 'bg-slate-800 text-white' : 
                              user.type === 'its' ? 'bg-indigo-600 text-white' :
                              user.type === 'aljibe' ? 'bg-emerald-600 text-white' : 'bg-green-500 text-white'}`}>
                            
                            {/* ÍCONOS SEGÚN TIPO */}
                            {user.type === 'aljibe' ? <Truck size={20}/> : 
                             user.type === 'its' ? <SearchCode size={20}/> :
                             user.type === 'supervisor' ? <User size={20}/> : 
                             user.name.charAt(0)}
                        </div>
                        <div className="text-left">
                            <p className="font-bold text-slate-700 text-sm">{user.name}</p>
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-tighter">{user.role}</p>
                        </div>
                        </div>
                        <ChevronRight size={18} className="text-slate-300 group-hover:text-green-500 transition-colors"/>
                    </button>
                    ))}
                </div>
            ) : (
                <form onSubmit={handleLogin} className="p-6 animate-in fade-in slide-in-from-right-8">
                    <div className="flex items-center gap-4 mb-8 bg-slate-50 p-4 rounded-3xl border border-slate-100">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-white shadow-md
                                ${selectedUser.type === 'supervisor' ? 'bg-slate-800' : 
                                  selectedUser.type === 'its' ? 'bg-indigo-600' : 'bg-green-600'}`}>
                            {selectedUser.name.charAt(0)}
                        </div>
                        <div>
                            <p className="font-black text-slate-800 text-base leading-tight">{selectedUser.name}</p>
                            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-tight">{selectedUser.email}</p>
                        </div>
                    </div>

                    <div className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contraseña de Acceso</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                                <input 
                                    type="password" 
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-green-500 outline-none transition-all font-bold text-slate-800"
                                    autoFocus
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="p-4 bg-red-50 rounded-2xl border border-red-100 text-red-600 text-xs font-bold flex items-center gap-2 animate-pulse">
                                <AlertTriangle size={16}/> {error}
                            </div>
                        )}

                        <button 
                            type="submit"
                            disabled={!password || loading}
                            className="w-full bg-slate-900 hover:bg-black text-white font-black py-5 rounded-2xl flex items-center justify-center gap-3 shadow-xl transition-all active:scale-95 disabled:opacity-50"
                        >
                             {loading ? <Loader2 className="animate-spin" size={20}/> : <>ENTRAR AL SISTEMA <ArrowRight size={20} /></>}
                        </button>
                    </div>
                </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}