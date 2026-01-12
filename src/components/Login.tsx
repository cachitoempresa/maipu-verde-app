import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { TreePine, User, Lock, ArrowRight, Loader2 } from 'lucide-react';

// DATOS DE USUARIOS (Roles oficiales según Bases Técnicas)
const USER_GROUPS = [
  {
    title: "SUPERVISIÓN",
    users: [
      
      
      { name: "Esteban M.", role: "Usuario Maipú", email: "esteban@maipu.cl" },
      { name: "MJN", role: "Ayudante", email: "mjn@maipu.cl" },
    ]
  },
  {
    title: "CAPATACES",
    users: [
      { name: "Marisol G.", role: "Capataz", email: "marisol.capataz@maipu.cl" },
      { name: "Rosario M.", role: "Capataz", email: "rosario.capataz@maipu.cl" },
      { name: "Angelina D.", role: "Capataz", email: "angelina.capataz@maipu.cl" },
      { name: "Diana E.", role: "Capataz", email: "diana.capataz@maipu.cl" },
    ]
  },
  {
    title: "INSPECCIÓN Y GERENCIA",
    users: [
      { name: "Inspector Fiscal", role: "ITS Maipú", email: "its@maipu.cl" },
      { name: "Ricardo", role: "Gerencia", email: "ricardo@gerente.cl" },
    ]
  },
  {
    title: "ESPECIALISTAS",
    users: [
      { name: "Juan G.", role: "Infraestructura", email: "juan.infra@maipu.cl" },
      { name: "Salvador M.", role: "Infraestructura", email: "salvador.poda@maipu.cl" },
    ]
  }
];

// Definimos qué propiedades recibe este componente
interface LoginProps {
  onLoginSuccess: (user: { name: string; email: string; role: string }) => void;
}

export function Login({ onLoginSuccess }: LoginProps) {
  const [selectedUser, setSelectedUser] = useState<{name: string, email: string, role: string} | null>(null);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    
    setLoading(true);
    try {
      // 1. Intentamos login con Supabase
      const { error } = await supabase.auth.signInWithPassword({ 
        email: selectedUser.email, 
        password 
      });

      if (error) throw error;

      // 2. SI NO HAY ERROR: Avisamos a la App que entramos con éxito
      onLoginSuccess(selectedUser);

    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      alert("Error de acceso: " + (error as any).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center py-10 px-4 font-sans">
      
      {/* HEADER */}
      <div className="text-center mb-6 animate-in fade-in zoom-in duration-500">
        <div className="inline-block p-4 bg-green-700 rounded-2xl text-white mb-3 shadow-lg shadow-green-700/20">
          <TreePine size={36} />
        </div>
        <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Maipú Zona 1</h1>
        <p className="text-gray-500 text-sm font-medium">Gestión de Áreas Verdes</p>
      </div>

      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
        
        {/* CONDICIONAL: ¿HAY USUARIO SELECCIONADO? */}
        {!selectedUser ? (
          // --- VISTA 1: LISTA DE USUARIOS ---
          <div className="divide-y divide-gray-100 animate-in slide-in-from-left-4 duration-300">
             <div className="bg-gray-50 p-4 text-center border-b border-gray-100">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                  Seleccione su perfil
                </p>
             </div>
            {USER_GROUPS.map((group, groupIdx) => (
              <div key={groupIdx} className="bg-white">
                <div className="bg-gray-50/50 px-4 py-1.5 border-y border-gray-100">
                  <h3 className="text-[10px] font-black text-green-600 uppercase tracking-widest">
                    {group.title}
                  </h3>
                </div>
                <div>
                  {group.users.map((user) => (
                    <button
                      key={user.email}
                      onClick={() => setSelectedUser(user)}
                      className="w-full text-left px-6 py-4 hover:bg-green-50 active:bg-green-100 transition-all flex items-center justify-between group"
                      type="button"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-500 font-bold text-sm group-hover:bg-green-600 group-hover:text-white transition-colors shadow-sm">
                          {user.name.charAt(0)}
                        </div>
                        <div>
                          <span className="block font-bold text-gray-800 text-base group-hover:text-green-900">
                            {user.name}
                          </span>
                          <span className="block text-xs text-gray-400 group-hover:text-green-600 font-medium">
                            {user.role}
                          </span>
                        </div>
                      </div>
                      <ArrowRight size={18} className="text-gray-300 group-hover:text-green-500 transition-transform group-hover:translate-x-1" />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          // --- VISTA 2: FORMULARIO PASSWORD ---
          <div className="p-8 animate-in slide-in-from-right-4 duration-300">
            <button 
              onClick={() => { setSelectedUser(null); setPassword(''); }}
              className="text-xs font-bold text-gray-400 hover:text-green-600 mb-6 flex items-center gap-1 transition-colors uppercase tracking-wide"
              type="button"
            >
              ← Cambiar Usuario
            </button>

            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4 text-green-700 border-4 border-white shadow-md">
                <User size={32} />
              </div>
              <h2 className="text-xl font-bold text-gray-900">{selectedUser.name}</h2>
              <div className="inline-block bg-green-100 px-3 py-1 rounded-full mt-2">
                 <p className="text-xs text-green-800 font-bold uppercase">{selectedUser.role}</p>
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase ml-1">Contraseña</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-3.5 text-gray-400 group-focus-within:text-green-500 transition-colors" size={20} />
                  <input
                    type="password"
                    autoFocus
                    placeholder="••••••"
                    className="w-full pl-12 p-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none focus:bg-white transition-all font-bold text-gray-900 text-lg placeholder:text-gray-300 placeholder:font-normal"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-green-700 text-white font-bold py-4 rounded-xl hover:bg-green-800 active:scale-95 transition-all shadow-lg shadow-green-700/20 mt-2 flex justify-center items-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" /> : 'INGRESAR AL SISTEMA'}
              </button>
            </form>
          </div>
        )}
      </div>
      
      <p className="mt-8 text-[10px] text-gray-400 text-center max-w-xs leading-relaxed">
        Sistema de Gestión Operativa v1.0<br/>
        Licitación ID: 2770-13-LR25
      </p>
    </div>
  );
}