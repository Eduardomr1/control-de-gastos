import type { Failure } from './failures';

/**
 * Único lugar que conoce los códigos crudos de Supabase. Todo lo demás en la
 * app solo ve `Failure`. Si Supabase cambia sus códigos de error, se arregla
 * aquí y en ningún otro sitio.
 */

interface ErrorPostgrest {
  message: string;
  code?: string;
  status?: number;
}

const MENSAJE_SIN_RED = /network request failed|fetch failed|failed to fetch/i;

/** Traduce el error de una llamada a Postgrest (`.select()`, `.rpc()`, ...). */
export function traducirPostgrest(error: ErrorPostgrest): Failure {
  if (MENSAJE_SIN_RED.test(error.message)) return { tipo: 'SinRed' };
  if (error.code === 'PGRST301' || error.status === 401) return { tipo: 'SesionExpirada' };
  if (error.code === '42P01' || (error.status ?? 0) >= 500) {
    return { tipo: 'ServidorNoDisponible', detalleTecnico: error.message };
  }
  return { tipo: 'Desconocido', detalleTecnico: error.message };
}

interface ErrorAuth {
  message: string;
}

/** Traduce el error de `supabase.auth.signInWithPassword()`. */
export function traducirAuth(error: ErrorAuth): Failure {
  if (error.message.includes('Invalid login credentials')) {
    return { tipo: 'DatosInvalidos', motivo: 'credenciales' };
  }
  if (error.message.includes('Email not confirmed')) {
    return { tipo: 'DatosInvalidos', motivo: 'cuenta_no_confirmada' };
  }
  if (MENSAJE_SIN_RED.test(error.message)) return { tipo: 'SinRed' };
  return { tipo: 'Desconocido', detalleTecnico: error.message };
}
