import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { formatMonthKey, groupByMonth, monthKeyOf, nowLocalIso } from '@/shared/lib/date';
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
  // da uso: la fila muestra nombre y color en vez del identificador crudo.
  // Sin red, el mapa queda vacío y la fila cae al id.
  const categorias = new Map(categories.map((c) => [c.id, c]));
  const visible = expenses.filter((e) => !e.deletedAt);
  const porMes = groupByMonth(visible);

  // La lista muestra todos los meses; el encabezado, solo el mes en curso.
  // `offset` acumula las filas de las secciones previas: el índice que da
  // SectionList reinicia en cada sección, y sin esto dos filas de meses
  // distintos compartirían el mismo testID.
  let offset = 0;
  const secciones = [...porMes.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([mes, gastosDelMes]) => {
      const seccion = {
        mes,
        titulo: formatMonthKey(mes),
        subtotal: sumCents(gastosDelMes.map((e) => e.amountCents)),
        offset,
        data: [...gastosDelMes].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)),
      };
      offset += gastosDelMes.length;
      return seccion;
    });

  const gastos = porMes.get(currentMonth) ?? [];
  const total = sumCents(gastos.map((e) => e.amountCents));

  return {
    currentMonth,
    resultados,
    gastos,
    secciones,
    categorias,
    total,
    eliminar,
  };
}
