/**
 * Tabla `ingresos` de la base local. Espejo de `expenseDb.ts` para gastos.
 *
 * Solo traduce entre fila y dominio; el handle y las migraciones viven en
 * `@/shared/lib/db`. En Node truena al importarse —no hay binding nativo— y
 * por eso `ingresosCache` lo pide con un require perezoso dentro de un try.
 */

import { db } from '@/shared/lib/db';

import type { SyncState } from '@/types/expense';
import type { Income } from '../types';

interface Fila {
  id: string;
  amount_cents: number;
  currency: string;
  fuente: string;
  occurred_at: string;
  note: string | null;
  sync_state: string;
  updated_at: string;
  deleted_at: string | null;
}

function aIncome(fila: Fila): Income {
  return {
    id: fila.id,
    amountCents: fila.amount_cents,
    currency: fila.currency,
    fuente: fila.fuente,
    occurredAt: fila.occurred_at,
    syncState: fila.sync_state as SyncState,
    updatedAt: fila.updated_at,
    ...(fila.note === null ? {} : { note: fila.note }),
    ...(fila.deleted_at === null ? {} : { deletedAt: fila.deleted_at }),
  };
}

function guardarFila(i: Income): void {
  db.runSync(
    `insert or replace into ingresos
       (id, amount_cents, currency, fuente, occurred_at, note, sync_state, updated_at, deleted_at)
     values (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      i.id,
      i.amountCents,
      i.currency,
      i.fuente,
      i.occurredAt,
      i.note ?? null,
      i.syncState,
      i.updatedAt,
      i.deletedAt ?? null,
    ],
  );
}

export const ingresosDb = {
  read(): Income[] {
    return db
      .getAllSync<Fila>('select * from ingresos order by occurred_at desc')
      .map(aIncome);
  },

  /** Reemplaza la copia completa. En transacción: o queda entera o no queda. */
  write(ingresos: readonly Income[]): void {
    db.withTransactionSync(() => {
      db.runSync('delete from ingresos');
      for (const i of ingresos) guardarFila(i);
    });
  },
};
