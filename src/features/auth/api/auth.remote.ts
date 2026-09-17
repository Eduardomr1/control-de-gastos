/**
 * Sesión de usuario: signIn/signOut. `useSession` (el hook) vive aparte, en
 * `hooks/useSession.ts` — necesita un entorno de render que este proyecto no
 * monta en Node, y separarlo deja este archivo con solo lógica probable al
 * 100%.
 */

import { supabase } from '@/shared/lib/supabase';
import { traducirAuth } from '@/shared/errors';

export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await supabase().auth.signInWithPassword({ email, password });
  if (error) throw traducirAuth(error);
}

/**
 * Cierra sesión y limpia los datos locales.
 *
 * La copia local y la cola son del usuario que sale: dejarlas en disco haría
 * que la siguiente persona en entrar viera gastos ajenos (BUG-013). Antes de
 * borrarlas se intenta enviar lo pendiente, para no perder trabajo por salir.
 *
 * La limpieza en sí (cola + caché) es un detalle interno de gastos, no algo
 * que auth deba conocer; por eso se pide por el barrel del feature, nunca por
 * ruta interna (Regla 2). Ahora que auth es un feature, el lint de la Fase 5
 * vigila justo esto.
 */
export async function signOut(): Promise<void> {
  const { limpiarAlCerrarSesion } = await import('@/features/gastos');
  await limpiarAlCerrarSesion();
  await supabase().auth.signOut();
}
