import type { Category, Expense } from '@/types/expense';

import {
  filasExportables,
  nombreDeArchivo,
  rangoDelMes,
  type IngresoExportable,
} from './exportar';

const CATEGORIAS = new Map<string, Category>([
  ['comida', { id: 'comida', name: 'Comida', color: '#F97316' }],
]);
const CUENTAS = new Map<string, string>([
  ['c-1', 'Débito BBVA'],
  ['c-2', 'Efectivo'],
]);
const SEPTIEMBRE = { desde: '2026-09-01', hasta: '2026-09-30' };

function gasto(g: Partial<Expense> & { occurredAt: string }): Expense {
  return {
    id: g.occurredAt,
    amountCents: 100_00,
    currency: 'MXN',
    categoryId: 'comida',
    syncState: 'synced',
    updatedAt: g.occurredAt,
    ...g,
  };
}

function ingreso(i: Partial<IngresoExportable> & { occurredAt: string }): IngresoExportable {
  return { amountCents: 1_000_00, fuente: 'Sueldo', ...i };
}

describe('filasExportables', () => {
  it('mezcla gastos e ingresos', () => {
    const filas = filasExportables(
      [gasto({ occurredAt: '2026-09-10T10:00:00-07:00' })],
      [ingreso({ occurredAt: '2026-09-15T10:00:00-07:00' })],
      CATEGORIAS,
      CUENTAS,
      SEPTIEMBRE,
    );
    expect(filas.map((f) => f.tipo)).toEqual(['Gasto', 'Ingreso']);
  });

  /**
   * Al revés que la lista de la app, que muestra lo último arriba: un export
   * se lee como un estado de cuenta, de principio a fin.
   */
  it('ordena de la más antigua a la más reciente', () => {
    const filas = filasExportables(
      [
        gasto({ occurredAt: '2026-09-20T10:00:00-07:00' }),
        gasto({ occurredAt: '2026-09-05T10:00:00-07:00' }),
      ],
      [ingreso({ occurredAt: '2026-09-12T10:00:00-07:00' })],
      CATEGORIAS,
      CUENTAS,
      SEPTIEMBRE,
    );
    expect(filas.map((f) => f.fecha.slice(0, 10))).toEqual([
      '2026-09-05',
      '2026-09-12',
      '2026-09-20',
    ]);
  });

  it('resuelve el nombre de la categoría y de la cuenta', () => {
    const [fila] = filasExportables(
      [gasto({ occurredAt: '2026-09-10T10:00:00-07:00', cuentaId: 'c-1' })],
      [],
      CATEGORIAS,
      CUENTAS,
      SEPTIEMBRE,
    );
    expect(fila).toMatchObject({ concepto: 'Comida', cuenta: 'Débito BBVA' });
  });

  it('cae al id cuando la categoría no está en el catálogo', () => {
    const [fila] = filasExportables(
      [gasto({ occurredAt: '2026-09-10T10:00:00-07:00', categoryId: 'salud' })],
      [],
      CATEGORIAS,
      CUENTAS,
      SEPTIEMBRE,
    );
    expect(fila?.concepto).toBe('salud');
  });

  /** Lo mismo que hacen los saldos: un movimiento sin cuenta es de General. */
  it('un movimiento sin cuenta se exporta como General', () => {
    const [fila] = filasExportables(
      [gasto({ occurredAt: '2026-09-10T10:00:00-07:00' })],
      [],
      CATEGORIAS,
      CUENTAS,
      SEPTIEMBRE,
    );
    expect(fila?.cuenta).toBe('General');
  });

  it('la fuente es el concepto de un ingreso', () => {
    const [fila] = filasExportables(
      [],
      [ingreso({ occurredAt: '2026-09-10T10:00:00-07:00', fuente: 'Freelance' })],
      CATEGORIAS,
      CUENTAS,
      SEPTIEMBRE,
    );
    expect(fila?.concepto).toBe('Freelance');
  });

  it('ignora los borrados', () => {
    const filas = filasExportables(
      [
        gasto({
          occurredAt: '2026-09-10T10:00:00-07:00',
          deletedAt: '2026-09-11T10:00:00-07:00',
        }),
      ],
      [
        ingreso({
          occurredAt: '2026-09-12T10:00:00-07:00',
          deletedAt: '2026-09-13T10:00:00-07:00',
        }),
      ],
      CATEGORIAS,
      CUENTAS,
      SEPTIEMBRE,
    );
    expect(filas).toEqual([]);
  });

  describe('el rango', () => {
    it('deja fuera lo anterior y lo posterior', () => {
      const filas = filasExportables(
        [
          gasto({ occurredAt: '2026-08-31T10:00:00-07:00' }),
          gasto({ occurredAt: '2026-09-15T10:00:00-07:00' }),
          gasto({ occurredAt: '2026-10-01T10:00:00-07:00' }),
        ],
        [],
        CATEGORIAS,
        CUENTAS,
        SEPTIEMBRE,
      );
      expect(filas).toHaveLength(1);
    });

    it('incluye los dos extremos', () => {
      const filas = filasExportables(
        [
          gasto({ occurredAt: '2026-09-01T00:05:00-07:00' }),
          gasto({ occurredAt: '2026-09-30T23:55:00-07:00' }),
        ],
        [],
        CATEGORIAS,
        CUENTAS,
        SEPTIEMBRE,
      );
      expect(filas).toHaveLength(2);
    });

    /**
     * Quien pide "hasta el 30" quiere el 30 completo. Comparando contra su
     * medianoche se perdería todo lo registrado ese día.
     */
    it('el último día entra entero, no hasta su medianoche', () => {
      const filas = filasExportables(
        [gasto({ occurredAt: '2026-09-30T23:59:00-07:00' })],
        [],
        CATEGORIAS,
        CUENTAS,
        SEPTIEMBRE,
      );
      expect(filas).toHaveLength(1);
    });

    /** BUG-002: el corte va sobre la fecha local del ISO, no sobre el instante UTC. */
    it('usa la fecha local y no la del instante UTC', () => {
      const filas = filasExportables(
        // En UTC esto ya es 1 de octubre, pero en Culiacán sigue siendo el 30.
        [gasto({ occurredAt: '2026-09-30T23:50:00-07:00' })],
        [],
        CATEGORIAS,
        CUENTAS,
        SEPTIEMBRE,
      );
      expect(filas).toHaveLength(1);
    });
  });
});

describe('rangoDelMes', () => {
  it('cubre el mes completo', () => {
    expect(rangoDelMes('2026-09')).toEqual({ desde: '2026-09-01', hasta: '2026-09-30' });
  });

  it('acierta con los meses de 31 días', () => {
    expect(rangoDelMes('2026-07').hasta).toBe('2026-07-31');
  });

  it('acierta con febrero', () => {
    expect(rangoDelMes('2026-02').hasta).toBe('2026-02-28');
  });

  it('acierta con febrero bisiesto', () => {
    expect(rangoDelMes('2028-02').hasta).toBe('2028-02-29');
  });
});

describe('nombreDeArchivo', () => {
  it('lleva el rango, que es lo que lo distingue del export anterior', () => {
    expect(nombreDeArchivo(SEPTIEMBRE, 'csv')).toBe(
      'gastos-2026-09-01_a_2026-09-30.csv',
    );
  });

  it('respeta la extensión pedida', () => {
    expect(nombreDeArchivo(SEPTIEMBRE, 'pdf').endsWith('.pdf')).toBe(true);
  });
});
