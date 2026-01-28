import { LogOut, HardHat } from 'lucide-react';

interface InfraHeaderProps {
    userEmail: string;
    onLogout: () => void;
}

export function InfraHeader({ userEmail, onLogout }: InfraHeaderProps) {
    return (
        <header className="bg-slate-900 border-b border-slate-800 text-white px-6 py-4 flex justify-between items-center sticky top-0 z-50 shadow-md">
            <div className="flex items-center gap-4">
                <div className="bg-amber-500 p-2.5 rounded-xl text-slate-900 shadow-lg shadow-amber-500/20">
                    <HardHat size={24} strokeWidth={2.5} />
                </div>
                <div className="flex flex-col">
                    <h1 className="font-bold text-lg tracking-tight leading-none text-slate-100">
                        SOL PONIENTE <span className="font-light text-slate-400">| Infraestructura</span>
                    </h1>
                    <span className="text-xs font-semibold uppercase tracking-wide text-amber-500 mt-1">
                        {userEmail}
                    </span>
                </div>
            </div>

            <button
                onClick={onLogout}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-red-500/10 hover:text-red-400 text-slate-400 transition-all border border-slate-700 hover:border-red-500/30 text-sm font-medium"
            >
                <LogOut size={18} />
                <span className="hidden sm:inline">Cerrar Sesión</span>
            </button>
        </header>
    );
}
