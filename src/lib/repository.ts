/**
 * Punto único de acceso a datos para las pantallas.
 *
 * Elige el backend en tiempo de ejecución: si hay credenciales de Supabase se
 * usa el remoto, si no el de memoria. Eso permite abrir la app y correr la
 * suite sin backend, y es lo que mantiene a las pantallas ignorantes de dónde
 * viven los datos.
 *
 * `remote.ts` y `supabase.ts` se cargan con require() perezoso a propósito: un
 * import estático arrastraría el binding nativo de MMKV a cualquier contexto
 * que importe este archivo, incluidas las pruebas en Node.
 */

import type { Category, Expense, NewExpenseInput } from '@/types/expense';
import * as local from './repository.local';

const hasCredentials = Boolean(
  process.env['EXPO_PUBLIC_SUPABASE_URL'] &&
    process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY'],
);

/** True cuando la app habla con Supabase; false cuando corre en memoria. */
export const isRemote = hasCredentials;

interface RemoteModule {
  fetchCategories(): Promise<Category[]>;
  fetchExpenses(): Promise<Expense[]>;
  createExpense(input: NewExpenseInput): Promise<Expense>;
  deleteExpense(id: string): Promise<void>;
}

let remoteCache: RemoteModule | null = null;
function remote(): RemoteModule {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  remoteCache ??= require('./repository.remote') as RemoteModule;
  return remoteCache;
}

function backend(): RemoteModule {
  return hasCredentials ? remote() : local;
}

export function fetchCategories(): Promise<Category[]> {
  return backend().fetchCategories();
}

export function fetchExpenses(): Promise<Expense[]> {
  return backend().fetchExpenses();
}

export function createExpense(input: NewExpenseInput): Promise<Expense> {
  return backend().createExpense(input);
}

export function deleteExpense(id: string): Promise<void> {
  return backend().deleteExpense(id);
}

export { draftOccurredAt } from './repository.local';
