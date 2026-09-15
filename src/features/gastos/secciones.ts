/**
 * Agrupación de la lista en secciones por mes.
 *
 * Vive fuera del hook a propósito: `hooks/` está excluido de la cobertura
 * porque necesita un entorno de render, y esto es aritmética pura que sí se
 * puede probar en Node. Mismo criterio que `limpiarAlCerrarSesion.ts`.
 */

import { formatMonthKey, groupByMonth, type MonthKey } from '@/shared/lib/date';
import { sumCents } from '@/shared/lib/money';
import type { Expense } from '@/types/expense';

export interface SeccionDeMes {
  readonly mes: MonthKey;
  /** Etiqueta legible, ej. "septiembre 2026". */
  readonly titulo: string;
  readonly subtotal: number;
  /**
   * Cuántas filas hay en las secciones anteriores. El índice que entrega
   * SectionList reinicia en cada sección: sin este desplazamiento, la primera
   * fila de cada mes sería `gasto-0` y el testID dejaría de ser único.
   */
  readonly offset: number;
  readonly data: readonly Expense[];
}

/**
 * Agrupa por mes local, del más reciente al más antiguo, y ordena cada mes con
 * el gasto más reciente arriba. Los registros con `deletedAt` deben filtrarse
 * antes: aquí no se distinguen de los vivos.
 */
export function agruparEnSecciones(gastos: readonly Expense[]): SeccionDeMes[] {
  let offset = 0;

  return [...groupByMonth(gastos).entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([mes, delMes]) => {
      const seccion: SeccionDeMes = {
        mes,
        titulo: formatMonthKey(mes),
        subtotal: sumCents(delMes.map((e) => e.amountCents)),
        offset,
        data: [...delMes].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)),
      };
      offset += delMes.length;
      return seccion;
    });
}
