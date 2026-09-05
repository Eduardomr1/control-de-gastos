import type { Expense } from '@/types/expense';
import { reconcile } from './sync';

function expense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: 'exp-1',
    amountCents: 5000,
    currency: 'MXN',
    categoryId: 'comida',
    occurredAt: '2026-01-15T12:00:00-07:00',
    syncState: 'synced',
    updatedAt: '2026-01-15T12:00:00.000Z',
    ...overrides,
  };
}

describe('reconcile', () => {
  it('conserva lo local cuando no hay nada remoto', () => {
    const local = [expense({ id: 'a' }), expense({ id: 'b' })];
    expect(reconcile(local, [])).toHaveLength(2);
  });

  it('incorpora gastos remotos que no existen en local', () => {
    const merged = reconcile([expense({ id: 'a' })], [expense({ id: 'b' })]);
    expect(merged.map((e) => e.id).sort()).toEqual(['a', 'b']);
  });

  // TC-022 — mismo gasto editado en dos dispositivos.
  it('gana la versión más reciente en una colisión', () => {
    const local = [
      expense({ amountCents: 1000, updatedAt: '2026-01-15T12:00:00.000Z' }),
    ];
    const remote = [
      expense({ amountCents: 2000, updatedAt: '2026-01-15T18:00:00.000Z' }),
    ];

    expect(reconcile(local, remote)[0]?.amountCents).toBe(2000);
  });

  it('conserva la edición local si es más reciente que la remota', () => {
    const local = [
      expense({ amountCents: 9999, updatedAt: '2026-01-16T08:00:00.000Z' }),
    ];
    const remote = [
      expense({ amountCents: 2000, updatedAt: '2026-01-15T18:00:00.000Z' }),
    ];

    expect(reconcile(local, remote)[0]?.amountCents).toBe(9999);
  });

  // TC-023 — el borrado no debe revivir.
  it('el borrado remoto prevalece sobre una edición local', () => {
    const local = [expense({ amountCents: 9999, updatedAt: '2026-01-16T08:00:00.000Z' })];
    const remote = [
      expense({ deletedAt: '2026-01-15T18:00:00.000Z', updatedAt: '2026-01-15T18:00:00.000Z' }),
    ];

    expect(reconcile(local, remote)[0]?.deletedAt).toBeDefined();
  });

  it('es idempotente: reconciliar dos veces da el mismo resultado', () => {
    const local = [expense({ id: 'a' })];
    const remote = [expense({ id: 'a', updatedAt: '2026-01-16T00:00:00.000Z' })];

    const once = reconcile(local, remote);
    const twice = reconcile(once, remote);
    expect(twice).toEqual(once);
  });

  it('converge al mismo resultado sin importar el orden de llegada', () => {
    const a = expense({ id: 'x', amountCents: 100, updatedAt: '2026-01-15T10:00:00.000Z' });
    const b = expense({ id: 'x', amountCents: 200, updatedAt: '2026-01-15T20:00:00.000Z' });

    expect(reconcile([a], [b])[0]?.amountCents).toBe(
      reconcile([b], [a])[0]?.amountCents,
    );
  });

  it('maneja ambos lados vacíos', () => {
    expect(reconcile([], [])).toEqual([]);
  });
});
