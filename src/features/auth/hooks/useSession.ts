/**
 * Hook de sesión. Necesita un entorno de render de React para probarse
 * (renderHook + jest-expo, que este proyecto no monta) — el mismo motivo por
 * el que useGastos.ts y useCrearGasto.ts quedan fuera de
 * collectCoverageFrom. Se verifica en los flujos de .maestro/, no aquí.
 *
 * supabase-js ya persiste y refresca el token; aquí solo se expone el estado
 * a React. ponytail: sin store propio de auth, la libreria ya es la fuente de
 * verdad y duplicarla es como se desincroniza.
 */

import { useEffect, useState } from 'react';

import { isRemote } from '@/shared/lib/environment';
import { supabase } from '@/shared/lib/supabase';
import type { SessionState } from '../types';

export function useSession(): SessionState {
  // Sin backend no hay sesión que consultar, y `loading` arranca en false: si
  // arrancara en true, AuthGate se quedaría esperando para siempre una
  // respuesta que nadie va a dar. Ver BUG-015.
  const [state, setState] = useState<SessionState>({
    userId: null,
    loading: isRemote,
  });

  useEffect(() => {
    if (!isRemote) return;

    supabase()
      .auth.getSession()
      .then(({ data }) => {
        setState({ userId: data.session?.user.id ?? null, loading: false });
      });

    const { data: sub } = supabase().auth.onAuthStateChange((_event, session) => {
      setState({ userId: session?.user.id ?? null, loading: false });
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  return state;
}
