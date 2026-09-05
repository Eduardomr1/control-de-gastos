/**
 * Modelo de dominio.
 *
 * Decisiones deliberadas (ver docs/test-plan.md):
 * - `amountCents` es un ENTERO. Nunca float: 0.1 + 0.2 !== 0.3 en IEEE-754.
 * - `id` es un UUID generado en el CLIENTE, lo que permite crear offline y
 *   hace el sync idempotente (el servidor reconoce el id y no duplica).
 * - `deletedAt` implementa soft delete: sin él, un borrado offline es
 *   indistinguible de un registro que aún no ha sincronizado.
 */

export type SyncState = 'pending' | 'synced' | 'conflict';

export interface Expense {
  readonly id: string;
  readonly amountCents: number;
  readonly currency: string;
  readonly categoryId: string;
  /** ISO 8601 con offset explícito. Nunca una fecha "desnuda". */
  readonly occurredAt: string;
  readonly note?: string;
  readonly syncState: SyncState;
  readonly updatedAt: string;
  readonly deletedAt?: string;
}

export interface Category {
  readonly id: string;
  readonly name: string;
  readonly color: string;
}

export type NewExpenseInput = Omit<
  Expense,
  'id' | 'syncState' | 'updatedAt' | 'deletedAt'
>;
