import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';

import { createExpense } from '../api';

export function useCrearGasto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createExpense,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['expenses'] });
      router.back();
    },
  });
}
