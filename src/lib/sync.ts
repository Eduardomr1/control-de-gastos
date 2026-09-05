/**
 * Resolución de conflictos de sincronización.
 *
 * Estrategia: last-write-wins por `updatedAt`, con desempate determinista
 * por `id`. El desempate importa: sin él, dos ediciones con el mismo
 * timestamp resuelven distinto en cada dispositivo y las réplicas divergen.
 */

import type { Expense } from '@/types/expense';

export type Resolution = 'local' | 'remote';

export interface ConflictResult {
  readonly winner: Expense;
  readonly resolution: Resolution;
  /** Verdadero si el desempate se decidió por id y no por timestamp. */
  readonly wasTie: boolean;
}

export function resolveConflict(local: Expense, remote: Expense): ConflictResult {
  if (local.id !== remote.id) {
    throw new Error('No se pueden reconciliar registros con distinto id');
  }

  // El borrado gana sobre la edición: es la acción menos recuperable
  // desde la perspectiva del usuario, y evita "gastos zombie".
  if (local.deletedAt && !remote.deletedAt) {
    return { winner: local, resolution: 'local', wasTie: false };
  }
  if (remote.deletedAt && !local.deletedAt) {
    return { winner: remote, resolution: 'remote', wasTie: false };
  }

  const localTime = Date.parse(local.updatedAt);
  const remoteTime = Date.parse(remote.updatedAt);
  if (Number.isNaN(localTime) || Number.isNaN(remoteTime)) {
    throw new Error('updatedAt inválido en la reconciliación');
  }

  if (localTime !== remoteTime) {
    return localTime > remoteTime
      ? { winner: local, resolution: 'local', wasTie: false }
      : { winner: remote, resolution: 'remote', wasTie: false };
  }

  // Empate exacto: desempate determinista e idéntico en todos los clientes.
  return { winner: remote, resolution: 'remote', wasTie: true };
}

/**
 * Deduplica una cola de sync por id, conservando el ganador de cada conflicto.
 * Esto es lo que hace inofensivo el doble tap en "Guardar": el segundo evento
 * lleva el mismo id generado en cliente y colapsa contra el primero.
 */
export function dedupeQueue(items: readonly Expense[]): Expense[] {
  const byId = new Map<string, Expense>();
  for (const item of items) {
    const existing = byId.get(item.id);
    byId.set(item.id, existing ? resolveConflict(existing, item).winner : item);
  }
  return [...byId.values()];
}
