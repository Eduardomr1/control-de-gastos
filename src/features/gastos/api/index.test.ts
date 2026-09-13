/**
 * El despachador elige backend segun haya credenciales. Sin ellas debe caer al
 * de memoria sin tocar Supabase: es lo que permite correr esta misma suite y
 * abrir la app sin backend. La bandera isRemote en si se prueba en
 * shared/lib/environment.test.ts, y la consulta de categorías en
 * features/categorias/api/index.test.ts: ninguna de las dos vive ya aquí.
 */

import { createExpense, deleteExpense, draftOccurredAt, fetchExpenses } from '.';
import { monthKeyOf } from '@/shared/lib/date';

describe('gastos (despachador)', () => {
  it('delega la creación y la consulta de gastos', async () => {
    const created = await createExpense({
      amountCents: 7500,
      currency: 'MXN',
      categoryId: 'hogar',
      occurredAt: '2026-01-15T12:00:00-07:00',
    });

    const all = await fetchExpenses();
    expect(all.map((e) => e.id)).toContain(created.id);
  });

  it('delega el borrado', async () => {
    const created = await createExpense({
      amountCents: 100,
      currency: 'MXN',
      categoryId: 'otros',
      occurredAt: '2026-01-15T12:00:00-07:00',
    });

    await deleteExpense(created.id);
    const all = await fetchExpenses();
    expect(all.map((e) => e.id)).not.toContain(created.id);
  });

  it('reexporta draftOccurredAt con offset utilizable', () => {
    expect(() => monthKeyOf(draftOccurredAt())).not.toThrow();
  });
});
