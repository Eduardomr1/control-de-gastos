/**
 * Convierte gastos e ingresos en filas exportables, filtrados por rango.
 *
 * Puro y probado: el filtro de rango y la resolución de nombres son lo único
 * que puede hacer que un export salga con movimientos de más, de menos, o con
 * identificadores crudos donde debería ir el nombre de la categoría.
 */

import type { FilaExportable } from '@/shared/lib/exporters/filas';
import { comparaInstantes, type MonthKey } from '@/shared/lib/date';
import type { Category, Expense } from '@/types/expense';

/** Lo mínimo que este módulo necesita de un ingreso. */
export interface IngresoExportable {
  readonly amountCents: number;
  readonly fuente: string;
  readonly occurredAt: string;
  readonly note?: string;
  readonly cuentaId?: string;
  readonly deletedAt?: string;
}

export interface RangoDeExportacion {
  /** `YYYY-MM-DD`, inclusive. */
  readonly desde: string;
  /** `YYYY-MM-DD`, inclusive: el día entero cuenta, no hasta su medianoche. */
  readonly hasta: string;
}

/**
 * Ordenadas por fecha, de la más antigua a la más reciente.
 *
 * Al revés que la lista de la app, que muestra lo último arriba: un export se
 * abre en una hoja de cálculo y se lee como un estado de cuenta, de principio
 * a fin.
 */
export function filasExportables(
  gastos: readonly Expense[],
  ingresos: readonly IngresoExportable[],
  categorias: ReadonlyMap<string, Category>,
  cuentas: ReadonlyMap<string, string>,
  rango: RangoDeExportacion,
): FilaExportable[] {
  const deGastos = gastos
    .filter((g) => !g.deletedAt && dentroDelRango(g.occurredAt, rango))
    .map<FilaExportable>((g) => ({
      fecha: g.occurredAt,
      tipo: 'Gasto',
      // Sin red el catálogo llega vacío; el id crudo informa más que un hueco.
      concepto: categorias.get(g.categoryId)?.name ?? g.categoryId,
      cuenta: nombreDeCuenta(cuentas, g.cuentaId),
      montoCents: g.amountCents,
      ...(g.note === undefined ? {} : { nota: g.note }),
    }));

  const deIngresos = ingresos
    .filter((i) => !i.deletedAt && dentroDelRango(i.occurredAt, rango))
    .map<FilaExportable>((i) => ({
      fecha: i.occurredAt,
      tipo: 'Ingreso',
      concepto: i.fuente,
      cuenta: nombreDeCuenta(cuentas, i.cuentaId),
      montoCents: i.amountCents,
      ...(i.note === undefined ? {} : { nota: i.note }),
    }));

  return [...deGastos, ...deIngresos].sort((a, b) => comparaInstantes(a.fecha, b.fecha));
}

/**
 * El rango se compara sobre la parte de fecha LOCAL del ISO, no sobre el
 * instante: quien pide "hasta el 30 de septiembre" quiere el 30 completo, y
 * comparar contra su medianoche dejaría fuera todo lo de ese día.
 */
function dentroDelRango(iso: string, { desde, hasta }: RangoDeExportacion): boolean {
  const dia = iso.slice(0, 10);
  return dia >= desde && dia <= hasta;
}

function nombreDeCuenta(
  cuentas: ReadonlyMap<string, string>,
  cuentaId: string | undefined,
): string {
  if (cuentaId === undefined) return 'General';
  return cuentas.get(cuentaId) ?? 'General';
}

/** Rango que cubre un mes completo. */
export function rangoDelMes(mes: MonthKey): RangoDeExportacion {
  const match = /^(\d{4})-(\d{2})$/.exec(mes);
  if (!match) return { desde: mes, hasta: mes };
  const anio = Number(match[1]);
  const numeroDeMes = Number(match[2]);
  // Día cero del mes siguiente es el último del pedido.
  const ultimo = new Date(Date.UTC(anio, numeroDeMes, 0)).getUTCDate();
  return { desde: `${mes}-01`, hasta: `${mes}-${String(ultimo).padStart(2, '0')}` };
}

/** Nombre del archivo. Lleva el rango porque es lo que lo distingue del anterior. */
export function nombreDeArchivo(
  rango: RangoDeExportacion,
  extension: 'csv' | 'pdf',
): string {
  return `gastos-${rango.desde}_a_${rango.hasta}.${extension}`;
}
