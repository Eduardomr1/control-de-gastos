/**
 * Tabla `presupuestos` de la base local. Solo traduce entre fila y dominio; el
 * handle y las migraciones viven en `@/shared/lib/db`.
 *
 * En Node truena al importarse —no hay binding nativo— y por eso
 * `presupuestosCache` lo pide con un require perezoso dentro de un try.
 */

import { db } from '@/shared/lib/db';

import type { SyncState } from '@/types/expense';
import type { Presupuesto } from '../types';

interface Fila {
  id: string;
  category_id: string;
  limite_cents: number;
  mes_referencia: string | null;
  sync_state: string;
  updated_at: string;
  deleted_at: string | null;
}

function aPresupuesto(fila: Fila): Presupuesto {
  return {
    id: fila.id,
    categoryId: fila.category_id,
    limiteCents: fila.limite_cents,
    syncState: fila.sync_state as SyncState,
    updatedAt: fila.updated_at,
    ...(fila.mes_referencia === null ? {} : { mesReferencia: fila.mes_referencia }),
    ...(fila.deleted_at === null ? {} : { deletedAt: fila.deleted_at }),
  };
}

function guardarFila(p: Presupuesto): void {
  db.runSync(
    `insert or replace into presupuestos
       (id, category_id, limite_cents, mes_referencia, sync_state, updated_at, deleted_at)
     values (?, ?, ?, ?, ?, ?, ?)`,
    [
      p.id,
      p.categoryId,
      p.limiteCents,
      p.mesReferencia ?? null,
      p.syncState,
      p.updatedAt,
      p.deletedAt ?? null,
    ],
  );
}

export const presupuestosDb = {
  read(): Presupuesto[] {
    return db.getAllSync<Fila>('select * from presupuestos').map(aPresupuesto);
  },

  write(presupuestos: readonly Presupuesto[]): void {
    db.withTransactionSync(() => {
      db.runSync('delete from presupuestos');
      for (const p of presupuestos) guardarFila(p);
    });
  },
};
