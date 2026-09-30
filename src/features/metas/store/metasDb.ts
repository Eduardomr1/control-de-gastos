/**
 * Tabla `metas_ahorro` de la base local. Solo traduce entre fila y dominio; el
 * handle y las migraciones viven en `@/shared/lib/db`.
 */

import { db } from '@/shared/lib/db';

import type { SyncState } from '@/types/expense';
import type { Meta } from '../types';

interface Fila {
  id: string;
  nombre: string;
  objetivo_cents: number;
  actual_cents: number;
  fecha_limite: string | null;
  sync_state: string;
  updated_at: string;
  deleted_at: string | null;
}

function aMeta(fila: Fila): Meta {
  return {
    id: fila.id,
    nombre: fila.nombre,
    objetivoCents: fila.objetivo_cents,
    actualCents: fila.actual_cents,
    syncState: fila.sync_state as SyncState,
    updatedAt: fila.updated_at,
    ...(fila.fecha_limite === null ? {} : { fechaLimite: fila.fecha_limite }),
    ...(fila.deleted_at === null ? {} : { deletedAt: fila.deleted_at }),
  };
}

function guardarFila(m: Meta): void {
  db.runSync(
    `insert or replace into metas_ahorro
       (id, nombre, objetivo_cents, actual_cents, fecha_limite, sync_state, updated_at, deleted_at)
     values (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      m.id,
      m.nombre,
      m.objetivoCents,
      m.actualCents,
      m.fechaLimite ?? null,
      m.syncState,
      m.updatedAt,
      m.deletedAt ?? null,
    ],
  );
}

export const metasDb = {
  read(): Meta[] {
    return db.getAllSync<Fila>('select * from metas_ahorro').map(aMeta);
  },

  write(metas: readonly Meta[]): void {
    db.withTransactionSync(() => {
      db.runSync('delete from metas_ahorro');
      for (const m of metas) guardarFila(m);
    });
  },
};
