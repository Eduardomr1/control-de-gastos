import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { aportar, crearMeta, eliminarMeta, fetchMetas } from '../api/metas.local';

export function useMetas() {
  const query = useQuery({ queryKey: ['metas'], queryFn: fetchMetas });
  return { query, metas: query.data ?? [] };
}

export function useMutacionesDeMetas() {
  const queryClient = useQueryClient();
  const invalidar = () => queryClient.invalidateQueries({ queryKey: ['metas'] });

  return {
    crear: useMutation({ mutationFn: crearMeta, onSuccess: invalidar }),
    aportar: useMutation({
      mutationFn: ({ id, montoCents }: { id: string; montoCents: number }) =>
        aportar(id, montoCents),
      onSuccess: invalidar,
    }),
    eliminar: useMutation({ mutationFn: eliminarMeta, onSuccess: invalidar }),
  };
}
