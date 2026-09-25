/**
 * Tabla `recurrentes` de la base local. Solo traduce entre fila y dominio; el
 * handle y las migraciones viven en `@/shared/lib/db`.
 */

import { db } from '@/shared/lib/db';

import type { SyncState } from '@/types/expense';
import type { Frecuencia, Recurrente, TipoRecurrente } from '../types';

interface Fila {
  id: string;
  tipo: string;
  nombre: string;
  amount_cents: number;
  currency: string;
  category_id: string | null;
  fuente: string | null;
  frecuencia: string;
  inicio: string;
  generadas_hasta: string | null;
  activo: number;
  sync_state: string;
  updated_at: string;
  deleted_at: string | null;
}

function aRecurrente(fila: Fila): Recurrente {
  return {
    id: fila.id,
    tipo: fila.tipo as TipoRecurrente,
    nombre: fila.nombre,
    amountCents: fila.amount_cents,
    currency: fila.currency,
    frecuencia: fila.frecuencia as Frecuencia,
    inicio: fila.inicio,
    // SQLite no tiene booleano: 0 y 1 son enteros y hay que traducirlos aquí,
    // no en la pantalla.
    activo: fila.activo === 1,
    syncState: fila.sync_state as SyncState,
    updatedAt: fila.updated_at,
    ...(fila.category_id === null ? {} : { categoryId: fila.category_id }),
    ...(fila.fuente === null ? {} : { fuente: fila.fuente }),
    ...(fila.generadas_hasta === null ? {} : { generadasHasta: fila.generadas_hasta }),
    ...(fila.deleted_at === null ? {} : { deletedAt: fila.deleted_at }),
  };
}

function guardarFila(r: Recurrente): void {
  db.runSync(
    `insert or replace into recurrentes
       (id, tipo, nombre, amount_cents, currency, category_id, fuente,
        frecuencia, inicio, generadas_hasta, activo, sync_state, updated_at, deleted_at)
     values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      r.id,
      r.tipo,
      r.nombre,
      r.amountCents,
      r.currency,
      r.categoryId ?? null,
      r.fuente ?? null,
      r.frecuencia,
      r.inicio,
      r.generadasHasta ?? null,
      r.activo ? 1 : 0,
      r.syncState,
      r.updatedAt,
      r.deletedAt ?? null,
    ],
  );
}

export const recurrentesDb = {
  read(): Recurrente[] {
    return db.getAllSync<Fila>('select * from recurrentes').map(aRecurrente);
  },

  write(recurrentes: readonly Recurrente[]): void {
    db.withTransactionSync(() => {
      db.runSync('delete from recurrentes');
      for (const r of recurrentes) guardarFila(r);
    });
  },
};
