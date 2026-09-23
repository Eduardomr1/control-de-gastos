import type { SyncState } from '@/types/expense';

/**
 * Límite de gasto mensual para una categoría.
 *
 * `mesReferencia` ausente significa "vigente todos los meses". El caso normal
 * —500 al mes en Comida, siempre— es una sola fila, no doce al año. Una fila
 * con mes explícito gana sobre la general: es el override de diciembre sin
 * tocar el resto del año.
 */
export interface Presupuesto {
  readonly id: string;
  readonly categoryId: string;
  readonly limiteCents: number;
  /** `YYYY-MM`. Ausente = aplica a cualquier mes sin override propio. */
  readonly mesReferencia?: string;
  readonly syncState: SyncState;
  readonly updatedAt: string;
  readonly deletedAt?: string;
}

export type NewPresupuestoInput = Omit<
  Presupuesto,
  'id' | 'syncState' | 'updatedAt' | 'deletedAt'
>;

/**
 * Fracciones del límite que disparan aviso, de menor a mayor.
 *
 * Dos y no cinco: un aviso que aparece cada 10% deja de leerse a la tercera
 * vez. El 80% es "cuidado" y el 100% es "ya está".
 */
export const UMBRALES = [0.8, 1] as const;
