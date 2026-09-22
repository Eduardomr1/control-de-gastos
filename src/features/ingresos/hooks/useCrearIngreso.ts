import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';

import { createIngreso } from '../api/ingresos.local';

export function useCrearIngreso() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createIngreso,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['ingresos'] });
      router.back();
    },
  });
}
