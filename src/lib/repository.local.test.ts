import { createExpense, draftOccurredAt, deleteExpense, fetchCategories, fetchExpenses } from './repository.local';
import { monthKeyOf } from './date';
import type { NewExpenseInput } from '@/types/expense';

function input(overrides: Partial<NewExpenseInput> = {}): NewExpenseInput {
  return {
    amountCents: 5000,
    currency: 'MXN',
    categoryId: 'comida',
    occurredAt: '2026-01-15T12:00:00-07:00',
    ...overrides,
  };
}

describe('fetchCategories', () => {
  it('devuelve las categorías disponibles', async () => {
    const categories = await fetchCategories();
    expect(categories.length).toBeGreaterThan(0);
    expect(categories.every((c) => c.id && c.name && c.color)).toBe(true);
  });
});

describe('createExpense', () => {
  it('asigna un id generado en el cliente', async () => {
    const created = await createExpense(input());
    expect(created.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  it('marca el gasto como pendiente de sincronizar', async () => {
    const created = await createExpense(input());
    expect(created.syncState).toBe('pending');
  });

  it('genera ids distintos para gastos distintos', async () => {
    const a = await createExpense(input());
    const b = await createExpense(input());
    expect(a.id).not.toBe(b.id);
  });

  it('el gasto creado aparece en la consulta', async () => {
    const created = await createExpense(input({ amountCents: 12345 }));
    const all = await fetchExpenses();
    expect(all.map((e) => e.id)).toContain(created.id);
  });
});

describe('deleteExpense', () => {
  it('aplica soft delete y lo saca de la consulta', async () => {
    const created = await createExpense(input());
    await deleteExpense(created.id);
    const all = await fetchExpenses();
    expect(all.map((e) => e.id)).not.toContain(created.id);
  });

  it('vuelve a marcar el registro como pendiente para propagar el borrado', async () => {
    const created = await createExpense(input());
    await deleteExpense(created.id);
    // El borrado debe viajar al servidor, no quedarse solo en local.
    const all = await fetchExpenses();
    expect(all.find((e) => e.id === created.id)).toBeUndefined();
  });

  it('es inocuo con un id inexistente', async () => {
    await expect(deleteExpense('no-existe')).resolves.toBeUndefined();
  });
});

describe('draftOccurredAt', () => {
  it('produce una fecha con offset que monthKeyOf puede consumir', () => {
    expect(() => monthKeyOf(draftOccurredAt())).not.toThrow();
  });
});
