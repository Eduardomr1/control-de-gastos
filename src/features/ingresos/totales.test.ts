import { ingresosDelMes } from './totales';
import type { Income } from './types';

function ingreso(parcial: Partial<Income> & { occurredAt: string }): Income {
  return {
    id: parcial.occurredAt,
    amountCents: 100_00,
    currency: 'MXN',
    fuente: 'Sueldo',
    syncState: 'synced',
    updatedAt: '2026-09-21T10:00:00-07:00',
    ...parcial,
  };
}

describe('ingresosDelMes', () => {
  it('suma solo los del mes pedido', () => {
    const total = ingresosDelMes(
      [
        ingreso({ occurredAt: '2026-09-01T10:00:00-07:00', amountCents: 500_00 }),
        ingreso({ occurredAt: '2026-09-28T10:00:00-07:00', amountCents: 250_50 }),
        ingreso({ occurredAt: '2026-08-31T10:00:00-07:00', amountCents: 999_99 }),
      ],
      '2026-09',
    );
    expect(total).toBe(750_50);
  });

  it('devuelve cero cuando el mes no tiene ingresos', () => {
    expect(ingresosDelMes([ingreso({ occurredAt: '2026-08-10T10:00:00-07:00' })], '2026-09')).toBe(
      0,
    );
  });

  it('devuelve cero con la lista vacía', () => {
    expect(ingresosDelMes([], '2026-09')).toBe(0);
  });

  it('ignora los borrados', () => {
    const total = ingresosDelMes(
      [
        ingreso({ occurredAt: '2026-09-01T10:00:00-07:00', amountCents: 500_00 }),
        ingreso({
          occurredAt: '2026-09-02T10:00:00-07:00',
          amountCents: 300_00,
          deletedAt: '2026-09-03T10:00:00-07:00',
        }),
      ],
      '2026-09',
    );
    expect(total).toBe(500_00);
  });

  /**
   * BUG-002 aplicado a ingresos: el periodo se decide por la hora LOCAL del
   * dispositivo, no por UTC. Un ingreso de las 23:50 del 30 de septiembre en
   * Culiacán (-07:00) es de septiembre, aunque en UTC ya sea 1 de octubre.
   */
  it('clasifica por mes local, no por UTC', () => {
    const fin = ingreso({ occurredAt: '2026-09-30T23:50:00-07:00', amountCents: 100_00 });
    expect(ingresosDelMes([fin], '2026-09')).toBe(100_00);
    expect(ingresosDelMes([fin], '2026-10')).toBe(0);
  });

  /**
   * La suma va por sumCents y no por reduce: 0.1 + 0.2 !== 0.3 en IEEE-754, y
   * los centavos enteros son justo la decisión que lo evita (BUG-001).
   */
  it('no arrastra residuo de punto flotante', () => {
    const total = ingresosDelMes(
      [
        ingreso({ occurredAt: '2026-09-01T10:00:00-07:00', amountCents: 10 }),
        ingreso({ occurredAt: '2026-09-02T10:00:00-07:00', amountCents: 20 }),
      ],
      '2026-09',
    );
    expect(total).toBe(30);
  });
});
