/**
 * Cliente de Supabase.
 *
 * La sesión se persiste en MMKV en vez de AsyncStorage: la escritura es
 * síncrona, así que un cierre forzado de la app no puede dejar el token a
 * medio guardar. Es el mismo motivo por el que la cola de sync usa MMKV.
 */

import { createClient } from '@supabase/supabase-js';
import { MMKV } from 'react-native-mmkv';

import type { Database } from '@/types/database';

const url = process.env['EXPO_PUBLIC_SUPABASE_URL'];
const anonKey = process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY'];

if (!url || !anonKey) {
  throw new Error(
    'Faltan EXPO_PUBLIC_SUPABASE_URL o EXPO_PUBLIC_SUPABASE_ANON_KEY. ' +
      'Copia .env.example a .env y llena los valores del panel de Supabase.',
  );
}

const storage = new MMKV({ id: 'auth' });

/** Adaptador de almacenamiento que espera supabase-js. */
const mmkvStorage = {
  getItem: (key: string) => storage.getString(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
};

export const supabase = createClient<Database>(url, anonKey, {
  auth: {
    storage: mmkvStorage,
    autoRefreshToken: true,
    persistSession: true,
    // React Native no tiene URL bar: no hay sesión que detectar en la URL.
    detectSessionInUrl: false,
  },
});

export async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

/**
 * Envoltura tipada de `rpc()`.
 *
 * La inferencia genérica de rpc() en supabase-js resuelve el schema a `never`
 * cuando los tipos de la base se escriben a mano, lo que obliga a un cast.
 * Se concentra aquí, en un solo lugar acotado y documentado, en vez de
 * repartirlo por la capa de sincronización: así el resto del código conserva
 * tipos estrictos y este es el único punto a revisar si la librería cambia.
 *
 * La correspondencia entre `Args`/`Returns` y el SQL real está verificada por
 * los tipos de `Database`, que reflejan supabase/migrations/0001_initial.sql.
 */
export async function callRpc<
  Fn extends keyof Database['public']['Functions'],
>(
  fn: Fn,
  args: Database['public']['Functions'][Fn]['Args'],
): Promise<{
  data: Database['public']['Functions'][Fn]['Returns'] | null;
  error: { message: string } | null;
}> {
  const client = supabase as unknown as {
    rpc: (
      name: string,
      args: unknown,
    ) => Promise<{ data: unknown; error: { message: string } | null }>;
  };

  const { data, error } = await client.rpc(fn as string, args);
  return {
    data: (data ?? null) as Database['public']['Functions'][Fn]['Returns'] | null,
    error,
  };
}
