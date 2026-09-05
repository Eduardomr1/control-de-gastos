/**
 * Instancias reales de almacenamiento. Único módulo que toca MMKV.
 *
 * Aislarlo aquí mantiene a `queue.ts` libre de dependencias nativas y, por lo
 * tanto, comprobable en Node sin mocks.
 */

import { MMKV } from 'react-native-mmkv';

import { SyncQueue, type QueueStorage } from './queue';

const mmkv = new MMKV({ id: 'sync' });

export const deviceStorage: QueueStorage = {
  getString: (key) => mmkv.getString(key),
  set: (key, value) => mmkv.set(key, value),
  delete: (key) => mmkv.delete(key),
};

export const syncQueue = new SyncQueue(deviceStorage);
