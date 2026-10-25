import { MoneyError, sumCents } from '@/shared/lib/money';
import type { Expense } from '@/types/expense';

import { distribuirEnSobres, rebalancearSobres } from './sobres';

function gasto(g: Partial<Expense> & { id: string; amountCents: number }): Expense {
  return {
    currency: 'MXN',
    categoryId: 'comida',
    occurredAt: '2026-10-15T14:20:00-07:00',
    syncState: 'synced',
    updatedAt: '2026-10-15T14:20:00-07:00',
    ...g,
  };
}

describe('distribuirEnSobres', () => {
  it('conserva al centavo el presupuesto global al repartir en tercios inexactos', () => {
    const sobres = distribuirEnSobres(
      10_000_00,
      [
        { categoryId: 'comida', peso: 1 },
        { categoryId: 'transporte', peso: 1 },
        { categoryId: 'hogar', peso: 1 },
      ],
      [],
      '2026-10',
    );

    expect(sobres.map((s) => s.asignadoCents)).toEqual([3_333_34, 3_333_33, 3_333_33]);
    expect(sumCents(sobres.map((s) => s.asignadoCents))).toBe(10_000_00);
  });

  it('clasifica cada sobre en normal, precaucion (80%) o excedido (100%) en puntos básicos', () => {
    const sobres = distribuirEnSobres(
      1_500_00,
      [
        { categoryId: 'comida', peso: 50 }, // 750.00
        { categoryId: 'transporte', peso: 30 }, // 450.00
        { categoryId: 'ocio', peso: 20 }, // 300.00
      ],
      [
        gasto({ id: 'g1', categoryId: 'comida', amountCents: 599_99 }), // < 80% (7999 bps)
        gasto({ id: 'g2', categoryId: 'transporte', amountCents: 360_00 }), // == 80% (8000 bps)
        gasto({ id: 'g3', categoryId: 'ocio', amountCents: 330_00 }), // 110% (11000 bps)
      ],
      '2026-10',
    );

    expect(sobres[0]).toMatchObject({
      categoryId: 'comida',
      asignadoCents: 750_00,
      gastadoCents: 599_99,
      disponibleCents: 150_01,
      consumoBps: 7_999,
      estadoUmbral: 'normal',
    });
    expect(sobres[1]).toMatchObject({
      categoryId: 'transporte',
      asignadoCents: 450_00,
      gastadoCents: 360_00,
      disponibleCents: 90_00,
      consumoBps: 8_000,
      estadoUmbral: 'precaucion',
    });
    expect(sobres[2]).toMatchObject({
      categoryId: 'ocio',
      asignadoCents: 300_00,
      gastadoCents: 330_00,
      disponibleCents: -30_00,
      consumoBps: 11_000,
      estadoUmbral: 'excedido',
    });
  });

  it('maneja sobres con asignación en cero con y sin gasto registrado', () => {
    const sobres = distribuirEnSobres(
      500_00,
      [
        { categoryId: 'comida', peso: 100 },
        { categoryId: 'lujo_congelado', peso: 0 },
        { categoryId: 'otro_cero', peso: 0 },
      ],
      [gasto({ id: 'g1', categoryId: 'lujo_congelado', amountCents: 25_00 })],
      '2026-10',
    );

    expect(sobres[1]).toMatchObject({
      asignadoCents: 0,
      gastadoCents: 25_00,
      disponibleCents: -25_00,
      consumoBps: 10_000,
      estadoUmbral: 'excedido',
    });
    expect(sobres[2]).toMatchObject({
      asignadoCents: 0,
      gastadoCents: 0,
      disponibleCents: 0,
      consumoBps: 0,
      estadoUmbral: 'normal',
    });
  });

  it('respeta el corte mensual en hora local e ignora gastos eliminados', () => {
    const sobres = distribuirEnSobres(
      1_000_00,
      [{ categoryId: 'comida', peso: 1 }],
      [
        // 23:55 del 31 de octubre en UTC-7 (06:55 del 1 de noviembre en UTC)
        gasto({
          id: 'fin-mes-local',
          occurredAt: '2026-10-31T23:55:00-07:00',
          amountCents: 200_00,
        }),
        gasto({
          id: 'borrado',
          occurredAt: '2026-10-12T10:00:00-07:00',
          amountCents: 500_00,
          deletedAt: '2026-10-13T09:00:00-07:00',
        }),
        gasto({
          id: 'mes-siguiente',
          occurredAt: '2026-11-01T00:05:00-07:00',
          amountCents: 300_00,
        }),
      ],
      '2026-10',
    );

    expect(sobres[0]?.gastadoCents).toBe(200_00);
    expect(sobres[0]?.disponibleCents).toBe(800_00);
  });

  it('rechaza presupuesto negativo, categorías vacías o duplicadas', () => {
    expect(() =>
      distribuirEnSobres(-100, [{ categoryId: 'comida', peso: 1 }], [], '2026-10'),
    ).toThrow(MoneyError);

    expect(() =>
      distribuirEnSobres(100_00, [{ categoryId: '   ', peso: 1 }], [], '2026-10'),
    ).toThrow(/categoryId/);

    expect(() =>
      distribuirEnSobres(
        100_00,
        [
          { categoryId: 'comida', peso: 1 },
          { categoryId: 'comida', peso: 2 },
        ],
        [],
        '2026-10',
      ),
    ).toThrow(/duplicada/);
  });
});

describe('rebalancearSobres', () => {
  it('transfiere saldo disponible entre sobres manteniendo constante el total presupuestado', () => {
    const iniciales = distribuirEnSobres(
      1_000_00,
      [
        { categoryId: 'hogar', peso: 60 }, // 600.00 asignado, 200.00 gastado -> 400.00 disp
        { categoryId: 'comida', peso: 30 }, // 300.00 asignado, 350.00 gastado -> -50.00 disp (excedido)
        { categoryId: 'salud', peso: 10 }, // 100.00 asignado, 0 gastado
      ],
      [
        gasto({ id: 'g1', categoryId: 'hogar', amountCents: 200_00 }),
        gasto({ id: 'g2', categoryId: 'comida', amountCents: 350_00 }),
      ],
      '2026-10',
    );

    const rebalanceados = rebalancearSobres(iniciales, 'hogar', 'comida', 200_00);

    expect(sumCents(rebalanceados.map((s) => s.asignadoCents))).toBe(1_000_00);
    expect(rebalanceados[0]).toMatchObject({
      categoryId: 'hogar',
      asignadoCents: 400_00,
      disponibleCents: 200_00,
      consumoBps: 5_000,
      estadoUmbral: 'normal',
    });
    expect(rebalanceados[1]).toMatchObject({
      categoryId: 'comida',
      asignadoCents: 500_00,
      gastadoCents: 350_00,
      disponibleCents: 150_00,
      consumoBps: 7_000,
      estadoUmbral: 'normal',
    });
    // El tercer sobre queda intacto
    expect(rebalanceados[2]).toEqual(iniciales[2]);
  });

  it('impide transferir más de lo disponible o usar parámetros inválidos', () => {
    const sobres = distribuirEnSobres(
      500_00,
      [
        { categoryId: 'comida', peso: 50 },
        { categoryId: 'ocio', peso: 50 },
      ],
      [gasto({ id: 'g1', categoryId: 'comida', amountCents: 200_00 })],
      '2026-10',
    );

    // comida solo tiene 50.00 disponibles
    expect(() => rebalancearSobres(sobres, 'comida', 'ocio', 50_01)).toThrow(MoneyError);
    expect(() => rebalancearSobres(sobres, 'comida', 'ocio', 0)).toThrow(MoneyError);
    expect(() => rebalancearSobres(sobres, 'comida', 'ocio', 12.5)).toThrow(MoneyError);
    expect(() => rebalancearSobres(sobres, 'comida', 'comida', 10_00)).toThrow(/distintos/);
    expect(() => rebalancearSobres(sobres, 'inexistente', 'ocio', 10_00)).toThrow(
      /origen/,
    );
    expect(() => rebalancearSobres(sobres, 'ocio', 'inexistente', 10_00)).toThrow(
      /destino/,
    );
  });
});
