/**
 * Copia local de TODOS los gastos conocidos. La usan tanto el backend local
 * (sin credenciales) como el remoto (con Supabase): un solo respaldo físico,
 * no dos — antes había una copia en SQLite (solo para el backend local) y otra
 * en MMKV (solo para el remoto), la misma lista duplicada en dos motores.
 *
 * Distinta de la cola de sync: la cola guarda lo que falta enviar y se vacía
 * al confirmarse, así que no sirve como fuente de lectura. Sin esta copia, la
 * lista queda vacía en cuanto la sincronización tiene éxito (BUG-012) y no hay
 * nada que mostrar sin red.
 *
 * El `require()` de `expenseDb` es perezoso a propósito: un import estático
 * arrastraría expo-sqlite a cualquier contexto que importe este módulo,
 * incluidas las pruebas en Node, que no tienen el binding nativo y por eso
 * caen a memoria.
 */

import type { Expense } from '@/types/expense';
import { dedupeQueue } from '@/shared/lib/sync-engine';

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
      disco = (require('./expenseDb') as { expenseDb: Disco }).expenseDb;
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

export const expenseCache = {
  read: leer,

  /** Reemplaza la copia completa con el resultado ya reconciliado. */
  write: guardar,

  /** Incorpora un gasto recién creado o editado, sin esperar al servidor. */
  upsert(expense: Expense): Expense[] {
    const next = dedupeQueue([...leer(), expense]);
    guardar(next);
    return next;
  },

  clear(): void {
    guardar([]);
  },
};
