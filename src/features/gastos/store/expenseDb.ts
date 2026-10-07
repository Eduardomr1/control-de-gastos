/**
 * Tabla `gastos` de la base local.
 *
 * La API síncrona coincide con la forma que espera expenseCache.ts (el otro
 * archivo de esta carpeta): read/write/upsert/clear. Es el respaldo real que
 * expenseCache usa en el dispositivo; en Node (pruebas) no hay binding nativo
 * y expenseCache cae a memoria — ver expenseCache.ts.
 *
 * El handle y las migraciones viven en `@/shared/lib/db`: el archivo es uno
 * solo y lo comparten todos los features, así que su versionado no puede ser
 * asunto privado de este.
 */

import { db } from '@/shared/lib/db';

import type { Expense, SyncState } from '@/types/expense';

interface Fila {
  id: string;
  amount_cents: number;
  currency: string;
  category_id: string;
  occurred_at: string;
  note: string | null;
  cuenta_id: string | null;
  recibo_uri?: string | null;
  sync_state: string;
  updated_at: string;
  deleted_at: string | null;
}

function aExpense(fila: Fila): Expense {
  return {
    id: fila.id,
    amountCents: fila.amount_cents,
    currency: fila.currency,
    categoryId: fila.category_id,
    occurredAt: fila.occurred_at,
    syncState: fila.sync_state as SyncState,
    updatedAt: fila.updated_at,
    ...(fila.note === null ? {} : { note: fila.note }),
    ...(fila.cuenta_id === null ? {} : { cuentaId: fila.cuenta_id }),
    ...(fila.recibo_uri ? { reciboUri: fila.recibo_uri } : {}),
    ...(fila.deleted_at === null ? {} : { deletedAt: fila.deleted_at }),
  };
}

function guardarFila(e: Expense): void {
  db.runSync(
    `insert or replace into gastos
       (id, amount_cents, currency, category_id, occurred_at, note, cuenta_id, recibo_uri, sync_state, updated_at, deleted_at)
     values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      e.id,
      e.amountCents,
      e.currency,
      e.categoryId,
      e.occurredAt,
      e.note ?? null,
      e.cuentaId ?? null,
      e.reciboUri ?? null,
      e.syncState,
      e.updatedAt,
      e.deletedAt ?? null,
    ],
  );
}

export const expenseDb = {
  read(): Expense[] {
    return db
      .getAllSync<Fila>('select * from gastos order by occurred_at desc')
      .map(aExpense);
  },

  /** Reemplaza la copia completa. En transacción: o queda entera o no queda. */
  write(expenses: readonly Expense[]): void {
    db.withTransactionSync(() => {
      db.runSync('delete from gastos');
      for (const e of expenses) guardarFila(e);
    });
  },

  /** Incorpora un gasto recién creado o editado. */
  upsert(expense: Expense): Expense[] {
    guardarFila(expense);
    return this.read();
  },

  clear(): void {
    db.runSync('delete from gastos');
  },
};
