/**
 * Capa de sincronización contra Supabase.
 *
 * Empuja la cola local y trae los cambios remotos. La reconciliación usa la
 * misma función `resolveConflict` que el resto de la app, para que cliente y
 * servidor converjan al mismo resultado (ver BUG-004).
 */

import type { Expense } from '@/types/expense';
import { expenseToRpcArgs, rowToExpense } from '@/shared/lib/mappers';
import { reconcile } from '@/shared/lib/sync-engine';
import { callRpc } from '@/shared/lib/supabase';
import { traducirPostgrest } from '@/shared/errors';
import type { SyncQueue } from '../store/syncQueue';
import type { PushResult } from '../types';

/**
 * Envía la cola pendiente. Cada gasto viaja por `sync_expense`, que hace
 * upsert idempotente: reenviar el mismo id no duplica, y una versión vieja
 * no pisa una edición nueva.
 */
export async function pushQueue(queue: SyncQueue): Promise<PushResult> {
  const pending = queue.read();
  const acknowledged: string[] = [];
  const failed: PushResult['failed'] = [];

  for (const expense of pending) {
    const { error } = await callRpc('sync_expense', expenseToRpcArgs(expense));

    if (error) {
      failed.push({ id: expense.id, reason: traducirPostgrest(error) });
      // Se continúa con los demás: un gasto con categoría inválida no debe
      // bloquear la cola completa.
      continue;
    }
    acknowledged.push(expense.id);
  }

  if (acknowledged.length > 0) queue.acknowledge(acknowledged);
  return { acknowledged, failed };
}

/**
 * Trae los cambios posteriores al cursor guardado y los reconcilia contra lo
 * que hay en local. Devuelve el conjunto ya resuelto.
 */
export async function pullChanges(
  queue: SyncQueue,
  local: readonly Expense[],
): Promise<Expense[]> {
  const since = queue.cursor ?? new Date(0).toISOString();
  const { data, error } = await callRpc('pull_changes', { p_since: since });

  if (error) throw traducirPostgrest(error);

  const remote = (data ?? []).map(rowToExpense);
  const merged = reconcile(local, remote);

  const newest = remote.reduce<string>(
    (max: string, e: Expense) => (e.updatedAt > max ? e.updatedAt : max),
    since,
  );
  if (newest !== since) queue.setCursor(newest);

  return merged;
}
