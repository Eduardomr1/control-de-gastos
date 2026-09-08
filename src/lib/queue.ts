/**
 * Cola de sincronización persistente.
 *
 * Este módulo NO importa MMKV. El almacenamiento se inyecta, por dos razones:
 * la cola queda comprobable en Node sin binding nativo, y la política de
 * persistencia deja de estar acoplada a la estructura de datos. La instancia
 * real de producción se arma en `storage.ts`.
 */

import type { Expense } from '@/types/expense';
import { dedupeQueue } from './sync';

const KEY = 'sync:queue';
const CURSOR_KEY = 'sync:cursor';
const CACHE_KEY = 'expenses:all';

/**
 * Contrato mínimo de almacenamiento. Deliberadamente síncrono: si el usuario
 * mata la app justo después de guardar un gasto, la cola ya debe estar en
 * disco. Un almacenamiento asíncrono perdería ese gasto (ver TC-021).
 */
export interface QueueStorage {
  getString(key: string): string | undefined;
  set(key: string, value: string): void;
  delete(key: string): void;
}

export class SyncQueue {
  constructor(private readonly storage: QueueStorage) {}

  read(): Expense[] {
    const raw = this.storage.getString(KEY);
    if (!raw) return [];
    try {
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as Expense[]) : [];
    } catch {
      // Una cola corrupta no debe impedir que la app abra. Se descarta y se
      // repuebla en el siguiente pull; el dato ya está en el servidor o se
      // volverá a encolar desde la UI.
      this.storage.delete(KEY);
      return [];
    }
  }

  /** Encola un gasto. Deduplica por id, así que reencolar es inofensivo. */
  enqueue(expense: Expense): Expense[] {
    const next = dedupeQueue([...this.read(), expense]);
    this.storage.set(KEY, JSON.stringify(next));
    return next;
  }

  /** Retira de la cola los ids ya confirmados por el servidor. */
  acknowledge(ids: readonly string[]): Expense[] {
    const done = new Set(ids);
    const next = this.read().filter((e) => !done.has(e.id));
    this.storage.set(KEY, JSON.stringify(next));
    return next;
  }

  clear(): void {
    this.storage.delete(KEY);
  }

  get size(): number {
    return this.read().length;
  }

  /** Marca de agua del último pull, para sincronización incremental. */
  get cursor(): string | null {
    return this.storage.getString(CURSOR_KEY) ?? null;
  }

  setCursor(iso: string): void {
    this.storage.set(CURSOR_KEY, iso);
  }
}

/**
 * Copia local de TODOS los gastos conocidos.
 *
 * Distinta de la cola: la cola guarda lo que falta enviar y se vacia al
 * confirmarse, asi que no sirve como fuente de lectura. Sin esta copia, la
 * lista queda vacia en cuanto la sincronizacion tiene exito (BUG-012) y no hay
 * nada que mostrar sin red.
 */
export class ExpenseCache {
  constructor(private readonly storage: QueueStorage) {}

  read(): Expense[] {
    const raw = this.storage.getString(CACHE_KEY);
    if (!raw) return [];
    try {
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as Expense[]) : [];
    } catch {
      this.storage.delete(CACHE_KEY);
      return [];
    }
  }

  /** Reemplaza la copia completa con el resultado ya reconciliado. */
  write(expenses: readonly Expense[]): void {
    this.storage.set(CACHE_KEY, JSON.stringify(expenses));
  }

  /** Incorpora un gasto recien creado o editado, sin esperar al servidor. */
  upsert(expense: Expense): Expense[] {
    const next = dedupeQueue([...this.read(), expense]);
    this.write(next);
    return next;
  }

  clear(): void {
    this.storage.delete(CACHE_KEY);
  }
}
