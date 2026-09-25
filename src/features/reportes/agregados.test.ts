import type { Category, Expense } from '@/types/expense';

import { porCategoria, porMes } from './agregados';

const CATEGORIAS = new Map<string, Category>([
  ['comida', { id: 'comida', name: 'Comida', color: '#F97316' }],
  ['hogar', { id: 'hogar', name: 'Hogar', color: '#22C55E' }],
]);

function gasto(g: Partial<Expense> & { occurredAt: string }): Expense {
  return {
    id: `${g.occurredAt}-${g.categoryId ?? 'comida'}-${g.amountCents ?? 0}`,
    amountCents: 100_00,
    currency: 'MXN',
    categoryId: 'comida',
    syncState: 'synced',
    updatedAt: g.occurredAt,
    ...g,
  };
}

describe('porCategoria', () => {
  it('sin gastos devuelve la lista vacía', () => {
    expect(porCategoria([], '2026-09', CATEGORIAS)).toEqual([]);
  });

  it('suma por categoría y ordena de mayor a menor', () => {
    const tajadas = porCategoria(
      [
        gasto({ occurredAt: '2026-09-01T10:00:00-07:00', amountCents: 100_00 }),
        gasto({
          occurredAt: '2026-09-02T10:00:00-07:00',
          amountCents: 300_00,
          categoryId: 'hogar',
        }),
        gasto({ occurredAt: '2026-09-03T10:00:00-07:00', amountCents: 50_00 }),
      ],
      '2026-09',
      CATEGORIAS,
    );

    expect(tajadas.map((t) => [t.categoryId, t.totalCents])).toEqual([
      ['hogar', 300_00],
      ['comida', 150_00],
    ]);
  });

  it('calcula el porcentaje sobre el total del periodo', () => {
    const tajadas = porCategoria(
      [
        gasto({ occurredAt: '2026-09-01T10:00:00-07:00', amountCents: 750_00 }),
        gasto({
          occurredAt: '2026-09-02T10:00:00-07:00',
          amountCents: 250_00,
          categoryId: 'hogar',
        }),
      ],
      '2026-09',
      CATEGORIAS,
    );
    expect(tajadas.map((t) => t.porcentaje)).toEqual([75, 25]);
  });

  it('resuelve nombre y color desde el catálogo', () => {
    const [tajada] = porCategoria(
      [gasto({ occurredAt: '2026-09-01T10:00:00-07:00' })],
      '2026-09',
      CATEGORIAS,
    );
    expect(tajada).toMatchObject({ nombre: 'Comida', color: '#F97316' });
  });

  /** Sin red el catálogo llega vacío: el id crudo informa más que un hueco. */
  it('cae al id cuando la categoría no está en el catálogo', () => {
    const [tajada] = porCategoria(
      [gasto({ occurredAt: '2026-09-01T10:00:00-07:00', categoryId: 'salud' })],
      '2026-09',
      new Map(),
    );
    expect(tajada?.nombre).toBe('salud');
  });

  it('ignora los borrados y los de otros meses', () => {
    const tajadas = porCategoria(
      [
        gasto({ occurredAt: '2026-09-01T10:00:00-07:00', amountCents: 100_00 }),
        gasto({
          occurredAt: '2026-09-02T10:00:00-07:00',
          amountCents: 900_00,
          deletedAt: '2026-09-03T10:00:00-07:00',
        }),
        gasto({ occurredAt: '2026-08-15T10:00:00-07:00', amountCents: 500_00 }),
      ],
      '2026-09',
      CATEGORIAS,
    );
    expect(tajadas).toHaveLength(1);
    expect(tajadas[0]?.totalCents).toBe(100_00);
  });

  /** BUG-002: el corte del periodo es en hora local, nunca en UTC. */
  it('clasifica por mes local', () => {
    const tajadas = porCategoria(
      [gasto({ occurredAt: '2026-09-30T23:50:00-07:00', amountCents: 100_00 })],
      '2026-09',
      CATEGORIAS,
    );
    expect(tajadas[0]?.totalCents).toBe(100_00);
  });
});

describe('porMes', () => {
  it('devuelve exactamente los meses pedidos, en orden cronológico', () => {
    const barras = porMes([], '2026-09', 6);
    expect(barras.map((b) => b.mes)).toEqual([
      '2026-04',
      '2026-05',
      '2026-06',
      '2026-07',
      '2026-08',
      '2026-09',
    ]);
  });

  it('cruza el fin de año hacia atrás', () => {
    expect(porMes([], '2026-02', 4).map((b) => b.mes)).toEqual([
      '2025-11',
      '2025-12',
      '2026-01',
      '2026-02',
    ]);
  });

  /**
   * Un mes vacío es información. Una gráfica que salta de julio a septiembre
   * porque agosto no tuvo gastos miente sobre la tendencia.
   */
  it('rellena con cero los meses sin movimiento', () => {
    const barras = porMes(
      [
        gasto({ occurredAt: '2026-07-10T10:00:00-07:00', amountCents: 500_00 }),
        gasto({ occurredAt: '2026-09-10T10:00:00-07:00', amountCents: 300_00 }),
      ],
      '2026-09',
      3,
    );
    expect(barras).toEqual([
      { mes: '2026-07', totalCents: 500_00 },
      { mes: '2026-08', totalCents: 0 },
      { mes: '2026-09', totalCents: 300_00 },
    ]);
  });

  it('suma todos los gastos de cada mes sin importar la categoría', () => {
    const barras = porMes(
      [
        gasto({ occurredAt: '2026-09-01T10:00:00-07:00', amountCents: 100_00 }),
        gasto({
          occurredAt: '2026-09-02T10:00:00-07:00',
          amountCents: 250_50,
          categoryId: 'hogar',
        }),
      ],
      '2026-09',
      1,
    );
    expect(barras[0]?.totalCents).toBe(350_50);
  });

  it('ignora los borrados', () => {
    const barras = porMes(
      [
        gasto({ occurredAt: '2026-09-01T10:00:00-07:00', amountCents: 100_00 }),
        gasto({
          occurredAt: '2026-09-02T10:00:00-07:00',
          amountCents: 900_00,
          deletedAt: '2026-09-03T10:00:00-07:00',
        }),
      ],
      '2026-09',
      1,
    );
    expect(barras[0]?.totalCents).toBe(100_00);
  });

  it('descarta los meses fuera de la ventana pedida', () => {
    const barras = porMes(
      [gasto({ occurredAt: '2025-01-10T10:00:00-07:00', amountCents: 999_00 })],
      '2026-09',
      3,
    );
    expect(barras.every((b) => b.totalCents === 0)).toBe(true);
  });

  it('un MonthKey inválido no revienta la pantalla', () => {
    expect(porMes([], 'septiembre', 6)).toEqual([]);
  });
});
