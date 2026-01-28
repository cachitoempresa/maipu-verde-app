import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, ArrowLeft } from 'lucide-react';

import { MapModule } from './MapModule';
import { InventoryForm } from './InventoryForm';

// New Modular Components
import { InfraHeader } from './infra/InfraHeader';
import { InfraOverview } from './infra/InfraOverview';

import { GreenArea, ServiceLog as DbLog } from '../types';

export function DashboardInfra({ user, onLogout }: { user: { email: string }; onLogout: () => void }) {
  const [activeModule, setActiveModule] = useState<string | null>(null);
  const [areas, setAreas] = useState<GreenArea[]>([]);
  const [logs, setLogs] = useState<DbLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInventoryArea, setSelectedInventoryArea] = useState<GreenArea | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [aData, lData, invData] = await Promise.all([
        supabase.from('green_areas').select('*').not('path', 'is', null),
        supabase.from('logs').select('*, green_areas(name, sector)').order('created_at', { ascending: false }).limit(40),
        supabase.from('inventory_items').select('area_id')
      ]);

      const registeredIds = new Set((invData.data || []).map((i: any) => i.area_id));
      if (aData.data) {
        setAreas((aData.data as GreenArea[]).map(a => ({ ...a, has_catastro: registeredIds.has(a.id) })));
      }
      if (lData.data) setLogs(lData.data as DbLog[]);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const technicalLogs = useMemo(() => {
    return logs.filter(l => ['EMERGENCIA', 'GASFITERÍA', 'REPARACIÓN', 'INFRAESTRUCTURA'].includes(l.activity_type));
  }, [logs]);

  const stats = {
    totalAreas: areas.length,
    catastroCount: areas.filter(a => a.has_catastro).length,
    alertCount: technicalLogs.length // Using technical logs as 'Alerts' for now
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-900"><Loader2 className="animate-spin text-amber-500" size={40} /></div>;

  return (
    <div className="h-screen bg-slate-50 flex flex-col font-sans overflow-hidden">
      <InfraHeader userEmail={user.email} onLogout={onLogout} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        {!activeModule ? (
          <div className="flex-1 overflow-y-auto w-full">
            <InfraOverview
              stats={stats}
              recentLogs={logs}
              onNavigate={setActiveModule}
            />
          </div>
        ) : (
          <div className="flex-1 flex flex-col w-full h-full relative">
            {/* Module Helper Header */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-4 z-[40]">
              <button
                onClick={() => setActiveModule(null)}
                className="p-2 -ml-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
              <h2 className="font-bold text-lg text-slate-800 uppercase tracking-tight">
                {activeModule || 'MÓDULO'}
              </h2>
            </div>

            {/* Map Wrapper: pinned absolutely to fill remaining space */}
            <div className="flex-1 relative w-full bg-slate-100">
              <div className="absolute inset-0">
                {activeModule === 'MAPA' && (
                  <MapModule
                    areas={areas}
                    userEmail={user.email}
                    onAreaUpdate={fetchData}
                    isCatastroMode={false}
                    onOpenInfra={(area: GreenArea) => setSelectedInventoryArea(area)}
                    onOpenVehicleReport={() => { }}
                    isInfraProfile={true}
                  />
                )}

                {activeModule === 'CATASTRO' && (
                  <MapModule
                    areas={areas.filter(a => a.has_catastro)}
                    userEmail={user.email}
                    onAreaUpdate={fetchData}
                    isCatastroMode={true}
                    onOpenInfra={(area: GreenArea) => setSelectedInventoryArea(area)}
                    onOpenVehicleReport={() => { }}
                    isInfraProfile={true}
                  />
                )}

                {/* Placeholder views for other modules */}
                {['ACTIVIDAD', 'SOLICITUDES'].includes(activeModule) && (
                  <div className="p-8 max-w-4xl mx-auto overflow-y-auto h-full">
                    <InfraOverview stats={stats} recentLogs={technicalLogs} onNavigate={setActiveModule} />
                    <div className="mt-8 p-4 bg-amber-50 text-amber-800 rounded-lg border border-amber-200">
                      <strong>Nota:</strong> Este módulo se visualiza mejor en el resumen principal.
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {selectedInventoryArea && (
        <InventoryForm
          area={selectedInventoryArea}
          userEmail={user.email}
          onClose={() => setSelectedInventoryArea(null)}
          onSuccess={fetchData}
        />
      )}
    </div>
  );
}
