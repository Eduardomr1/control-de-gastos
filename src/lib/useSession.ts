/**
 * Hook de sesión. Separado de auth.ts (que tiene signIn/signOut, lógica pura
 * y probada) porque este necesita un entorno de render de React para
 * probarse (renderHook + jest-expo, que este proyecto no monta) — el mismo
 * motivo por el que useGastos.ts y useCrearGasto.ts quedan fuera de
 * collectCoverageFrom. Se verifica en los flujos de .maestro/, no aquí.
 *
 * supabase-js ya persiste y refresca el token; aquí solo se expone el estado
 * a React. ponytail: sin store propio de auth, la libreria ya es la fuente de
 * verdad y duplicarla es como se desincroniza.
 */

import { useEffect, useState } from 'react';

import { supabase } from '@/shared/lib/supabase';

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
