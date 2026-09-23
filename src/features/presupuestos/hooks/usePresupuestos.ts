import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { fetchPresupuestos, guardarPresupuesto } from '../api/presupuestos.local';

/**
 * Presupuestos vigentes. Devuelve la consulta cruda además de la lista porque
 * quien la consume la pasa a `GAsyncGate`: una barra de progreso dibujada
 * antes de conocer el límite muestra un porcentaje inventado (BUG-006).
 */
export function usePresupuestos() {
  const query = useQuery({ queryKey: ['presupuestos'], queryFn: fetchPresupuestos });
  return { query, presupuestos: query.data ?? [] };
}

export function useGuardarPresupuesto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: guardarPresupuesto,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['presupuestos'] }),
  });
}
