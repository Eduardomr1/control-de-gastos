/**
 * Backend en memoria.
 *
 * Se usa cuando no hay credenciales de Supabase configuradas, para poder
 * desarrollar y correr la suite completa sin depender de un backend.
 * `repository.ts` elige entre este y el remoto en tiempo de ejecución.
 */

import type { Category, Expense, NewExpenseInput } from '@/types/expense';
import { nowLocalIso } from './date';
import { dedupeQueue } from './sync';

const CATEGORIES: Category[] = [
  { id: 'comida', name: 'Comida', color: '#F97316' },
  { id: 'transporte', name: 'Transporte', color: '#0EA5E9' },
  { id: 'hogar', name: 'Hogar', color: '#22C55E' },
  { id: 'otros', name: 'Otros', color: '#A855F7' },
];

let store: Expense[] = [];

export async function fetchCategories(): Promise<Category[]> {
  return CATEGORIES;
}

export async function fetchExpenses(): Promise<Expense[]> {
  return store.filter((e) => !e.deletedAt);
}

/**
 * Crea un gasto. El id se genera aquí, en el cliente, lo que hace idempotente
 * cualquier reenvío y neutraliza el doble tap. Ver BUG-003.
 */
export async function createExpense(input: NewExpenseInput): Promise<Expense> {
  const expense: Expense = {
    ...input,
    id: generateId(),
    syncState: 'pending',
    updatedAt: new Date().toISOString(),
  };
  store = dedupeQueue([...store, expense]);
  return expense;
}

export async function deleteExpense(id: string): Promise<void> {
  const now = new Date().toISOString();
  store = store.map((e) =>
    e.id === id ? { ...e, deletedAt: now, updatedAt: now, syncState: 'pending' } : e,
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
