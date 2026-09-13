import { useQuery } from '@tanstack/react-query';

import { fetchCategories } from '../api';

export function useCategorias() {
  return useQuery({ queryKey: ['categories'], queryFn: fetchCategories });
}
