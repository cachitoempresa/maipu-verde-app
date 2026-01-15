import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
    Users, Save, Search, Loader2 
} from 'lucide-react';

interface Personnel {
    id: number;
    name: string;
    role: string;
    supervisor_email: string;
}

type AttendanceStatus = 'PRESENTE' | 'AUSENTE' | 'LICENCIA';

interface AttendanceState {
    [key: number]: AttendanceStatus;
}

interface AttendanceModuleProps {
    userEmail: string;
    onClose: () => void;
}

export function AttendanceModule({ userEmail, onClose }: AttendanceModuleProps) {
    const [workers, setWorkers] = useState<Personnel[]>([]);
    const [attendance, setAttendance] = useState<AttendanceState>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        const fetchTeamAndAttendance = async () => {
            setLoading(true);
            try {
                // 1. Traer solo los trabajadores asignados a este capataz (userEmail)
                const { data: teamData, error: teamError } = await supabase
                    .from('personnel')
                    .select('*')
                    .eq('active', true)
                    .eq('supervisor_email', userEmail); // <--- FILTRO CRUCIAL

                if (teamError) throw teamError;

                if (teamData) {
                    setWorkers(teamData);
                    
                    // 2. Buscar si ya se tomó asistencia hoy para ESTE equipo
                    const { data: attData, error: attError } = await supabase
                        .from('attendance')
                        .select('personnel_id, status')
                        .eq('date', date)
                        .eq('supervisor_email', userEmail);
                    
                    if (attError) throw attError;

                    const initialState: AttendanceState = {};
                    if (attData && attData.length > 0) {
                        // Cargar lo que ya se guardó
                        attData.forEach((record) => {
                            initialState[record.personnel_id] = record.status as AttendanceStatus;
                        });
                    } else {
                        // Si es nuevo, poner a todos como PRESENTE por defecto
                        teamData.forEach(w => initialState[w.id] = 'PRESENTE');
                    }
                    setAttendance(initialState);
                }
            } catch (error) {
                console.error("Error cargando equipo:", error);
            } finally {
                setLoading(false);
            }
        };

        if (userEmail) {
            fetchTeamAndAttendance();
        }
    }, [userEmail, date]);

    const toggleStatus = (id: number) => {
        setAttendance(prev => {
            const current = prev[id];
            let next: AttendanceStatus = 'PRESENTE';
            if (current === 'PRESENTE') next = 'AUSENTE';
            else if (current === 'AUSENTE') next = 'LICENCIA';
            return { ...prev, [id]: next };
        });
    };

    const markAllPresent = () => {
        const newState: AttendanceState = {};
        workers.forEach(w => newState[w.id] = 'PRESENTE');
        setAttendance(newState);
    };

    const handleSubmit = async () => {
        if (workers.length === 0) return;
        setSaving(true);

        const recordsToInsert = workers.map(w => ({
            date: date,
            personnel_id: w.id,
            status: attendance[w.id] || 'PRESENTE',
            supervisor_email: userEmail
        }));

        try {
            const { error } = await supabase
                .from('attendance')
                .upsert(recordsToInsert, { onConflict: 'date, personnel_id' });

            if (error) throw error;
            alert(`✅ Asistencia de ${workers.length} personas guardada.`);
            onClose();
        } catch (error) {
            console.error(error);
            alert("Error al guardar asistencia.");
        } finally {
            setSaving(false);
        }
    };

    const filteredWorkers = workers.filter(w => 
        w.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const presentCount = Object.values(attendance).filter(s => s === 'PRESENTE').length;
    const absentCount = Object.values(attendance).filter(s => s === 'AUSENTE').length;

    return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl relative flex flex-col max-h-[90vh] animate-in zoom-in-95 overflow-hidden">
                
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                            <Users className="text-blue-600"/> Asistencia de Mi Cuadrilla
                        </h2>
                        <p className="text-xs text-slate-500">Capataz: {userEmail}</p>
                    </div>
                    <input 
                        type="date" 
                        value={date} 
                        onChange={(e) => setDate(e.target.value)} 
                        className="p-2 border rounded-lg text-sm font-bold bg-white outline-none" 
                    />
                </div>

                <div className="grid grid-cols-3 border-b bg-white font-bold">
                    <div className="p-3 text-center border-r text-slate-500">
                        <span className="block text-xl">{workers.length}</span>
                        <span className="text-[10px] uppercase">En Lista</span>
                    </div>
                    <div className="p-3 text-center border-r bg-green-50 text-green-600">
                        <span className="block text-xl">{presentCount}</span>
                        <span className="text-[10px] uppercase">Presentes</span>
                    </div>
                    <div className="p-3 text-center bg-red-50 text-red-500">
                        <span className="block text-xl">{absentCount}</span>
                        <span className="text-[10px] uppercase">Ausentes</span>
                    </div>
                </div>

                <div className="p-3 flex gap-2 bg-white border-b">
                    <div className="relative flex-1">
                        <Search size={16} className="absolute left-3 top-2.5 text-slate-400"/>
                        <input 
                            type="text" 
                            placeholder="Buscar en mi equipo..." 
                            value={searchTerm} 
                            onChange={(e) => setSearchTerm(e.target.value)} 
                            className="w-full pl-9 pr-3 py-2 bg-slate-100 rounded-lg text-sm outline-none" 
                        />
                    </div>
                    <button 
                        onClick={markAllPresent} 
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors"
                    >
                        Marcar Todos Presentes
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-2 bg-slate-50 space-y-2 custom-scrollbar">
                    {loading ? (
                        <div className="flex justify-center py-10"><Loader2 className="animate-spin text-blue-500"/></div>
                    ) : workers.length === 0 ? (
                        <div className="text-center py-12 text-slate-400">
                            <Users size={40} className="mx-auto mb-2 opacity-20"/>
                            <p className="text-sm font-medium">No hay jardineros asignados a tu cuenta.</p>
                            <p className="text-[10px] uppercase">Usa el botón "Mi Equipo" para agregarlos.</p>
                        </div>
                    ) : (
                        filteredWorkers.map((worker) => (
                            <div 
                                key={worker.id} 
                                onClick={() => toggleStatus(worker.id)} 
                                className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all ${
                                    attendance[worker.id] === 'PRESENTE' 
                                        ? 'bg-white border-green-200' 
                                        : attendance[worker.id] === 'AUSENTE' 
                                            ? 'bg-red-50 border-red-200' 
                                            : 'bg-amber-50 border-amber-200'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600">
                                        {worker.name.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-700">{worker.name}</p>
                                        <p className="text-[10px] text-slate-400 uppercase font-black">{worker.role}</p>
                                    </div>
                                </div>
                                <div className={`text-[10px] font-black uppercase px-2 py-1 rounded-md ${
                                    attendance[worker.id] === 'PRESENTE' ? 'bg-green-100 text-green-700' : 
                                    attendance[worker.id] === 'AUSENTE' ? 'bg-red-100 text-red-700' : 
                                    'bg-amber-100 text-amber-700'
                                }`}>
                                    {attendance[worker.id]}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="p-4 bg-white border-t">
                    <button 
                        onClick={handleSubmit} 
                        disabled={saving || workers.length === 0} 
                        className="w-full bg-slate-900 hover:bg-black text-white font-bold py-3.5 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="animate-spin" size={20}/> : <Save size={20}/>}
                        {saving ? 'Guardando...' : 'Confirmar Asistencia'}
                    </button>
                </div>
            </div>
        </div>
    );
}