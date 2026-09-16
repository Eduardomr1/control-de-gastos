/**
 * Base de datos local en SQLite. Unico modulo que toca expo-sqlite.
 *
 * Una fila por gasto, no un blob JSON: el archivo gastos.db se abre con
 * cualquier cliente SQL (DBeaver) y se consulta como una tabla normal. Esa
 * es toda la razon de existir de este modulo frente al cache en MMKV.
 *
 * La API sincrona coincide con la forma que espera expenseCache.ts (el otro
 * archivo de esta carpeta): read/write/upsert/clear. Es el respaldo real que
 * expenseCache usa en el dispositivo; en Node (pruebas) no hay binding nativo
 * y expenseCache cae a memoria — ver expenseCache.ts.
 *
 * El esquema se versiona con `user_version` (ver MIGRACIONES). Un
 * `create table if not exists` suelto no basta: es mudo ante una tabla que ya
 * existe, asi que la primera columna que se agregara nunca llegaria a los
 * dispositivos que ya abrieron la app.
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

/**
 * Migraciones en orden. Agregar una es empujar al final del arreglo; nunca
 * editar ni reordenar las que ya estan, porque los dispositivos que las
 * aplicaron no vuelven a ejecutarlas.
 *
 * El indice+1 de cada entrada es su `user_version`, asi que el largo del
 * arreglo es siempre la version esperada del esquema.
 */
const MIGRACIONES: readonly string[] = [
  // 1 — esquema inicial.
  //
  // `if not exists` no sobra aunque haya migraciones: las instalaciones
  // anteriores a este commit ya tienen la tabla pero user_version en 0, asi
  // que esta migracion les corre igual. Sin el `if not exists` tronarian al
  // abrir la app.
  `create table if not exists gastos (
     id            text primary key not null,
     amount_cents  integer not null,
     currency      text not null,
     category_id   text not null,
     occurred_at   text not null,
     note          text,
     sync_state    text not null,
     updated_at    text not null,
     deleted_at    text
   );`,
];

/**
 * Lleva el esquema a la ultima version al importar el modulo.
 *
 * Cada migracion va con su bump de version en la misma transaccion: si el
 * proceso muere a media aplicacion, o quedo entera o no quedo, y al reabrir
 * se reintenta desde donde iba en vez de saltarsela.
 */
function migrar(): void {
  const fila = db.getFirstSync<{ user_version: number }>('pragma user_version');
  const actual = fila?.user_version ?? 0;

  MIGRACIONES.slice(actual).forEach((sql, i) => {
    const version = actual + i + 1;
    db.withTransactionSync(() => {
      db.execSync(sql);
      // pragma no admite parametros vinculados. `version` es aritmetica sobre
      // el largo del arreglo, nunca entrada del usuario.
      db.execSync(`pragma user_version = ${version}`);
    });
  });
}

migrar();

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
