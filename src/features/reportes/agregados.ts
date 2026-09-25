/**
 * Las dos agregaciones que alimentan los reportes.
 *
 * Puras y fuera de los hooks por la misma razón de siempre: `hooks/` está
 * excluido de la cobertura, y un total mal sumado es el peor bug posible en
 * una pantalla cuyo único trabajo es sumar.
 */

import { monthKeyOf, type MonthKey } from '@/shared/lib/date';
import { percentShare, sumCents } from '@/shared/lib/money';
import type { Category, Expense } from '@/types/expense';

export interface TajadaDeCategoria {
  readonly categoryId: string;
  readonly nombre: string;
  readonly color: string;
  readonly totalCents: number;
  /** Porcentaje del total del periodo, 0-100, redondeado al entero. */
  readonly porcentaje: number;
}

export interface BarraDeMes {
  readonly mes: MonthKey;
  readonly totalCents: number;
}

/**
 * Gasto del mes repartido por categoría, de mayor a menor.
 *
 * Ordenado por monto y no por nombre: la pregunta que trae quien abre un
 * reporte es "¿en qué se me fue?", y la respuesta es la primera línea.
 *
 * Los porcentajes pueden no sumar exactamente 100 al redondear cada uno por su
 * cuenta, y por eso la gráfica dibuja los arcos con los MONTOS, no con los
 * porcentajes: el porcentaje es etiqueta, el monto es el dato.
 */
export function porCategoria(
  gastos: readonly Expense[],
  mes: MonthKey,
  categorias: ReadonlyMap<string, Category>,
): TajadaDeCategoria[] {
  const delMes = gastos.filter((g) => !g.deletedAt && monthKeyOf(g.occurredAt) === mes);
  const total = sumCents(delMes.map((g) => g.amountCents));

  const porId = new Map<string, number[]>();
  for (const g of delMes) {
    const bucket = porId.get(g.categoryId);
    if (bucket) bucket.push(g.amountCents);
    else porId.set(g.categoryId, [g.amountCents]);
  }

  return [...porId]
    .map(([categoryId, montos]) => {
      const totalCents = sumCents(montos);
      const categoria = categorias.get(categoryId);
      return {
        categoryId,
        // Sin red el mapa de categorías llega vacío; el id crudo informa más
        // que una tajada sin nombre.
        nombre: categoria?.name ?? categoryId,
        color: categoria?.color ?? '#A855F7',
        totalCents,
        porcentaje: percentShare(totalCents, total),
      };
    })
    .sort((a, b) => b.totalCents - a.totalCents);
}

/**
 * Total gastado por mes, del más antiguo al más reciente, incluyendo los meses
 * sin movimiento.
 *
 * Los huecos se rellenan con cero a propósito: una gráfica que salta de julio
 * a septiembre porque agosto estuvo vacío miente sobre la tendencia. El mes
 * vacío es información.
 */
export function porMes(
  gastos: readonly Expense[],
  hasta: MonthKey,
  meses: number,
): BarraDeMes[] {
  const acumulado = new Map<MonthKey, number[]>();
  for (const g of gastos) {
    if (g.deletedAt) continue;
    const mes = monthKeyOf(g.occurredAt);
    const bucket = acumulado.get(mes);
    if (bucket) bucket.push(g.amountCents);
    else acumulado.set(mes, [g.amountCents]);
  }

  return mesesHaciaAtras(hasta, meses).map((mes) => ({
    mes,
    totalCents: sumCents(acumulado.get(mes) ?? []),
  }));
}

/** Los `n` meses que terminan en `hasta`, en orden cronológico. */
function mesesHaciaAtras(hasta: MonthKey, n: number): MonthKey[] {
  const match = /^(\d{4})-(\d{2})$/.exec(hasta);
  if (!match) return [];
  const anio = Number(match[1]);
  const mes = Number(match[2]);

  return Array.from({ length: n }, (_, i) => {
    const total = anio * 12 + (mes - 1) - (n - 1 - i);
    const a = Math.floor(total / 12);
    const m = (total % 12) + 1;
    return `${a}-${String(m).padStart(2, '0')}`;
  });
}
