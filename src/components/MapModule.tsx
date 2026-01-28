import { useState, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Polygon, Popup, CircleMarker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Hammer, ClipboardList, Camera, Send, Loader2,
  AlertTriangle, CheckCircle2, ArrowLeft, Sprout
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { InfraBottomSheet } from './infra/InfraBottomSheet';
import { PodaBottomSheet } from './poda/PodaBottomSheet';
import { TreeFormModal } from './poda/TreeFormModal';

import { GreenArea } from '../types';

// Props tipadas para evitar errores de severidad 8
interface MapModuleProps {
  areas: GreenArea[];
  userEmail: string;
  mapFilter?: string | null;
  onAreaUpdate: () => void;
  isCatastroMode: boolean;
  onOpenInfra: (area: GreenArea) => void;
  onOpenVehicleReport: (area: GreenArea) => void;
  isInfraProfile?: boolean; // Prop para activar modo Infra
  isPodaProfile?: boolean;  // Prop para activar modo Poda
  onOpenPodaInventory?: (area: GreenArea) => void; // Callback para abrir inventario Poda
  isSelectionMode?: boolean;
  selectedAreaIds?: number[];
  onToggleSelection?: (id: number) => void;
  plannedTasks?: { area_id: number; id: number }[];
  // ITS Support
  onSelectArea?: (area: GreenArea) => void;
  userRole?: string;
}

// Subcomponent for Map Events (Click Handling)
function MapEvents({ isCatastroMode, onMapClick }: { isCatastroMode: boolean, onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      if (isCatastroMode) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

export function MapModule({
  areas = [], userEmail, mapFilter, onAreaUpdate, isCatastroMode, onOpenInfra,
  onOpenVehicleReport, isInfraProfile = false, isPodaProfile = false, onOpenPodaInventory,
  isSelectionMode = false, selectedAreaIds = [], onToggleSelection, plannedTasks = [],
  onSelectArea
}: MapModuleProps) {
  const [popupStep, setPopupStep] = useState<'INITIAL' | 'DETAILS' | 'PRIORITY'>('INITIAL');
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // TREE CENSUS STATE
  const [showTreeModal, setShowTreeModal] = useState(false);
  const [tempCoords, setTempCoords] = useState<{ lat: number, lng: number } | null>(null);
  const [trees, setTrees] = useState<any[]>([]);
  const [activeAreaId, setActiveAreaId] = useState<number | null>(null); // For Tree Census

  // INFRA & PODA STATE: Selected areas for Bottom Sheet
  const [selectedInfraArea, setSelectedInfraArea] = useState<GreenArea | null>(null);
  const [selectedPodaArea, setSelectedPodaArea] = useState<GreenArea | null>(null);

  // LISTADO DE TAREAS SEGÚN PERFIL
  const tasks = ['ASEO', 'RIEGO', 'PODA', 'CORTE']; // Only non-infra tasks needed here now

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'EMERGENCIA': return '#D10000';
      case 'RIEGO': return '#1E40AF';
      case 'PODA': return '#D97706';
      case 'CORTE': return '#10A34F';
      case 'ASEO': return '#475569';
      default: return '#022C22';
    }
  };

  // Fetch Trees on Mount or Area Change
  useEffect(() => {
    fetchTrees();
  }, []); // Reload when needed via onAreaUpdate wrapper?

  const fetchTrees = async () => {
    const { data } = await supabase.from('trees').select('*');
    if (data) setTrees(data);
  };

  const handleMapClick = (lat: number, lng: number) => {
    // Find which area contains this point? Or just use the active one if selected?
    // For now, simple logic: We need an Active Area to link the tree.
    // We can try to match lat/lng to a polygon locally, OR require user to click the Polygon first.

    // Better UX: User clicks "Censar" on the Polygon popup, enabling the mode for THAT area.
    // But user wanted "Pin Drop".
    // Let's assume for now valid clicks happen within known areas.
    // We will look for 1 active area or infer it.

    // Simplification: We need 'activeAreaId' set.
    if (!activeAreaId) {
      // If no area selected, maybe warn?
      // Or let the modal handle generic area assignment if we pass list?
      // Let's try to just open if we have coords.
    }
    setTempCoords({ lat, lng });
    setShowTreeModal(true);
  };

  const handleSubmit = async (
    areaId: number,
    statusOverride?: string,
    descriptionOverride?: string,
    fileOverride?: File | null,
    dateOverride?: string,
    species?: string,
    neighborhood?: string,
    laborCategory?: string,
    photoBefore?: File | null,
    photoAfter?: File | null,
    quantity?: number,
    coords?: { lat: number, lng: number },
    isEmergency: boolean = false,
    planificacionId?: number // Linked Plan ID
  ) => {
    // RESOLVE PLAN ID IF MISSING
    let finalPlanId = planificacionId;
    if (!finalPlanId && isPodaProfile) {
      const found = plannedTasks.find(p => p.area_id === areaId);
      if (found) finalPlanId = found.id;
    }

    const finalStatus = statusOverride || selectedTask;
    // Description and File can come from arguments (Infra/Poda) or State (Standard)
    const finalDesc = descriptionOverride || description;
    // Use photoAfter as the main image if provided, else use fileOverride or state image
    const finalFile = photoAfter || fileOverride || imageFile;

    if (!finalStatus) return;
    setIsSubmitting(true);

    try {
      let imageUrl = null;
      let beforeImageUrl = null;
      const timestamp = Date.now();

      // PODA SPECIFIC PHOTO UPLOAD
      if (isPodaProfile) {
        // ... (existing upload logic kept identical, just collapsed here for brevity in replacement if possible, but strict replace needs full content.
        // Re-using existing upload logic by copying it or trusting the surrounding context if I used a smaller range? 
        // I'll assume I need to keep the file content intact.
        // Actually, the previous VIEW showed lines 91-143. I will keep them.
        const areaObj = areas.find(a => a.id === areaId);
        const areaCode = areaObj?.code || areaId;
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
        const basePath = `poda/${year}/${month}/${areaCode}`;

        // Upload After
        if (finalFile) {
          const fileName = `${basePath}/${areaCode}_${dateStr}_AFTER.jpg`;
          const { data, error } = await supabase.storage.from('fotos-poda').upload(fileName, finalFile, { cacheControl: '3600', upsert: true });
          if (!error && data) {
            const { data: publicUrlData } = supabase.storage.from('fotos-poda').getPublicUrl(fileName);
            imageUrl = publicUrlData.publicUrl;
          }
        }
        // Upload Before
        if (photoBefore) {
          const fileName = `${basePath}/${areaCode}_${dateStr}_BEFORE.jpg`;
          const { data, error } = await supabase.storage.from('fotos-poda').upload(fileName, photoBefore, { cacheControl: '3600', upsert: true });
          if (!error && data) {
            const { data: publicUrlData } = supabase.storage.from('fotos-poda').getPublicUrl(fileName);
            beforeImageUrl = publicUrlData.publicUrl;
          }
        }
      }
      // ... Standard Upload ...
      else {
        if (finalFile) {
          const fileName = `evidence/${areaId}-AFTER-${timestamp}.jpg`;
          await supabase.storage.from('evidence').upload(fileName, finalFile);
          imageUrl = fileName;
        }
        if (photoBefore) {
          const fileName = `evidence/${areaId}-BEFORE-${timestamp}.jpg`;
          await supabase.storage.from('evidence').upload(fileName, photoBefore);
          beforeImageUrl = fileName;
        }
      }

      // Status Update
      if (finalStatus === 'EMERGENCIA' || (!isInfraProfile && !isPodaProfile) || isPodaProfile) {
        let newStatus = finalStatus;
        const isPodaTask = ['Desganche', 'Tala', 'Poda', 'Levante'].includes(finalStatus);
        if (isPodaTask) newStatus = 'PODA';
        if (newStatus === 'OK') newStatus = 'OK';
        const updateData: any = { current_status: newStatus };
        if (finalStatus === 'OK') updateData.route_id = null;
        await supabase.from('green_areas').update(updateData).eq('id', areaId);
      }

      // PODA REGISTRO
      if (isPodaProfile) {
        const podaData = {
          area_id: areaId,
          fecha_poda: dateOverride ? new Date(dateOverride).toISOString() : new Date().toISOString(),
          especie: species || 'No registrada',
          barrio: neighborhood || 'No registrado',
          tipo_labor: finalStatus,
          categoria_labor: laborCategory || 'No registrada',
          cantidad: quantity || 1,
          foto_antes_url: beforeImageUrl,
          foto_despues_url: imageUrl,
          latitud: coords?.lat || null,
          longitud: coords?.lng || null,
          es_emergencia: isEmergency,
          planificacion_id: finalPlanId ? Number(finalPlanId) : null // SAVE LINK (Explicit Number cast)
        };

        let insertError = null;
        const { error: initialError } = await supabase.from('poda_registros').insert([podaData]);

        // Handle Schema Mismatch (Missing Column) - Fallback
        if (initialError && initialError.code === 'PGRST204') {
          console.warn("Column planificacion_id missing. Retrying without it.");
          // Remove the problematic field and retry
          const { planificacion_id, ...fallbackData } = podaData;
          const { error: fallbackError } = await supabase.from('poda_registros').insert([fallbackData]);
          insertError = fallbackError;

          if (!fallbackError) {
            alert("Nota: El registro se guardó, pero no se pudo vincular a la planificación (Falta actualizar Base de Datos).");
          }
        } else {
          insertError = initialError;
        }

        if (insertError) throw insertError;

        // SYNC: Mark Planned Task as REALIZADA
        if (finalPlanId) {
          console.log("Marking Plan as Done:", finalPlanId);
          await supabase.from('planificacion_poda')
            .update({ estado: 'REALIZADA' })
            .eq('id', finalPlanId); // Specific ID
        } else {
          // Fallback: If no ID but matched by area/date (Legacy behavior)
          const today = new Date().toISOString().split('T')[0];
          await supabase.from('planificacion_poda')
            .update({ estado: 'REALIZADA' })
            .eq('area_id', areaId)
            .eq('fecha_programada', today);
        }

        alert("Registro guardado exitosamente");
      } else {
        // INFRA RECORD
        const recordData: any = {
          area_id: areaId,
          activity_type: finalStatus,
          description: finalDesc || `Actividad: ${finalStatus}`,
          operator_email: userEmail,
          image_url: imageUrl,
          timestamp: dateOverride ? new Date(dateOverride).toISOString() : new Date().toISOString()
        };
        if (beforeImageUrl) recordData.before_image_url = beforeImageUrl;
        await supabase.from('maintenance_records').insert([recordData]);
      }

      onAreaUpdate();

      // Reset States
      setPopupStep('INITIAL');
      setImageFile(null);
      setDescription('');
      setSelectedTask(null);
      if (isInfraProfile) setSelectedInfraArea(null);
      if (isPodaProfile) setSelectedPodaArea(null);

    } catch (e) {
      console.error("Error saving log:", e);
      console.error("Error saving log:", e);
      alert("Error al guardar: " + JSON.stringify(e));
    } finally { setIsSubmitting(false); }
  };

  return (
    <div className="w-full h-full relative cursor-default">
      {/* Map Events Handler for Census Mode */}
      <MapContainer
        center={[-33.482, -70.760]}
        zoom={14}
        style={{ height: '100%', width: '100%', cursor: isCatastroMode ? 'crosshair' : 'grab' }}
        zoomControl={false}
        closePopupOnClick={false}
      >
        <TileLayer url="https://mt1.google.com/vt/lyrs=r&x={x}&y={y}&z={z}" />
        <MapEvents isCatastroMode={isCatastroMode} onMapClick={handleMapClick} />

        {/* TREE LAYER */}
        {trees.map((tree) => (
          <CircleMarker
            key={`tree-${tree.id}`}
            center={[tree.lat, tree.lng]}
            radius={4}
            pathOptions={{ color: '#059669', fillColor: '#34D399', fillOpacity: 0.8, weight: 1 }}
          >
            <Popup>
              <div className="text-xs font-sans">
                <strong className="block text-emerald-700">{tree.especie}</strong>
                <span className="text-slate-500">ID: #{tree.id} • {tree.altura}m</span>
              </div>
            </Popup>
          </CircleMarker>
        ))}

        {areas.filter((a) => !mapFilter || a.current_status === mapFilter).map((area) => {
          const isSelected = selectedAreaIds?.includes(area.id);
          const isInfraActive = selectedInfraArea?.id === area.id;
          const isPodaActive = selectedPodaArea?.id === area.id;
          const isActiveForCensus = activeAreaId === area.id; // Highlight active census area

          // Defensive Check
          if (!area.path || !Array.isArray(area.path) || area.path.length === 0) return null;

          return (
            <Polygon
              key={`poly-${area.id}-${area.current_status}-${isSelected}`}
              positions={area.path}
              pathOptions={{
                fillColor: isSelected || isInfraActive || isPodaActive || isActiveForCensus ? '#F59E0B' : (isCatastroMode ? '#2563EB' : (getStatusColor(area.current_status || '') || '#cccccc')),
                fillOpacity: 0.7,
                weight: isSelected || isInfraActive || isPodaActive || isActiveForCensus ? 5 : 1,
                color: isSelected || isInfraActive || isPodaActive || isActiveForCensus ? '#FFFFFF' : 'white',
              }}
              eventHandlers={{
                click: () => {
                  if (isCatastroMode && isPodaProfile) {
                    // ACTIVATE AREA FOR CENSUS
                    setActiveAreaId(area.id);
                    // Don't open popup steps
                  } else if (isSelectionMode && onToggleSelection) {
                    onToggleSelection(area.id);
                  } else if (isInfraProfile) {
                    setSelectedInfraArea(area);
                  } else if (isPodaProfile) {
                    setSelectedPodaArea(area);
                  } else if (onSelectArea) {
                    onSelectArea(area);
                  } else {
                    // STANDARD MODE
                    setPopupStep('INITIAL');
                    setSelectedTask(null);
                    setDescription('');
                  }
                }
              }}
            >
              {/* RENDER POPUP ONLY FOR NON-INFRA & NON-PODA USERS */}
              {!isSelectionMode && !isInfraProfile && !isPodaProfile && !isCatastroMode && (
                <Popup minWidth={300} autoPan={true}>
                  <div className="font-sans" onClick={(e) => e.stopPropagation()}>
                    <div className={`${area.current_status === 'EMERGENCIA' ? 'bg-red-700' : 'bg-[#1E293B]'} p-3 rounded-t-lg flex justify-between items-center text-white`}>
                      <h4 className="font-black uppercase text-[11px] leading-none">{area.name}</h4>
                      <span className={`text-[8px] font-black px-2 py-0.5 rounded-full bg-white/20`}>
                        {area.current_status}
                      </span>
                    </div>

                    <div className="bg-[#0F172A] p-4 rounded-b-lg space-y-4">
                      {popupStep === 'INITIAL' ? (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-2">
                            <button onClick={() => setPopupStep('DETAILS')} className="bg-[#1E293B] text-white p-3 rounded-lg text-[9px] font-black uppercase border border-slate-700 active:scale-95 flex flex-col items-center gap-1">
                              <ClipboardList size={16} className="text-emerald-500" /> Gestionar
                            </button>
                            <button onClick={() => setPopupStep('PRIORITY')} className="bg-red-900/30 text-red-500 p-3 rounded-lg text-[9px] font-black uppercase border border-red-900/50 active:scale-95 flex flex-col items-center gap-1">
                              <AlertTriangle size={16} /> ITS
                            </button>
                            <button onClick={() => onOpenInfra(area)} className="bg-[#1E293B] text-white p-3 rounded-lg text-[9px] font-black uppercase border border-slate-700 active:scale-95 flex flex-col items-center gap-1">
                              <Hammer size={16} className="text-blue-400" /> Infra
                            </button>
                            <button onClick={() => handleSubmit(area.id, 'OK')} className="bg-emerald-900/30 text-emerald-500 p-3 rounded-lg text-[9px] font-black uppercase border border-emerald-900/50 active:scale-95 flex flex-col items-center gap-1">
                              <CheckCircle2 size={16} /> Plaza OK
                            </button>
                          </div>
                          <button onClick={() => onOpenVehicleReport(area)} className="w-full bg-red-600 text-white py-4 rounded-xl font-black uppercase text-xs flex items-center justify-center gap-3 active:scale-95">
                            <Camera size={18} /> Reportar Multa Auto
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-3 animate-in slide-in-from-right-2">
                          <button onClick={() => setPopupStep('INITIAL')} className="text-slate-400 text-[10px] font-bold flex items-center gap-1"><ArrowLeft size={12} /> VOLVER</button>

                          <div className="grid grid-cols-2 gap-1">
                            {tasks.map(t => (
                              <button key={t} onClick={() => setSelectedTask(t)} className={`p-2 rounded text-[8px] font-black transition-all ${selectedTask === t ? 'bg-amber-500 text-slate-900' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}>{t}</button>
                            ))}
                          </div>

                          <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Detalle del trabajo..."
                            className="w-full bg-slate-900 text-white text-[10px] p-2 rounded border border-slate-700 outline-none"
                            rows={3}
                          />

                          <div className="flex flex-col gap-2">
                            <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
                            <button onClick={() => fileInputRef.current?.click()} className={`w-full py-3 rounded-xl text-[9px] font-black uppercase border ${imageFile ? 'bg-emerald-900 text-emerald-500 border-emerald-500' : 'bg-slate-800 text-slate-300 border-slate-700'}`}>
                              <Camera size={14} className="inline mr-2" /> {imageFile ? 'FOTO CARGADA' : 'TOMAR FOTO ACTIVIDAD'}
                            </button>
                          </div>

                          <button
                            disabled={isSubmitting || (popupStep === 'DETAILS' && !selectedTask)}
                            onClick={() => handleSubmit(area.id, popupStep === 'PRIORITY' ? 'EMERGENCIA' : undefined)}
                            className="w-full bg-blue-600 text-white py-4 rounded-xl font-black text-[10px] uppercase shadow-xl flex items-center justify-center gap-2 active:scale-95"
                          >
                            {isSubmitting ? <Loader2 className="animate-spin" size={14} /> : <Send size={14} />}
                            ENVIAR REPORTE
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </Popup>
              )}
            </Polygon>
          );
        })}
      </MapContainer>

      {/* RENDER BOTTOM SHEET FOR INFRA USERS */}
      {isInfraProfile && selectedInfraArea && (
        <InfraBottomSheet
          area={selectedInfraArea}
          onClose={() => setSelectedInfraArea(null)}
          onSubmit={(id, task, desc, file) => handleSubmit(id, task, desc, file)}
          onOpenInfra={onOpenInfra}
        />
      )}

      {/* RENDER BOTTOM SHEET FOR PODA USERS */}
      {isPodaProfile && selectedPodaArea && (
        <PodaBottomSheet
          area={selectedPodaArea}
          onClose={() => setSelectedPodaArea(null)}
          onSubmit={(id, task, desc, file, date, species, neighborhood, laborCategory, photoBefore, photoAfter, quantity) =>
            handleSubmit(id, task, desc, file, date, species, neighborhood, laborCategory, photoBefore, photoAfter, quantity)
          }
          onOpenInventory={(area) => onOpenPodaInventory && onOpenPodaInventory(area)}
        />
      )}

      {/* TREE CENSUS MODAL */}
      {showTreeModal && tempCoords && activeAreaId && (
        <TreeFormModal
          initialLat={tempCoords.lat}
          initialLng={tempCoords.lng}
          areaId={activeAreaId}
          userEmail={userEmail}
          onClose={() => setShowTreeModal(false)}
          onSuccess={() => {
            fetchTrees(); // Refresh Layer
            setShowTreeModal(false);
          }}
        />
      )}

      {/* CENSUS FLOATING NOTICE */}
      {isCatastroMode && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-full shadow-xl z-[1000] flex items-center gap-2 animate-pulse">
          <Sprout size={20} />
          <span className="text-xs font-bold uppercase">{activeAreaId ? 'Modo Censar: Haz Click en el Mapa' : 'Selecciona una Plaza para Censar'}</span>
        </div>
      )}
    </div>
  );
}
