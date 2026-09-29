/**
 * Tabla `cuentas` de la base local. Solo traduce entre fila y dominio; el
 * handle y las migraciones viven en `@/shared/lib/db`.
 */

import { db } from '@/shared/lib/db';

import type { SyncState } from '@/types/expense';
import type { Cuenta, TipoDeCuenta } from '../types';

interface Fila {
  id: string;
  nombre: string;
  tipo: string;
  saldo_inicial_cents: number;
  currency: string;
  sync_state: string;
  updated_at: string;
  deleted_at: string | null;
}

function aCuenta(fila: Fila): Cuenta {
  return {
    id: fila.id,
    nombre: fila.nombre,
    tipo: fila.tipo as TipoDeCuenta,
    saldoInicialCents: fila.saldo_inicial_cents,
    currency: fila.currency,
    syncState: fila.sync_state as SyncState,
    updatedAt: fila.updated_at,
    ...(fila.deleted_at === null ? {} : { deletedAt: fila.deleted_at }),
  };
}

function guardarFila(c: Cuenta): void {
  db.runSync(
    `insert or replace into cuentas
       (id, nombre, tipo, saldo_inicial_cents, currency, sync_state, updated_at, deleted_at)
     values (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      c.id,
      c.nombre,
      c.tipo,
      c.saldoInicialCents,
      c.currency,
      c.syncState,
      c.updatedAt,
      c.deletedAt ?? null,
    ],
  );
}

export const cuentasDb = {
  read(): Cuenta[] {
    return db.getAllSync<Fila>('select * from cuentas').map(aCuenta);
  },

  write(cuentas: readonly Cuenta[]): void {
    db.withTransactionSync(() => {
      db.runSync('delete from cuentas');
      for (const c of cuentas) guardarFila(c);
    });
  },
};
