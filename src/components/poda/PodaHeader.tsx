import { LogOut, Leaf } from 'lucide-react';

interface PodaHeaderProps {
    userEmail: string;
    onLogout: () => void;
}

export function PodaHeader({ userEmail, onLogout }: PodaHeaderProps) {
    return (
        <header className="bg-emerald-600 text-white px-6 py-4 flex justify-between items-center shadow-lg sticky top-0 z-50">
            <div className="flex flex-col">
                <div className="flex items-center gap-2">
                    <Leaf size={20} className="text-emerald-300" />
                    <h1 className="text-xl font-black italic tracking-tighter leading-none">MAIPÚ PODAS</h1>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-80 pl-7">
                    Gestión de Arbolado
                </span>
            </div>

            <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                    <p className="text-[10px] font-bold opacity-70">OPERADOR</p>
                    <p className="text-xs font-bold bg-emerald-700 px-2 py-0.5 rounded-full">{userEmail.split('@')[0]}</p>
                </div>
                <button
                    onClick={onLogout}
                    className="bg-emerald-800 p-2 rounded-xl shadow-md active:scale-95 transition-all text-emerald-100 hover:text-white"
                >
                    <LogOut size={20} />
                </button>
            </div>
        </header>
    );
}
