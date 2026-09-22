/**
 * Aritmética del balance. Vive fuera de los hooks a propósito: `hooks/` está
 * excluido de la cobertura porque necesita un entorno de render, y esto es
 * suma pura que sí se puede probar en Node. Mismo criterio que `secciones.ts`.
 */

import { groupByMonth, type MonthKey } from '@/shared/lib/date';
import { sumCents } from '@/shared/lib/money';

import type { Income } from './types';

/** Suma de los ingresos vivos del mes local indicado. */
export function ingresosDelMes(
  ingresos: readonly Income[],
  mes: MonthKey,
): number {
  const vivos = ingresos.filter((i) => !i.deletedAt);
  const delMes = groupByMonth(vivos).get(mes) ?? [];
  return sumCents(delMes.map((i) => i.amountCents));
}
