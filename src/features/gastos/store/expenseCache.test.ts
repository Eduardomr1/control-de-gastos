import type { Expense } from '@/types/expense';
import { expenseCache } from './expenseCache';
import { SyncQueue, type QueueStorage } from './syncQueue';

/**
 * En Node no hay binding nativo de expo-sqlite, así que expenseCache cae a
 * memoria (ver su propio comentario). Esa es exactamente la ruta que corre en
 * CI, y la que estas pruebas verifican. La persistencia real en disco —
 * sobrevivir a un reinicio, recuperarse de un archivo corrupto— es propiedad
 * de expenseDb.ts (SQLite), que queda fuera de cobertura unitaria por lo
 * mismo que collectCoverageFrom lo excluye: se verifica en el dispositivo, no
 * en Node. Ver docs/arquitectura/plan-implementacion-feature-first.md, DoD de
 * la Fase 3.
 */

class FakeQueueStorage implements QueueStorage {
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

beforeEach(() => {
  expenseCache.clear();
});

describe('expenseCache', () => {
  it('empieza vacía', () => {
    expect(expenseCache.read()).toEqual([]);
  });

  it('conserva lo que se le escribe', () => {
    expenseCache.write([expense({ id: 'a' }), expense({ id: 'b' })]);
    expect(expenseCache.read()).toHaveLength(2);
  });

  // BUG-012 — la cola se vacía al confirmarse; la copia local no.
  it('conserva los gastos aunque la cola se vacíe tras sincronizar', () => {
    const queue = new SyncQueue(new FakeQueueStorage());
    const e = expense({ id: 'a' });
    queue.enqueue(e);
    expenseCache.upsert(e);

    // El servidor confirma y la cola se vacía.
    queue.acknowledge(['a']);

    expect(queue.size).toBe(0);
    // La lista sigue teniendo qué mostrar. Sin esto, la pantalla queda vacía.
    expect(expenseCache.read()).toHaveLength(1);
  });

  it('upsert reemplaza en lugar de duplicar', () => {
    expenseCache.upsert(expense({ amountCents: 1000, updatedAt: '2026-01-15T12:00:00.000Z' }));
    expenseCache.upsert(expense({ amountCents: 2000, updatedAt: '2026-01-15T13:00:00.000Z' }));

    expect(expenseCache.read()).toHaveLength(1);
    expect(expenseCache.read()[0]?.amountCents).toBe(2000);
  });

  it('el borrado lógico permanece en la copia para poder propagarse', () => {
    const e = expense({ id: 'a' });
    expenseCache.upsert(e);
    expenseCache.upsert({
      ...e,
      deletedAt: '2026-01-16T00:00:00.000Z',
      updatedAt: '2026-01-16T00:00:00.000Z',
    });

    expect(expenseCache.read()).toHaveLength(1);
    expect(expenseCache.read()[0]?.deletedAt).toBeDefined();
  });

  it('se vacía por completo con clear', () => {
    expenseCache.write([expense()]);
    expenseCache.clear();
    expect(expenseCache.read()).toEqual([]);
  });
});
