/**
 * Instancias reales de almacenamiento. Único módulo que toca MMKV.
 *
 * Aislarlo aquí mantiene a `supabase.ts` y a la cola de sync libres de
 * dependencias nativas en su superficie pública, y por lo tanto comprobables
 * en Node sin mocks.
 *
 * Este módulo no construye `SyncQueue` ni el caché de gastos: esas clases
 * viven en `features/gastos/store/`, y `shared/` nunca importa de
 * `features/` (Regla 1). Cada feature arma su propia instancia con el
 * `deviceStorage` de aquí.
 */

import { MMKV } from 'react-native-mmkv';

const mmkv = new MMKV({ id: 'sync' });

export const deviceStorage = {
  getString: (key: string) => mmkv.getString(key),
  set: (key: string, value: string) => mmkv.set(key, value),
  delete: (key: string) => mmkv.delete(key),
};

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
