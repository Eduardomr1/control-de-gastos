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

/**
 * Estado local. En el dispositivo se respalda en SQLite (db.ts), para que los
 * gastos sobrevivan a un reinicio y para poder inspeccionarlos con cualquier
 * cliente SQL; en Node (pruebas) no hay binding nativo y queda en memoria.
 *
 * El require() es perezoso por lo mismo que en repository.ts: un import
 * estatico arrastraria el modulo nativo a cualquier contexto que lo importe,
 * incluidas las pruebas.
 */
interface Disco {
  read(): Expense[];
  write(expenses: readonly Expense[]): void;
}

let store: Expense[] | null = null;
let disco: Disco | null | undefined;

function persistencia(): Disco | null {
  if (disco === undefined) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      disco = (require('./db') as { expenseDb: Disco }).expenseDb;
    } catch {
      disco = null;
    }
  }
  return disco;
}

function leer(): Expense[] {
  store ??= persistencia()?.read() ?? [];
  return store;
}

function guardar(next: Expense[]): void {
  store = next;
  persistencia()?.write(next);
}

export async function fetchCategories(): Promise<Category[]> {
  return CATEGORIES;
}

export async function fetchExpenses(): Promise<Expense[]> {
  return leer().filter((e) => !e.deletedAt);
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
  guardar(dedupeQueue([...leer(), expense]));
  return expense;
}

export async function deleteExpense(id: string): Promise<void> {
  const now = new Date().toISOString();
  guardar(
    leer().map((e) =>
      e.id === id ? { ...e, deletedAt: now, updatedAt: now, syncState: 'pending' } : e,
    ),
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
