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
