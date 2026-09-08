import type { Expense } from '@/types/expense';
import { ExpenseCache, SyncQueue, type QueueStorage } from './queue';

/** Doble de prueba en memoria, con la misma semántica síncrona que MMKV. */
class FakeStorage implements QueueStorage {
  private data = new Map<string, string>();

  getString(key: string): string | undefined {
    return this.data.get(key);
  }
  set(key: string, value: string): void {
    this.data.set(key, value);
  }
  delete(key: string): void {
    this.data.delete(key);
  }
  /** Simula datos corruptos en disco. */
  corrupt(key: string): void {
    this.data.set(key, '{no es json');
  }
}

function expense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: 'exp-1',
    amountCents: 5000,
    currency: 'MXN',
    categoryId: 'comida',
    occurredAt: '2026-01-15T12:00:00-07:00',
    syncState: 'pending',
    updatedAt: '2026-01-15T12:00:00.000Z',
    ...overrides,
  };
}

describe('SyncQueue', () => {
  let storage: FakeStorage;
  let queue: SyncQueue;

  beforeEach(() => {
    storage = new FakeStorage();
    queue = new SyncQueue(storage);
  });

  it('empieza vacía', () => {
    expect(queue.read()).toEqual([]);
    expect(queue.size).toBe(0);
  });

  it('conserva lo encolado', () => {
    queue.enqueue(expense());
    expect(queue.size).toBe(1);
  });

  // TC-021 — la cola debe sobrevivir a un cierre forzado.
  it('sobrevive a reiniciar la app', () => {
    queue.enqueue(expense({ amountCents: 45000 }));

    // Una instancia nueva sobre el mismo almacenamiento simula el reinicio.
    const afterRestart = new SyncQueue(storage);
    expect(afterRestart.size).toBe(1);
    expect(afterRestart.read()[0]?.amountCents).toBe(45000);
  });

  // TC-020 — el doble tap no debe duplicar.
  it('deduplica al encolar el mismo gasto dos veces', () => {
    const e = expense();
    queue.enqueue(e);
    queue.enqueue(e);
    expect(queue.size).toBe(1);
  });

  it('conserva la versión más reciente al reencolar', () => {
    queue.enqueue(expense({ amountCents: 1000, updatedAt: '2026-01-15T12:00:00.000Z' }));
    queue.enqueue(expense({ amountCents: 2000, updatedAt: '2026-01-15T13:00:00.000Z' }));

    expect(queue.size).toBe(1);
    expect(queue.read()[0]?.amountCents).toBe(2000);
  });

  it('mantiene separados los gastos distintos', () => {
    queue.enqueue(expense({ id: 'a' }));
    queue.enqueue(expense({ id: 'b' }));
    expect(queue.size).toBe(2);
  });

  it('retira de la cola lo confirmado por el servidor', () => {
    queue.enqueue(expense({ id: 'a' }));
    queue.enqueue(expense({ id: 'b' }));

    queue.acknowledge(['a']);
    expect(queue.read().map((e) => e.id)).toEqual(['b']);
  });

  it('ignora confirmaciones de ids que no están en la cola', () => {
    queue.enqueue(expense({ id: 'a' }));
    queue.acknowledge(['no-existe']);
    expect(queue.size).toBe(1);
  });

  it('se vacía por completo con clear', () => {
    queue.enqueue(expense());
    queue.clear();
    expect(queue.size).toBe(0);
  });

  it('se recupera de una cola corrupta en lugar de impedir el arranque', () => {
    queue.enqueue(expense());
    storage.corrupt('sync:queue');

    // Perder la cola es malo; no poder abrir la app es peor.
    expect(() => queue.read()).not.toThrow();
    expect(queue.read()).toEqual([]);
  });

  it('persiste el cursor de sincronización incremental', () => {
    expect(queue.cursor).toBeNull();
    queue.setCursor('2026-01-15T12:00:00.000Z');
    expect(new SyncQueue(storage).cursor).toBe('2026-01-15T12:00:00.000Z');
  });
});

describe('ExpenseCache', () => {
  let storage: FakeStorage;
  let cache: ExpenseCache;
  let queue: SyncQueue;

  beforeEach(() => {
    storage = new FakeStorage();
    cache = new ExpenseCache(storage);
    queue = new SyncQueue(storage);
  });

  it('empieza vacía', () => {
    expect(cache.read()).toEqual([]);
  });

  it('conserva lo que se le escribe', () => {
    cache.write([expense({ id: 'a' }), expense({ id: 'b' })]);
    expect(cache.read()).toHaveLength(2);
  });

  it('sobrevive a reiniciar la app', () => {
    cache.write([expense({ amountCents: 45000 })]);
    expect(new ExpenseCache(storage).read()[0]?.amountCents).toBe(45000);
  });

  // BUG-012 — la cola se vacía al confirmarse; la copia local no.
  it('conserva los gastos aunque la cola se vacíe tras sincronizar', () => {
    const e = expense({ id: 'a' });
    queue.enqueue(e);
    cache.upsert(e);

    // El servidor confirma y la cola se vacía.
    queue.acknowledge(['a']);

    expect(queue.size).toBe(0);
    // La lista sigue teniendo qué mostrar. Sin esto, la pantalla queda vacía.
    expect(cache.read()).toHaveLength(1);
  });

  it('upsert reemplaza en lugar de duplicar', () => {
    cache.upsert(expense({ amountCents: 1000, updatedAt: '2026-01-15T12:00:00.000Z' }));
    cache.upsert(expense({ amountCents: 2000, updatedAt: '2026-01-15T13:00:00.000Z' }));

    expect(cache.read()).toHaveLength(1);
    expect(cache.read()[0]?.amountCents).toBe(2000);
  });

  it('el borrado lógico permanece en la copia para poder propagarse', () => {
    const e = expense({ id: 'a' });
    cache.upsert(e);
    cache.upsert({ ...e, deletedAt: '2026-01-16T00:00:00.000Z', updatedAt: '2026-01-16T00:00:00.000Z' });

    expect(cache.read()).toHaveLength(1);
    expect(cache.read()[0]?.deletedAt).toBeDefined();
  });

  it('usa una clave distinta a la de la cola: no se pisan entre sí', () => {
    queue.enqueue(expense({ id: 'en-cola' }));
    cache.write([expense({ id: 'en-cache' })]);

    expect(queue.read()[0]?.id).toBe('en-cola');
    expect(cache.read()[0]?.id).toBe('en-cache');
  });

  it('se recupera de una copia corrupta', () => {
    cache.write([expense()]);
    storage.corrupt('expenses:all');

    expect(() => cache.read()).not.toThrow();
    expect(cache.read()).toEqual([]);
  });

  it('se vacía por completo con clear', () => {
    cache.write([expense()]);
    cache.clear();
    expect(cache.read()).toEqual([]);
  });
});
