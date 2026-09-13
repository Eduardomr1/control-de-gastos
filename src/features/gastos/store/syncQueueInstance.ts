/**
 * Instancia real de `SyncQueue`, sobre `deviceStorage` (MMKV). Separado de
 * `syncQueue.ts` a propósito: ese archivo no importa MMKV, para poder probar
 * la clase en Node sin binding nativo. Este sí lo hace, así que solo debe
 * importarse desde código de producción, nunca desde una prueba unitaria de
 * la clase.
 */

import { deviceStorage } from '@/shared/storage/deviceStorage';
import { SyncQueue } from './syncQueue';

export const syncQueue = new SyncQueue(deviceStorage);
