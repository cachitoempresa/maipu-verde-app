// 1. Roles del Personal
export type StaffRole =
  | 'DIRECTOR'
  | 'SUPERVISOR'
  | 'JARDINERO'
  | 'CHOFER'
  | 'ADMINISTRATIVO';

// 2. Tipos de Áreas
export type GreenAreaType = 'PLAZA' | 'BANDEJON' | 'PARQUE' | 'JARDIN' | string;

// 3. Áreas Verdes (Con Estado y Polígonos)
// 3. Áreas Verdes (Con Estado y Polígonos)
// 3. Áreas Verdes (Con Estado y Polígonos)
export interface GreenArea {
  id: number;
  code: string;
  name: string;
  type?: string;
  neighborhood?: string;
  surface_m2?: number;
  path: [number, number][]; // Coordenadas del polígono
  // El semáforo del mapa 👇
  current_status?: 'OK' | 'CORTE' | 'RIEGO' | 'INFRAESTRUCTURA' | 'MULTA' | 'PLANTAS' | string;
  route_id?: number | null;
  has_catastro?: boolean;
  sector?: string;
}

// 4. Bitácora (Unificada)
export interface ServiceLog {
  id?: number;
  area_id: string;
  activity_type: string; // 👈 Importante: No borrar esto
  description: string;
  timestamp: string;
  synced: boolean;
  photo_url?: string; // Lo dejamos listo para cuando agreguemos fotos
}