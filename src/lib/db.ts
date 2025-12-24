import Dexie, { Table } from 'dexie';
import type { GreenArea, ServiceLog } from '../types';

export class MaipuVerdeDB extends Dexie {
  greenAreas!: Table<GreenArea, number>;
  logs!: Table<ServiceLog, number>;

  constructor() {
    super('MaipuVerdeDB');
    
    this.version(1).stores({
      // ⚠️ IMPORTANTE: Solo indexamos lo necesario para buscar.
      // NO incluir 'path' aquí, eso causaba el error.
      greenAreas: '++id, code, name, type, neighborhood, current_status', 
      
      logs: '++id, area_id, activity_type, timestamp, synced'
    });
  }
}

export const db = new MaipuVerdeDB();