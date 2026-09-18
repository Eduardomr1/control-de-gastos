/**
 * Backend en memoria.
 *
 * Se usa cuando no hay credenciales de Supabase configuradas, para poder
 * desarrollar y correr la suite completa sin depender de un backend.
 * `api/index.ts` elige entre este y el remoto en tiempo de ejecución.
 *
 * La persistencia (SQLite en el dispositivo, memoria en Node) vive en
 * `../store/expenseCache`, compartida con el backend remoto: un solo respaldo
 * físico de "todos los gastos conocidos", sin importar cuál backend escribió.
 */

import type { Expense, NewExpenseInput } from '@/types/expense';
import { nowLocalIso } from '@/shared/lib/date';
import { expenseCache } from '../store/expenseCache';

export async function fetchExpenses(): Promise<Expense[]> {
  return expenseCache.read().filter((e) => !e.deletedAt);
}

/**
 * Crea un gasto. El id se genera aquí, en el cliente, lo que hace idempotente
 * cualquier reenvío y neutraliza el doble tap. Ver BUG-003.
 *
 * Nace `synced` y no `pending`: sin backend, esta copia local ES la fuente de
 * verdad, y este módulo nunca encola nada. Marcarlo pendiente ponía en la fila
 * un "Pendiente de sincronizar" que no existía forma de resolver. Ver BUG-016.
 */
export async function createExpense(input: NewExpenseInput): Promise<Expense> {
  const expense: Expense = {
    ...input,
    id: generateId(),
    syncState: 'synced',
    updatedAt: new Date().toISOString(),
  };
  expenseCache.upsert(expense);
  return expense;
}

export async function deleteExpense(id: string): Promise<void> {
  const now = new Date().toISOString();
  expenseCache.write(
    expenseCache
      .read()
      .map((e) => (e.id === id ? { ...e, deletedAt: now, updatedAt: now, syncState: 'synced' } : e)),
  );
}

export function draftOccurredAt(): string {
  return nowLocalIso();
}

function generateId(): string {
  // UUID v4 sin dependencias externas.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
