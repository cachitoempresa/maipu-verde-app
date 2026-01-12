import { useState } from 'react';
import { ArrowLeft, Camera, MapPin, Save, CheckCircle2, AlertCircle } from 'lucide-react';

interface LibroObrasProps {
  user: { name: string; role: string } | null;
  onBack: () => void;
}

export function LibroObras({ user, onBack }: LibroObrasProps) {
  const [activity, setActivity] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  
  // Simulamos ubicación (En una fase posterior usaremos el GPS real del celular)
  const location = "Plaza Los Boteros (Zona 1)";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulamos que estamos enviando los datos a la base de datos
    setTimeout(() => {
      setIsSubmitting(false);
      setSuccess(true);
    }, 1500);
  };

  // VISTA DE ÉXITO (Cuando ya se envió)
  if (success) {
    return (
      <div className="min-h-screen bg-green-50 flex flex-col items-center justify-center p-6 text-center animate-in zoom-in duration-300 font-sans">
        <div className="bg-white p-6 rounded-full shadow-lg mb-6 border-4 border-green-100">
          <CheckCircle2 size={64} className="text-green-600" />
        </div>
        <h2 className="text-2xl font-black text-gray-800 mb-2">¡Reporte Enviado!</h2>
        <p className="text-gray-500 mb-8 max-w-xs mx-auto">El Inspector Fiscal (ITS) ha sido notificado de tu entrada en el Libro de Obras.</p>
        <button 
          onClick={onBack}
          className="bg-green-700 text-white font-bold py-4 px-8 rounded-xl shadow-lg hover:bg-green-800 transition-all active:scale-95 w-full max-w-xs"
        >
          Volver al Dashboard
        </button>
      </div>
    );
  }

  // VISTA FORMULARIO
  return (
    <div className="min-h-screen bg-gray-50 pb-20 font-sans">
      
      {/* HEADER DE NAVEGACIÓN */}
      <div className="bg-white p-4 shadow-sm border-b border-gray-200 sticky top-0 z-20 flex items-center gap-4">
        <button 
          onClick={onBack} 
          className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors active:scale-95"
        >
          <ArrowLeft size={20} className="text-gray-600" />
        </button>
        <div>
          <h1 className="text-lg font-black text-gray-800 uppercase leading-none">Libro de Obras</h1>
          <p className="text-xs text-green-600 font-bold mt-1">Folio Diario #2024-0891</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-4 space-y-6 max-w-lg mx-auto">
        
        {/* 1. FICHA DE CONTEXTO */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-3 text-gray-400">
            <MapPin size={16} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Ubicación Automática</span>
          </div>
          <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 text-blue-800 font-medium text-sm flex justify-between items-center">
            <span>{location}</span>
            <div className="flex items-center gap-1 bg-white px-2 py-1 rounded border border-blue-100">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-[10px] font-bold text-blue-400">GPS OK</span>
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-400 pl-1">
             Responsable: <span className="font-bold text-gray-600">{user?.name}</span>
          </div>
        </div>

        {/* 2. DESCRIPCIÓN */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-gray-400 uppercase ml-1">Descripción de Labores</label>
          <textarea 
            value={activity}
            onChange={(e) => setActivity(e.target.value)}
            className="w-full p-4 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none h-40 text-gray-800 font-medium resize-none shadow-sm placeholder:text-gray-300"
            placeholder="Ej: Se realiza corte de césped en bandejón central y retiro de escombros..."
            required
          />
        </div>

        {/* 3. EVIDENCIA FOTOGRÁFICA */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-gray-400 uppercase ml-1">Evidencia Fotográfica</label>
          <div className="grid grid-cols-3 gap-3">
            {/* Botón Cámara */}
            <button type="button" className="aspect-square bg-gray-100 rounded-2xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:bg-green-50 hover:border-green-300 hover:text-green-600 transition-all active:scale-95">
              <Camera size={24} />
              <span className="text-[10px] font-bold mt-1">FOTO</span>
            </button>
            
            {/* Foto Placeholder 1 */}
            <div className="aspect-square bg-gray-200 rounded-2xl bg-cover bg-center relative overflow-hidden group">
               <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                    <span className="text-[10px] text-white font-bold bg-black/50 px-2 py-1 rounded">Foto 1</span>
               </div>
            </div>
             
             {/* Foto Placeholder 2 (Vacío) */}
             <div className="aspect-square bg-gray-50 rounded-2xl flex items-center justify-center border border-gray-100">
               <span className="text-[10px] text-gray-300 font-bold">Vacío</span>
            </div>
          </div>
          <p className="text-[10px] text-gray-400 text-right flex items-center justify-end gap-1">
            <AlertCircle size={10} />
            Mínimo 2 fotos requeridas por Base Técnica
          </p>
        </div>

        {/* 4. BOTÓN DE ENVÍO FLOTANTE */}
        <div className="h-20"></div> {/* Espaciador */}
        <button 
          type="submit"
          disabled={!activity || isSubmitting}
          className="fixed bottom-6 left-4 right-4 max-w-lg mx-auto bg-green-700 text-white font-bold py-4 rounded-xl shadow-xl hover:bg-green-800 disabled:bg-gray-300 disabled:shadow-none transition-all flex items-center justify-center gap-2 active:scale-95 z-30"
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2 animate-pulse">Guardando...</span>
          ) : (
            <>
              <Save size={20} />
              <span>FIRMAR Y GUARDAR REPORTE</span>
            </>
          )}
        </button>

      </form>
    </div>
  );
}