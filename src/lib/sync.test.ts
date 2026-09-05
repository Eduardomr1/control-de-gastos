import type { Expense } from '@/types/expense';
import { dedupeQueue, resolveConflict } from './sync';

function expense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: 'exp-1',
    amountCents: 5000,
    currency: 'MXN',
    categoryId: 'cat-comida',
    occurredAt: '2026-01-15T12:00:00-07:00',
    syncState: 'pending',
    updatedAt: '2026-01-15T12:00:00.000Z',
    ...overrides,
  };
}

describe('resolveConflict', () => {
  // CASO QA #3 — mismo gasto editado en dos dispositivos.
  it('gana la edición más reciente', () => {
    const local = expense({ amountCents: 7000, updatedAt: '2026-01-15T13:00:00.000Z' });
    const remote = expense({ amountCents: 6000, updatedAt: '2026-01-15T12:30:00.000Z' });

    const result = resolveConflict(local, remote);
    expect(result.resolution).toBe('local');
    expect(result.winner.amountCents).toBe(7000);
  });

  it('resuelve igual sin importar el orden de los argumentos', () => {
    const a = expense({ amountCents: 7000, updatedAt: '2026-01-15T13:00:00.000Z' });
    const b = expense({ amountCents: 6000, updatedAt: '2026-01-15T12:30:00.000Z' });

    expect(resolveConflict(a, b).winner.amountCents).toBe(
      resolveConflict(b, a).winner.amountCents,
    );
  });

  it('desempata de forma determinista cuando los timestamps son idénticos', () => {
    const local = expense({ amountCents: 1000 });
    const remote = expense({ amountCents: 2000 });

    const result = resolveConflict(local, remote);
    expect(result.wasTie).toBe(true);
    // Sin desempate fijo, dos dispositivos divergirían aquí para siempre.
    expect(resolveConflict(local, remote).winner.amountCents).toBe(
      resolveConflict(local, remote).winner.amountCents,
    );
  });

  it('el borrado gana sobre una edición posterior', () => {
    const deleted = expense({
      deletedAt: '2026-01-15T12:10:00.000Z',
      updatedAt: '2026-01-15T12:10:00.000Z',
    });
    const edited = expense({
      amountCents: 9999,
      updatedAt: '2026-01-15T14:00:00.000Z',
    });

    expect(resolveConflict(deleted, edited).winner.deletedAt).toBeDefined();
  });

  it('rechaza reconciliar registros con distinto id', () => {
    expect(() => resolveConflict(expense(), expense({ id: 'exp-2' }))).toThrow();
  });
});

describe('dedupeQueue', () => {
  // CASO QA #1 — doble tap rápido en "Guardar".
  it('colapsa dos envíos del mismo gasto en uno solo', () => {
    const queue = [expense(), expense()];
    expect(dedupeQueue(queue)).toHaveLength(1);
  });

  it('conserva gastos distintos', () => {
    const queue = [expense(), expense({ id: 'exp-2' }), expense({ id: 'exp-3' })];
    expect(dedupeQueue(queue)).toHaveLength(3);
  });

  it('conserva la versión más reciente al deduplicar', () => {
    const queue = [
      expense({ amountCents: 1000, updatedAt: '2026-01-15T12:00:00.000Z' }),
      expense({ amountCents: 2000, updatedAt: '2026-01-15T12:05:00.000Z' }),
    ];
    expect(dedupeQueue(queue)[0]?.amountCents).toBe(2000);
  });

  it('maneja una cola vacía', () => {
    expect(dedupeQueue([])).toEqual([]);
  });
});

describe('resolveConflict — casos de borde', () => {
  it('el borrado remoto gana sobre una edición local', () => {
    const local = expense({ amountCents: 9999, updatedAt: '2026-01-15T14:00:00.000Z' });
    const remote = expense({
      deletedAt: '2026-01-15T12:10:00.000Z',
      updatedAt: '2026-01-15T12:10:00.000Z',
    });

    const result = resolveConflict(local, remote);
    expect(result.resolution).toBe('remote');
    expect(result.winner.deletedAt).toBeDefined();
  });

  it('gana el remoto cuando su edición es más reciente', () => {
    const local = expense({ updatedAt: '2026-01-15T12:00:00.000Z' });
    const remote = expense({ updatedAt: '2026-01-15T18:00:00.000Z' });
    expect(resolveConflict(local, remote).resolution).toBe('remote');
  });

  it('rechaza un updatedAt inválido en lugar de resolver al azar', () => {
    expect(() =>
      resolveConflict(expense({ updatedAt: 'ayer' }), expense()),
    ).toThrow();
  });
});
