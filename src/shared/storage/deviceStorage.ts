/**
 * Instancias reales de almacenamiento. Único módulo que toca MMKV.
 *
 * Aislarlo aquí mantiene a `queue.ts` y a `supabase.ts` libres de dependencias
 * nativas en su superficie pública, y por lo tanto comprobables en Node sin
 * mocks.
 */

import { MMKV } from 'react-native-mmkv';

import { ExpenseCache, SyncQueue, type QueueStorage } from '@/lib/queue';

const mmkv = new MMKV({ id: 'sync' });

export const deviceStorage: QueueStorage = {
  getString: (key) => mmkv.getString(key),
  set: (key, value) => mmkv.set(key, value),
  delete: (key) => mmkv.delete(key),
};

export const syncQueue = new SyncQueue(deviceStorage);
export const expenseCache = new ExpenseCache(deviceStorage);

/**
 * Almacenamiento de sesión para supabase-js. La escritura es síncrona, así que
 * un cierre forzado de la app no puede dejar el token a medio guardar. Es el
 * mismo motivo por el que la cola de sync usa MMKV en vez de AsyncStorage.
 */
const authMmkv = new MMKV({ id: 'auth' });

export const authStorage = {
  getItem: (key: string) => authMmkv.getString(key) ?? null,
  setItem: (key: string, value: string) => authMmkv.set(key, value),
  removeItem: (key: string) => authMmkv.delete(key),
};
