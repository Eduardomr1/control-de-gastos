import {
  MappingError,
  expenseToRpcArgs,
  offsetMinutesOf,
  rowToExpense,
  toLocalIso,
} from './mappers';
import { monthKeyOf } from './date';
import type { ExpenseRow } from '@/types/database';
import type { Expense } from '@/types/expense';

describe('offsetMinutesOf', () => {
  it.each([
    ['2026-01-31T23:50:00-07:00', -420],
    ['2026-01-31T23:50:00+09:00', 540],
    ['2026-01-31T23:50:00Z', 0],
    ['2026-01-31T23:50:00+05:30', 330],
    ['2026-01-31T23:50:00-03:30', -210],
  ])('extrae el offset de %s como %i minutos', (iso, expected) => {
    expect(offsetMinutesOf(iso)).toBe(expected);
  });

  it('rechaza un ISO sin offset', () => {
    expect(() => offsetMinutesOf('2026-01-31T23:50:00')).toThrow(MappingError);
  });
});

describe('toLocalIso', () => {
  // El viaje de ida y vuelta es donde se pierde el mes local si el mapeo falla.
  it('reconstruye la hora local de Culiacán desde el instante UTC', () => {
    // Las 23:50 del 31 de enero en UTC-7 son las 06:50 del 1 de febrero en UTC.
    const local = toLocalIso('2026-02-01T06:50:00Z', -420);
    expect(local).toBe('2026-01-31T23:50:00-07:00');
  });

  it('preserva el mes local tras el viaje de ida y vuelta', () => {
    const original = '2026-01-31T23:50:00-07:00';
    const utc = new Date(original).toISOString();
    const back = toLocalIso(utc, offsetMinutesOf(original));

    expect(monthKeyOf(back)).toBe('2026-01');
    expect(monthKeyOf(back)).toBe(monthKeyOf(original));
  });

  it('funciona con offsets positivos', () => {
    expect(toLocalIso('2026-02-28T15:00:00Z', 540)).toBe('2026-03-01T00:00:00+09:00');
  });

  it('rechaza un timestamp inválido', () => {
    expect(() => toLocalIso('no-es-fecha', 0)).toThrow(MappingError);
  });
});

describe('rowToExpense', () => {
  function row(overrides: Partial<ExpenseRow> = {}): ExpenseRow {
    return {
      id: 'exp-1',
      user_id: 'user-1',
      amount_cents: 123456,
      currency: 'MXN',
      category_id: 'comida',
      occurred_at: '2026-02-01T06:50:00Z',
      tz_offset_minutes: -420,
      note: null,
      created_at: '2026-02-01T06:50:00Z',
      updated_at: '2026-02-01T06:50:00Z',
      deleted_at: null,
      month_key: '2026-01',
      ...overrides,
    };
  }

  it('conserva el monto como entero de centavos', () => {
    expect(rowToExpense(row()).amountCents).toBe(123456);
  });

  it('reconstruye occurredAt en hora local', () => {
    expect(monthKeyOf(rowToExpense(row()).occurredAt)).toBe('2026-01');
  });

  it('marca como sincronizado lo que viene del servidor', () => {
    expect(rowToExpense(row()).syncState).toBe('synced');
  });

  it('omite la nota cuando es nula en lugar de mapearla a null', () => {
    expect(rowToExpense(row())).not.toHaveProperty('note');
  });

  it('conserva la nota cuando existe', () => {
    expect(rowToExpense(row({ note: 'taxi al aeropuerto' })).note).toBe(
      'taxi al aeropuerto',
    );
  });

  it('propaga el borrado lógico', () => {
    const deleted = rowToExpense(row({ deleted_at: '2026-02-02T10:00:00Z' }));
    expect(deleted.deletedAt).toBe('2026-02-02T10:00:00Z');
  });

  it('el month_key del servidor coincide con el que calcula el cliente', () => {
    const r = row();
    expect(monthKeyOf(rowToExpense(r).occurredAt)).toBe(r.month_key);
  });
});

describe('expenseToRpcArgs', () => {
  function expense(overrides: Partial<Expense> = {}): Expense {
    return {
      id: 'exp-1',
      amountCents: 5000,
      currency: 'MXN',
      categoryId: 'comida',
      occurredAt: '2026-01-31T23:50:00-07:00',
      syncState: 'pending',
      updatedAt: '2026-01-31T23:50:00.000Z',
      ...overrides,
    };
  }

  it('deriva el offset de zona horaria desde occurredAt', () => {
    expect(expenseToRpcArgs(expense()).p_tz_offset_minutes).toBe(-420);
  });

  it('envía el monto como entero de centavos', () => {
    expect(expenseToRpcArgs(expense()).p_amount_cents).toBe(5000);
  });

  it('convierte una nota ausente en null para la base de datos', () => {
    expect(expenseToRpcArgs(expense()).p_note).toBeNull();
  });

  it('conserva la nota cuando existe', () => {
    expect(expenseToRpcArgs(expense({ note: 'café' })).p_note).toBe('café');
  });

  it('propaga el borrado lógico', () => {
    const args = expenseToRpcArgs(expense({ deletedAt: '2026-02-01T10:00:00.000Z' }));
    expect(args.p_deleted_at).toBe('2026-02-01T10:00:00.000Z');
  });

  it('envía null cuando el gasto no está borrado', () => {
    expect(expenseToRpcArgs(expense()).p_deleted_at).toBeNull();
  });
});
