import { detectarDuplicados } from './duplicados';
import type { Expense } from '@/types/expense';

function mockExpense(data: Partial<Expense> = {}): Expense {
  return {
    id: 'exp-1',
    amountCents: 15000,
    currency: 'MXN',
    categoryId: 'cat-food',
    occurredAt: '2026-10-25T14:00:00Z',
    syncState: 'synced',
    updatedAt: '2026-10-25T14:00:00Z',
    ...data,
  };
}

describe('detectarDuplicados', () => {
  it('detecta duplicado exacto dentro de ventana de 5 minutos', () => {
    const a = mockExpense({ id: 'a', occurredAt: '2026-10-25T14:00:00Z' });
    const b = mockExpense({ id: 'b', occurredAt: '2026-10-25T14:02:30Z' }); // 2.5 min después

    const res = detectarDuplicados([a, b], 5);
    expect(res).toHaveLength(1);
    expect(res[0]?.original.id).toBe('a');
    expect(res[0]?.candidato.id).toBe('b');
    expect(res[0]?.diferenciaMinutos).toBe(2.5);
  });

  it('ignora transacciones fuera de la ventana de tiempo', () => {
    const a = mockExpense({ id: 'a', occurredAt: '2026-10-25T10:00:00Z' });
    const b = mockExpense({ id: 'b', occurredAt: '2026-10-25T12:00:00Z' }); // 2 horas después

    const res = detectarDuplicados([a, b], 10);
    expect(res).toHaveLength(0);
  });

  it('ignora transacciones marcadas como eliminadas', () => {
    const a = mockExpense({ id: 'a', occurredAt: '2026-10-25T14:00:00Z', deletedAt: '2026-10-25T14:05:00Z' });
    const b = mockExpense({ id: 'b', occurredAt: '2026-10-25T14:01:00Z' });

    const res = detectarDuplicados([a, b], 10);
    expect(res).toHaveLength(0);
  });
});
