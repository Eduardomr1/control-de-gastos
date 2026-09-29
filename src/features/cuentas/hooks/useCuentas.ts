import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  crearCuenta,
  editarCuenta,
  eliminarCuenta,
  fetchCuentas,
} from '../api/cuentas.local';

/**
 * Cuentas del usuario. Devuelve la consulta cruda además de la lista porque
 * quien la consume la pasa a `GAsyncGate`: un saldo dibujado antes de conocer
 * las cuentas es un número equivocado, no uno incompleto (BUG-006).
 */
export function useCuentas() {
  const query = useQuery({ queryKey: ['cuentas'], queryFn: fetchCuentas });
  return { query, cuentas: query.data ?? [] };
}

export function useMutacionesDeCuentas() {
  const queryClient = useQueryClient();
  // Cambiar una cuenta mueve los saldos, y los saldos se calculan sobre
  // gastos e ingresos: las tres consultas se invalidan juntas o el tablero
  // muestra un saldo viejo junto a un movimiento nuevo.
  const invalidar = async () => {
    await queryClient.invalidateQueries({ queryKey: ['cuentas'] });
    await queryClient.invalidateQueries({ queryKey: ['expenses'] });
    await queryClient.invalidateQueries({ queryKey: ['ingresos'] });
  };

  return {
    crear: useMutation({ mutationFn: crearCuenta, onSuccess: invalidar }),
    editar: useMutation({
      mutationFn: ({
        id,
        nombre,
      }: {
        id: string;
        nombre: string;
      }) => editarCuenta(id, { nombre }),
      onSuccess: invalidar,
    }),
    eliminar: useMutation({ mutationFn: eliminarCuenta, onSuccess: invalidar }),
  };
}
