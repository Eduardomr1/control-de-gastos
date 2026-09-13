/**
 * Base de datos local en SQLite. Unico modulo que toca expo-sqlite.
 *
 * Una fila por gasto, no un blob JSON: el archivo gastos.db se abre con
 * cualquier cliente SQL (DBeaver) y se consulta como una tabla normal. Esa
 * es toda la razon de existir de este modulo frente al cache en MMKV.
 *
 * La API sincrona de expo-sqlite mantiene la misma forma que ExpenseCache,
 * asi que repository.local.ts no distingue cual de los dos tiene debajo.
 */

import * as SQLite from 'expo-sqlite';

import type { Expense, SyncState } from '@/types/expense';

interface Fila {
  id: string;
  amount_cents: number;
  currency: string;
  category_id: string;
  occurred_at: string;
  note: string | null;
  sync_state: string;
  updated_at: string;
  deleted_at: string | null;
}

const db = SQLite.openDatabaseSync('gastos.db');

// El esquema se crea al importar el modulo: sin migraciones todavia porque
// solo hay una tabla y una version. Cuando haya una segunda, toca user_version.
db.execSync(`
  create table if not exists gastos (
    id            text primary key not null,
    amount_cents  integer not null,
    currency      text not null,
    category_id   text not null,
    occurred_at   text not null,
    note          text,
    sync_state    text not null,
    updated_at    text not null,
    deleted_at    text
  );
`);

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
    ...(fila.deleted_at === null ? {} : { deletedAt: fila.deleted_at }),
  };
}

function guardarFila(e: Expense): void {
  db.runSync(
    `insert or replace into gastos
       (id, amount_cents, currency, category_id, occurred_at, note, sync_state, updated_at, deleted_at)
     values (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      e.id,
      e.amountCents,
      e.currency,
      e.categoryId,
      e.occurredAt,
      e.note ?? null,
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

  /** Reemplaza la copia completa. En transaccion: o queda entera o no queda. */
  write(expenses: readonly Expense[]): void {
    db.withTransactionSync(() => {
      db.runSync('delete from gastos');
      for (const e of expenses) guardarFila(e);
    });
  },

  /** Incorpora un gasto recien creado o editado. */
  upsert(expense: Expense): Expense[] {
    guardarFila(expense);
    return this.read();
  },

  clear(): void {
    db.runSync('delete from gastos');
  },
};
