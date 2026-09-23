/**
 * Aritmética del presupuesto. Todo lo que decide si hay que avisar vive aquí,
 * puro y sin React, por la misma razón que `secciones.ts`: `hooks/` está fuera
 * de la cobertura y esto es justo lo que no puede fallar en silencio.
 */

import { monthKeyOf, type MonthKey } from '@/shared/lib/date';
import { sumCents } from '@/shared/lib/money';
import type { Expense } from '@/types/expense';

import { UMBRALES, type Presupuesto } from './types';

/**
 * El presupuesto que manda para una categoría en un mes.
 *
 * El del mes explícito gana sobre el general; si no hay ninguno, no hay
 * presupuesto y la categoría simplemente no se limita.
 */
export function presupuestoVigente(
  presupuestos: readonly Presupuesto[],
  categoryId: string,
  mes: MonthKey,
): Presupuesto | undefined {
  const deLaCategoria = presupuestos.filter(
    (p) => p.categoryId === categoryId && !p.deletedAt,
  );
  return (
    deLaCategoria.find((p) => p.mesReferencia === mes) ??
    deLaCategoria.find((p) => p.mesReferencia === undefined)
  );
}

/** Gasto acumulado por categoría en el mes indicado, en centavos. */
export function gastoPorCategoria(
  gastos: readonly Expense[],
  mes: MonthKey,
): Map<string, number> {
  const porCategoria = new Map<string, number[]>();
  for (const g of gastos) {
    if (g.deletedAt || monthKeyOf(g.occurredAt) !== mes) continue;
    const bucket = porCategoria.get(g.categoryId);
    if (bucket) bucket.push(g.amountCents);
    else porCategoria.set(g.categoryId, [g.amountCents]);
  }
  return new Map(
    [...porCategoria].map(([categoria, montos]) => [categoria, sumCents(montos)]),
  );
}

/**
 * Fracción del límite ya gastada. Sin topar en 1: la pantalla necesita saber
 * que se rebasó y por cuánto, y es la barra la que se topa al dibujar.
 *
 * Con límite en cero devuelve 0 en vez de dividir: el esquema lo prohíbe con
 * un `check`, pero una fila corrupta no debe dejar la pantalla en NaN.
 */
export function fraccionUsada(gastadoCents: number, limiteCents: number): number {
  return limiteCents <= 0 ? 0 : gastadoCents / limiteCents;
}

/**
 * El umbral más alto que se cruzó al pasar de `antes` a `despues`, o null si
 * ninguno.
 *
 * Compara dos estados y no uno solo, y esa es toda la idea: preguntando "¿ya
 * pasé el 80%?" el aviso saldría en cada gasto posterior al primero que lo
 * cruzó. Preguntando "¿lo crucé con ESTE gasto?" sale una vez.
 *
 * Devuelve el más alto cuando un solo gasto cruza los dos: quien pasa de 10% a
 * 120% de golpe necesita oír "te pasaste", no "vas en 80%".
 */
export function umbralCruzado(
  antesCents: number,
  despuesCents: number,
  limiteCents: number,
): number | null {
  if (limiteCents <= 0) return null;
  const antes = antesCents / limiteCents;
  const despues = despuesCents / limiteCents;
  const cruzados = UMBRALES.filter((u) => antes < u && despues >= u);
  return cruzados.length === 0 ? null : Math.max(...cruzados);
}
