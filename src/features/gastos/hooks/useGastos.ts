import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { monthKeyOf, nowLocalIso } from '@/shared/lib/date';
import { useCategorias } from '@/features/categorias';
import { useIngresos } from '@/features/ingresos';
import { usePresupuestos } from '@/features/presupuestos';
import { deleteExpense, fetchExpenses } from '../api';
import { agruparEnSecciones } from '../secciones';
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
  // Los ingresos son de otro feature y se piden por su barrel (Regla 2). Su
  // consulta entra a `resultados` para que el balance no se renderice con la
  // mitad de los datos: un balance a medias es un numero equivocado, no un
  // numero incompleto. Ver BUG-006.
  const ingresos = useIngresos();
  const presupuestos = usePresupuestos();
  const resultados = [
    expensesQuery,
    categoriasQuery,
    ingresos.query,
    presupuestos.query,
  ];

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
  // La lista muestra todos los meses; el encabezado, solo el mes en curso.
  const secciones = agruparEnSecciones(expenses.filter((e) => !e.deletedAt));
  const delMes = secciones.find((s) => s.mes === currentMonth);
  const gastos = delMes?.data ?? [];
  const total = delMes?.subtotal ?? 0;

  return {
    currentMonth,
    resultados,
    gastos,
    secciones,
    categorias,
    total,
    ingresosDelMes: ingresos.totalDelMes,
    presupuestos: presupuestos.presupuestos,
    eliminar,
  };
}
