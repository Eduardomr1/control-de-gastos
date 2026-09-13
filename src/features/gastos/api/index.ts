/**
 * Punto único de acceso a datos de gastos para las pantallas.
 *
 * Elige el backend en tiempo de ejecución: si hay credenciales de Supabase se
 * usa el remoto, si no el de memoria. Eso permite abrir la app y correr la
 * suite sin backend, y es lo que mantiene a las pantallas ignorantes de dónde
 * viven los datos.
 *
 * `expenses.remote.ts` se carga con require() perezoso a propósito: un import
 * estático arrastraría el binding nativo de MMKV a cualquier contexto que
 * importe este archivo, incluidas las pruebas en Node.
 */

import type { Expense, NewExpenseInput } from '@/types/expense';
import { isRemote } from '@/shared/lib/environment';
import * as local from './expenses.local';

interface RemoteModule {
  fetchExpenses(): Promise<Expense[]>;
  createExpense(input: NewExpenseInput): Promise<Expense>;
  deleteExpense(id: string): Promise<void>;
}

let remoteCache: RemoteModule | null = null;
function remote(): RemoteModule {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  remoteCache ??= require('./expenses.remote') as RemoteModule;
  return remoteCache;
}

function backend(): RemoteModule {
  return isRemote ? remote() : local;
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

export { draftOccurredAt } from './expenses.local';
