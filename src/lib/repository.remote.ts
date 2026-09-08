/**
 * Backend contra Supabase, con escritura optimista y cola offline.
 *
 * Escribir nunca depende de la red: el gasto entra a la cola persistente y se
 * empuja en cuanto haya conexión. Leer intenta sincronizar y, si falla, se
 * queda con lo local en vez de dejar la pantalla vacía.
 */

import type { Category, Expense, NewExpenseInput } from '@/types/expense';
import { pullChanges, pushQueue } from './remote';
import { expenseCache, syncQueue } from './storage';
import { currentUserId, supabase } from './supabase';
import type { CategoryRow } from '@/types/database';

export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase.from('categories').select('*');
  if (error) throw new Error(`No se pudieron cargar las categorías: ${error.message}`);

  // El mismo motivo que en callRpc(): la inferencia de supabase-js resuelve
  // el schema a never con tipos escritos a mano. El cast queda acotado a esta
  // linea y CategoryRow refleja la tabla real.
  return ((data ?? []) as CategoryRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    color: row.color,
  }));
}

export async function fetchExpenses(): Promise<Expense[]> {
  const userId = await currentUserId();
  if (!userId) throw new Error('Sesión no iniciada');

  // La copia local es la fuente de lectura, no la cola: la cola se vacia al
  // confirmarse el envio y dejaria la lista vacia (BUG-012).
  const cached = expenseCache.read();

  try {
    await pushQueue(syncQueue);
    const merged = await pullChanges(syncQueue, cached);
    expenseCache.write(merged);
    return merged.filter((e) => !e.deletedAt);
  } catch {
    // ponytail: sin red se sirve la copia local. La cola conserva lo pendiente
    // y el siguiente fetch reintenta; no hace falta backoff propio, TanStack
    // Query ya reintenta con retraso exponencial.
    return cached.filter((e) => !e.deletedAt);
  }
}

export async function createExpense(input: NewExpenseInput): Promise<Expense> {
  const expense: Expense = {
    ...input,
    id: generateId(),
    syncState: 'pending',
    updatedAt: new Date().toISOString(),
  };

  // Primero a disco, después a la red: si la app muere aquí, el gasto existe.
  // Entra a la cola (lo que falta enviar) y a la copia local (lo que se lee).
  syncQueue.enqueue(expense);
  expenseCache.upsert(expense);

  const userId = await currentUserId();
  if (userId) void pushQueue(syncQueue).catch(() => undefined);

  return expense;
}

export async function deleteExpense(id: string): Promise<void> {
  const existing = expenseCache.read().find((e) => e.id === id);
  if (!existing) return;

  const now = new Date().toISOString();
  const deleted: Expense = {
    ...existing,
    deletedAt: now,
    updatedAt: now,
    syncState: 'pending',
  };
  syncQueue.enqueue(deleted);
  expenseCache.upsert(deleted);

  const userId = await currentUserId();
  if (userId) void pushQueue(syncQueue).catch(() => undefined);
}

/** UUID v4 generado en el cliente: es lo que hace idempotente el sync. */
function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
