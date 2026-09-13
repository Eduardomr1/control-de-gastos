import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { groupByMonth, monthKeyOf, nowLocalIso } from '@/shared/lib/date';
import { sumCents } from '@/shared/lib/money';
import { useCategorias } from '@/features/categorias';
import { deleteExpense, fetchExpenses } from '../api';
import type { Category, Expense } from '@/types/expense';

/**
 * Datos y mutaciones de la pantalla de lista. `resultados` se pasa tal cual a
 * `GAsyncGate`: Carga Verdadera — las dos consultas se evalúan en conjunto y
 * la pantalla no renderiza contenido parcial. Ver BUG-006.
 *
 * Las categorías son de otro feature: se piden por su barrel
 * (`@/features/categorias`), nunca por su ruta interna (Regla 2).
 */
export function useGastos() {
  const currentMonth = monthKeyOf(nowLocalIso());
  const queryClient = useQueryClient();

  const expensesQuery = useQuery({
    queryKey: ['expenses', currentMonth],
    queryFn: fetchExpenses,
  });
  const categoriasQuery = useCategorias();
  const resultados = [expensesQuery, categoriasQuery];

  const eliminar = useMutation({
    mutationFn: deleteExpense,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['expenses'] }),
  });

  const expenses = (expensesQuery.data ?? []) as Expense[];
  const categories = (categoriasQuery.data ?? []) as Category[];
  // La consulta de categorías ya se hacía para el gating de carga; aquí se le
  // da uso: la fila muestra el nombre legible en vez del identificador crudo.
  // Sin red, categories queda vacía y el nombre cae al id crudo.
  const categoryNames = new Map(categories.map((c) => [c.id, c.name]));
  const visible = expenses.filter((e) => !e.deletedAt);
  const gastos = groupByMonth(visible).get(currentMonth) ?? [];
  const total = sumCents(gastos.map((e) => e.amountCents));

  return { currentMonth, resultados, gastos, categoryNames, total, eliminar };
}
