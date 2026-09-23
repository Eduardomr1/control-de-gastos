import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Alert } from 'react-native';

import type { Expense } from '@/types/expense';

import { createExpense, fetchExpenses } from '../api';

export function useCrearGasto(nombreDeCategoria: (id: string) => string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createExpense,
    onSuccess: async (gasto) => {
      await queryClient.invalidateQueries({ queryKey: ['expenses'] });
      router.back();
      await avisarSiCruzaPresupuesto(gasto, nombreDeCategoria(gasto.categoryId));
    },
  });
}

/**
 * Aviso de presupuesto, después de volver a la lista.
 *
 * Va aquí y no en la pantalla de captura por dos razones. Una: el aviso habla
 * del mes, no del gasto, así que aparecer sobre el formulario que el usuario
 * está a punto de cerrar es el peor momento. Dos: este es el único punto por
 * el que pasa todo gasto registrado a mano, así que la regla no se puede
 * olvidar en una pantalla nueva.
 *
 * `Alert` y no una notificación del sistema: el usuario está mirando la app en
 * este instante. Una notificación que aparece mientras se tiene la pantalla
 * enfrente es ruido que además se queda en el centro de notificaciones. Las
 * notificaciones programadas llegan con los recurrentes (Fase 3), donde sí hay
 * algo que decir con la app cerrada.
 *
 * Nunca hace fallar el guardado: el gasto ya está en disco, y un fallo al
 * calcular el aviso no debe convertirse en un error de guardado a ojos del
 * usuario.
 */
async function avisarSiCruzaPresupuesto(
  gasto: Expense,
  nombreCategoria: string,
): Promise<void> {
  try {
    const { avisoDeUmbral } = await import('@/features/presupuestos');
    const aviso = await avisoDeUmbral(gasto, await fetchExpenses(), nombreCategoria);
    if (aviso) Alert.alert(aviso.titulo, aviso.cuerpo);
  } catch (e) {
    console.error('[presupuestos] no se pudo evaluar el umbral', e);
  }
}
