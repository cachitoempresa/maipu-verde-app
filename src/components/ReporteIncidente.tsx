import { useState } from 'react';
import { ArrowLeft, Camera, MapPin, AlertTriangle, Send, Siren, User } from 'lucide-react';

interface ReporteIncidenteProps {
  user: { name: string; role: string } | null;
  onBack: () => void;
}

export function ReporteIncidente({ user, onBack }: ReporteIncidenteProps) {
  const [descripcion, setDescripcion] = useState('');
  const [tipo, setTipo] = useState('riego'); // riego, arbolado, infraestructura, accidente
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const location = "Av. Pajaritos esq. Chacabuco (Zona 1)";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Simulación de envío a Supabase
    setTimeout(() => {
      setIsSubmitting(false);
      setSuccess(true);
    }, 2000);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-red-50 flex flex-col items-center justify-center p-6 text-center animate-in zoom-in duration-300 font-sans">
        <div className="bg-white p-6 rounded-full shadow-lg mb-6 border-4 border-red-100 animate-pulse">
          <Siren size={64} className="text-red-600" />
        </div>
        <h2 className="text-2xl font-black text-gray-800 mb-2">¡Alerta Enviada!</h2>
        <p className="text-gray-600 mb-8 max-w-xs mx-auto">Se ha notificado a Gerencia y al ITS sobre este incidente crítico.</p>
        <button 
          onClick={onBack}
          className="bg-red-600 text-white font-bold py-4 px-8 rounded-xl shadow-lg hover:bg-red-700 transition-all active:scale-95 w-full max-w-xs"
        >
          Volver al Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-red-50/50 pb-24 font-sans">
      
      {/* HEADER ROJO DE URGENCIA */}
      <div className="bg-red-600 p-4 shadow-md sticky top-0 z-20 flex items-center gap-4 text-white">
        <button onClick={onBack} className="p-2 bg-red-700 rounded-full hover:bg-red-800 transition-colors active:scale-95">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-lg font-black uppercase leading-none flex items-center gap-2">
            <AlertTriangle size={20} className="animate-pulse"/> Reportar Incidente
          </h1>
          <p className="text-xs text-red-200 font-bold mt-1">Urgencia en Terreno</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-4 space-y-5 max-w-lg mx-auto mt-2">
        
        {/* 1. UBICACIÓN Y RESPONSABLE */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-red-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-red-100 p-2 rounded-full text-red-600"><MapPin size={18} /></div>
             <div>
                <p className="text-[10px] font-bold uppercase text-gray-400">Ubicación del Suceso</p>
                <p className="text-sm font-bold text-gray-800">{location}</p>
             </div>
          </div>
          
          {/* AQUÍ USAMOS LA VARIABLE 'user' PARA ELIMINAR EL ERROR */}
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2">
             <User size={14} className="text-gray-400"/>
             <p className="text-xs text-gray-500">
               Responsable: <span className="font-bold text-gray-700">{user?.name}</span> ({user?.role})
             </p>
          </div>
        </div>

        {/* 2. TIPO DE INCIDENTE */}
        <div>
           <label className="block text-xs font-bold text-gray-500 uppercase ml-1 mb-2">Tipo de Problema</label>
           <div className="grid grid-cols-2 gap-2">
              {['riego', 'arbolado', 'infraestructura', 'accidente'].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTipo(t)}
                    className={`p-3 rounded-xl border-2 font-bold text-sm capitalize transition-all ${tipo === t ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 bg-white text-gray-500 hover:border-red-200'}`}
                  >
                    {t}
                  </button>
              ))}
           </div>
        </div>

        {/* 3. DESCRIPCIÓN DEL PROBLEMA */}
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase ml-1 mb-2">Detalle de la Urgencia</label>
          <textarea 
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            className="w-full p-4 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none h-32 text-gray-800 font-medium resize-none shadow-sm placeholder:text-gray-300"
            placeholder="Describa qué pasó, daños visibles, riesgos inmediatos..."
            required
          />
        </div>

        {/* 4. EVIDENCIA FOTOGRÁFICA OBLIGATORIA */}
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase ml-1 mb-2 flex justify-between">
            Fotos del Daño
            <span className="text-red-500 text-[10px]">Obligatorio</span>
          </label>
          <div className="grid grid-cols-3 gap-3">
            <button type="button" className="aspect-square bg-red-50 rounded-2xl border-2 border-dashed border-red-300 flex flex-col items-center justify-center text-red-400 hover:bg-red-100 transition-all active:scale-95">
              <Camera size={28} />
              <span className="text-[10px] font-bold mt-1">AGREGAR</span>
            </button>
             <div className="aspect-square bg-gray-100 rounded-2xl flex items-center justify-center border border-gray-200">
               <span className="text-[10px] text-gray-400 font-bold">Pendiente 1</span>
            </div>
             <div className="aspect-square bg-gray-100 rounded-2xl flex items-center justify-center border border-gray-200">
               <span className="text-[10px] text-gray-400 font-bold">Pendiente 2</span>
            </div>
          </div>
        </div>

        {/* BOTÓN ENVÍO */}
        <button 
          type="submit"
          disabled={!descripcion || isSubmitting}
          className="fixed bottom-6 left-4 right-4 max-w-lg mx-auto bg-red-600 text-white font-bold py-4 rounded-xl shadow-xl hover:bg-red-700 disabled:bg-gray-300 disabled:shadow-none transition-all flex items-center justify-center gap-2 active:scale-95 z-30"
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2 animate-pulse">Enviando Alerta...</span>
          ) : (
            <>
              <Send size={20} />
              <span>ENVIAR REPORTE URGENTE</span>
            </>
          )}
        </button>

      </form>
    </div>
  );
}