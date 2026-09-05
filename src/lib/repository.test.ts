/**
 * El despachador elige backend segun haya credenciales. Sin ellas debe caer al
 * de memoria sin tocar Supabase: es lo que permite correr esta misma suite y
 * abrir la app sin backend.
 */

import {
  createExpense,
  deleteExpense,
  draftOccurredAt,
  fetchCategories,
  fetchExpenses,
  isRemote,
} from './repository';
import { monthKeyOf } from './date';

describe('repository (despachador)', () => {
  it('usa el backend local cuando no hay credenciales', () => {
    expect(isRemote).toBe(false);
  });

  it('delega la consulta de categorías', async () => {
    const categories = await fetchCategories();
    expect(categories.length).toBeGreaterThan(0);
  });

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
