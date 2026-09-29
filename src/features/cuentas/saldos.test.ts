import type { Expense } from '@/types/expense';

import { saldosPorCuenta, saldoTotal, type MovimientoDeIngreso } from './saldos';
import { CUENTA_GENERAL, type Cuenta } from './types';

function cuenta(c: Partial<Cuenta> & { id: string }): Cuenta {
  return {
    nombre: 'General',
    tipo: 'efectivo',
    saldoInicialCents: 0,
    currency: 'MXN',
    syncState: 'synced',
    updatedAt: '2026-09-01T09:00:00-07:00',
    ...c,
  };
}

function gasto(g: Partial<Expense> & { amountCents: number }): Expense {
  return {
    id: `g-${g.amountCents}-${g.cuentaId ?? 'sin'}`,
    currency: 'MXN',
    categoryId: 'comida',
    occurredAt: '2026-09-10T10:00:00-07:00',
    syncState: 'synced',
    updatedAt: '2026-09-10T10:00:00-07:00',
    ...g,
  };
}

function ingreso(amountCents: number, cuentaId?: string): MovimientoDeIngreso {
  return cuentaId === undefined ? { amountCents } : { amountCents, cuentaId };
}

const GENERAL = cuenta({ id: CUENTA_GENERAL });
const DEBITO = cuenta({ id: 'debito', nombre: 'Débito', tipo: 'debito' });

describe('saldosPorCuenta', () => {
  it('sin movimientos el saldo es el inicial', () => {
    const [saldo] = saldosPorCuenta(
      [cuenta({ id: 'a', saldoInicialCents: 1_000_00 })],
      [],
      [],
    );
    expect(saldo?.saldoCents).toBe(1_000_00);
  });

  it('saldo = inicial + ingresos − gastos', () => {
    const [saldo] = saldosPorCuenta(
      [cuenta({ id: 'a', saldoInicialCents: 500_00 })],
      [gasto({ amountCents: 200_00, cuentaId: 'a' })],
      [ingreso(1_000_00, 'a')],
    );
    expect(saldo).toMatchObject({
      gastosCents: 200_00,
      ingresosCents: 1_000_00,
      saldoCents: 1_300_00,
    });
  });

  it('el saldo puede ser negativo, y no se topa en cero', () => {
    const [saldo] = saldosPorCuenta([cuenta({ id: 'a' })], [gasto({ amountCents: 300_00, cuentaId: 'a' })], []);
    expect(saldo?.saldoCents).toBe(-300_00);
  });

  it('no mezcla movimientos entre cuentas', () => {
    const saldos = saldosPorCuenta(
      [GENERAL, DEBITO],
      [
        gasto({ amountCents: 100_00, cuentaId: CUENTA_GENERAL }),
        gasto({ amountCents: 700_00, cuentaId: 'debito' }),
      ],
      [],
    );
    expect(saldos.map((s) => s.saldoCents)).toEqual([-100_00, -700_00]);
  });

  /**
   * La migración v6 llena `cuenta_id` en toda fila existente, pero un gasto que
   * vuelve de Supabase llega sin ella. Dejarlo fuera de todos los saldos haría
   * que la suma de las cuentas no cuadrara con el total.
   */
  it('cuenta en General los movimientos sin cuenta', () => {
    const saldos = saldosPorCuenta([GENERAL, DEBITO], [gasto({ amountCents: 250_00 })], []);
    expect(saldos[0]?.gastosCents).toBe(250_00);
    expect(saldos[1]?.gastosCents).toBe(0);
  });

  it('ignora los movimientos borrados', () => {
    const [saldo] = saldosPorCuenta(
      [cuenta({ id: 'a' })],
      [
        gasto({ amountCents: 100_00, cuentaId: 'a' }),
        gasto({
          amountCents: 900_00,
          cuentaId: 'a',
          deletedAt: '2026-09-11T10:00:00-07:00',
        }),
      ],
      [],
    );
    expect(saldo?.gastosCents).toBe(100_00);
  });

  it('omite las cuentas borradas', () => {
    const saldos = saldosPorCuenta(
      [GENERAL, cuenta({ id: 'vieja', deletedAt: '2026-09-01T09:00:00-07:00' })],
      [],
      [],
    );
    expect(saldos).toHaveLength(1);
  });

  it('una cuenta sin movimientos aparece en cero, no desaparece', () => {
    const saldos = saldosPorCuenta([GENERAL, DEBITO], [], []);
    expect(saldos).toHaveLength(2);
    expect(saldos[1]?.saldoCents).toBe(0);
  });

  /** BUG-001: la suma va por sumCents, no por reduce sobre flotantes. */
  it('no arrastra residuo de punto flotante', () => {
    const [saldo] = saldosPorCuenta(
      [cuenta({ id: 'a' })],
      [gasto({ amountCents: 10, cuentaId: 'a' }), gasto({ amountCents: 20, cuentaId: 'a' })],
      [],
    );
    expect(saldo?.gastosCents).toBe(30);
  });
});

describe('saldoTotal', () => {
  it('suma los saldos de todas las cuentas', () => {
    const saldos = saldosPorCuenta(
      [cuenta({ id: 'a', saldoInicialCents: 1_000_00 }), cuenta({ id: 'b', saldoInicialCents: 500_00 })],
      [gasto({ amountCents: 200_00, cuentaId: 'a' })],
      [ingreso(300_00, 'b')],
    );
    expect(saldoTotal(saldos)).toBe(1_600_00);
  });

  it('sin cuentas devuelve cero', () => {
    expect(saldoTotal([])).toBe(0);
  });

  /**
   * El criterio de salida de la Fase 5: la migración no puede perder un solo
   * movimiento. Con todo bajo General, el total consolidado tiene que ser
   * exactamente el mismo que antes de que existieran las cuentas.
   */
  it('con todo en General el total es el mismo que sin cuentas', () => {
    const gastos = [
      gasto({ amountCents: 123_45 }),
      gasto({ amountCents: 67_89 }),
      gasto({ amountCents: 1_000_01 }),
    ];
    const antes = -(123_45 + 67_89 + 1_000_01);
    expect(saldoTotal(saldosPorCuenta([GENERAL], gastos, []))).toBe(antes);
  });
});
