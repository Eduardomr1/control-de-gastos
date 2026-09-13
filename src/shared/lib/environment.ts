/**
 * Bandera de entorno: ¿hay credenciales de Supabase? No es un concepto de
 * ningún feature en particular — auth, categorias y gastos la necesitan por
 * igual para elegir su backend, así que vive en `shared/`.
 */
const hasCredentials = Boolean(
  process.env['EXPO_PUBLIC_SUPABASE_URL'] && process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY'],
);

/** True cuando la app habla con Supabase; false cuando corre en memoria. */
export const isRemote = hasCredentials;
