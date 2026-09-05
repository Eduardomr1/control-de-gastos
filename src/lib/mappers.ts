/**
 * Traducción entre el modelo de dominio y las filas de la base de datos.
 *
 * Existe como módulo aparte y probado porque es donde se pierden los datos
 * en silencio: un campo mal mapeado no lanza error, solo entrega el valor
 * equivocado. El offset de zona horaria es el caso crítico (ver BUG-002).
 */

import type { Expense } from '@/types/expense';
import type { ExpenseRow } from '@/types/database';

export class MappingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MappingError';
  }
}

const OFFSET_PATTERN = /(Z|[+-]\d{2}:\d{2})$/;

/** Extrae el offset de un ISO 8601, en minutos respecto a UTC. */
export function offsetMinutesOf(isoWithOffset: string): number {
  const match = OFFSET_PATTERN.exec(isoWithOffset);
  if (!match) {
    throw new MappingError(
      `Se requiere ISO 8601 con offset explícito: "${isoWithOffset}"`,
    );
  }
  const token = match[1];
  if (token === 'Z') return 0;

  const sign = token!.startsWith('-') ? -1 : 1;
  const hours = Number(token!.slice(1, 3));
  const minutes = Number(token!.slice(4, 6));
  return sign * (hours * 60 + minutes);
}

/** Reconstruye un ISO local a partir del instante UTC y el offset guardado. */
export function toLocalIso(utcIso: string, offsetMinutes: number): string {
  const instant = Date.parse(utcIso);
  if (Number.isNaN(instant)) {
    throw new MappingError(`Timestamp inválido: "${utcIso}"`);
  }
  const shifted = new Date(instant + offsetMinutes * 60_000);
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMinutes);
  const offset = `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;

  return (
    `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-` +
    `${pad(shifted.getUTCDate())}T${pad(shifted.getUTCHours())}:` +
    `${pad(shifted.getUTCMinutes())}:${pad(shifted.getUTCSeconds())}${offset}`
  );
}

export function rowToExpense(row: ExpenseRow): Expense {
  return {
    id: row.id,
    amountCents: Number(row.amount_cents),
    currency: row.currency,
    categoryId: row.category_id,
    occurredAt: toLocalIso(row.occurred_at, row.tz_offset_minutes),
    ...(row.note ? { note: row.note } : {}),
    syncState: 'synced',
    updatedAt: row.updated_at,
    ...(row.deleted_at ? { deletedAt: row.deleted_at } : {}),
  };
}

export function expenseToRpcArgs(expense: Expense, userId: string) {
  void userId; // el servidor lo toma de auth.uid(); se acepta por simetría
  return {
    p_id: expense.id,
    p_amount_cents: expense.amountCents,
    p_currency: expense.currency,
    p_category_id: expense.categoryId,
    p_occurred_at: expense.occurredAt,
    p_tz_offset_minutes: offsetMinutesOf(expense.occurredAt),
    p_note: expense.note ?? null,
    p_updated_at: expense.updatedAt,
    p_deleted_at: expense.deletedAt ?? null,
  };
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}
