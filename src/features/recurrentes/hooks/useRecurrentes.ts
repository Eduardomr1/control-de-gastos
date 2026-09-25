import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { nowLocalIso } from '@/shared/lib/date';

import { generarPendientes } from '../api/generador';
import {
  alternarActivo,
  crearRecurrente,
  eliminarRecurrente,
  fetchRecurrentes,
} from '../api/recurrentes.local';
import { avisosDeRecurrentes } from '../avisos';

export function useRecurrentes() {
  const query = useQuery({ queryKey: ['recurrentes'], queryFn: fetchRecurrentes });
  return { query, recurrentes: query.data ?? [] };
}

export function useMutacionesDeRecurrentes() {
  const queryClient = useQueryClient();
  const invalidar = () =>
    queryClient.invalidateQueries({ queryKey: ['recurrentes'] });

  return {
    crear: useMutation({
      mutationFn: crearRecurrente,
      /**
       * Genera de inmediato lo que ya vencio en vez de esperar al proximo
       * arranque. Un recurrente que empieza hoy tiene su primer cobro hoy: si
       * la pantalla no muestra nada hasta reiniciar la app, el usuario cree
       * que no se guardo.
       */
      onSuccess: async () => {
        await generarPendientes();
        await invalidar();
        await queryClient.invalidateQueries({ queryKey: ['expenses'] });
        await queryClient.invalidateQueries({ queryKey: ['ingresos'] });
      },
    }),
    alternar: useMutation({
      mutationFn: ({ id, activo }: { id: string; activo: boolean }) =>
        alternarActivo(id, activo),
      onSuccess: invalidar,
    }),
    eliminar: useMutation({ mutationFn: eliminarRecurrente, onSuccess: invalidar }),
  };
}

/**
 * Genera los cobros vencidos y reprograma los recordatorios, una vez por
 * arranque.
 *
 * Al abrir la app y no en segundo plano: iOS no garantiza la ejecución
 * periódica en background, y un job que depende de ella funciona en Android y
 * calla en iOS — la peor de las dos opciones, porque el bug solo aparece en
 * una plataforma.
 *
 * El scheduler entra con `import()` perezoso: un import estático arrastraría
 * expo-notifications a cualquier contexto que monte este hook.
 */
export function useArranqueDeRecurrentes(): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    let cancelado = false;

    void (async () => {
      const { generados } = await generarPendientes();
      if (cancelado) return;

      if (generados > 0) {
        await queryClient.invalidateQueries({ queryKey: ['expenses'] });
        await queryClient.invalidateQueries({ queryKey: ['ingresos'] });
        await queryClient.invalidateQueries({ queryKey: ['recurrentes'] });
      }

      const { reprogramarAvisos } = await import('@/shared/lib/notifications/scheduler');
      await reprogramarAvisos(
        avisosDeRecurrentes(await fetchRecurrentes(), nowLocalIso()),
      );
    })();

    return () => {
      cancelado = true;
    };
  }, [queryClient]);
}
