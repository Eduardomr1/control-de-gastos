/**
 * Sesión de usuario.
 *
 * supabase-js ya persiste y refresca el token; aquí solo se expone el estado
 * a React. ponytail: sin store propio de auth, la libreria ya es la fuente de
 * verdad y duplicarla es como se desincroniza.
 */

import { useEffect, useState } from 'react';

import { supabase } from './supabase';

export interface SessionState {
  userId: string | null;
  /** True mientras aun no se sabe si hay sesion: evita parpadeo del login. */
  loading: boolean;
}

export function useSession(): SessionState {
  const [state, setState] = useState<SessionState>({ userId: null, loading: true });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setState({ userId: data.session?.user.id ?? null, loading: false });
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({ userId: session?.user.id ?? null, loading: false });
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  return state;
}

export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(traducirError(error.message));
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

/** Los mensajes de Supabase llegan en inglés y no sirven al usuario final. */
function traducirError(message: string): string {
  if (message.includes('Invalid login credentials')) {
    return 'Correo o contraseña incorrectos';
  }
  if (message.includes('Email not confirmed')) {
    return 'La cuenta aún no está confirmada';
  }
  return 'No se pudo iniciar sesión. Revisa tu conexión.';
}
