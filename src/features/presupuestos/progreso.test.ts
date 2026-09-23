import type { Expense } from '@/types/expense';

import {
  fraccionUsada,
  gastoPorCategoria,
  presupuestoVigente,
  umbralCruzado,
} from './progreso';
import type { Presupuesto } from './types';

function presupuesto(p: Partial<Presupuesto> & { categoryId: string }): Presupuesto {
  return {
    id: `${p.categoryId}-${p.mesReferencia ?? 'general'}`,
    limiteCents: 500_00,
    syncState: 'synced',
    updatedAt: '2026-09-21T10:00:00-07:00',
    ...p,
  };
}

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

describe('presupuestoVigente', () => {
  it('sin presupuesto para la categoría devuelve undefined', () => {
    expect(presupuestoVigente([], 'comida', '2026-09')).toBeUndefined();
  });

  it('usa el general cuando el mes no tiene uno propio', () => {
    const general = presupuesto({ categoryId: 'comida' });
    expect(presupuestoVigente([general], 'comida', '2026-09')).toBe(general);
  });

  /** El override de diciembre no debe obligar a reescribir los otros once meses. */
  it('el del mes explícito gana sobre el general', () => {
    const general = presupuesto({ categoryId: 'comida', limiteCents: 500_00 });
    const diciembre = presupuesto({
      categoryId: 'comida',
      mesReferencia: '2026-12',
      limiteCents: 1_500_00,
    });
    expect(presupuestoVigente([general, diciembre], 'comida', '2026-12')).toBe(diciembre);
    expect(presupuestoVigente([general, diciembre], 'comida', '2026-09')).toBe(general);
  });

  it('no mezcla categorías', () => {
    const comida = presupuesto({ categoryId: 'comida' });
    expect(presupuestoVigente([comida], 'transporte', '2026-09')).toBeUndefined();
  });

  it('ignora los borrados', () => {
    const borrado = presupuesto({
      categoryId: 'comida',
      deletedAt: '2026-09-10T10:00:00-07:00',
    });
    expect(presupuestoVigente([borrado], 'comida', '2026-09')).toBeUndefined();
  });
});

describe('gastoPorCategoria', () => {
  it('suma por categoría solo los del mes', () => {
    const total = gastoPorCategoria(
      [
        gasto({ occurredAt: '2026-09-01T10:00:00-07:00', amountCents: 100_00 }),
        gasto({ occurredAt: '2026-09-05T10:00:00-07:00', amountCents: 250_00 }),
        gasto({
          occurredAt: '2026-09-07T10:00:00-07:00',
          amountCents: 80_00,
          categoryId: 'transporte',
        }),
        gasto({ occurredAt: '2026-08-31T10:00:00-07:00', amountCents: 999_00 }),
      ],
      '2026-09',
    );
    expect(total.get('comida')).toBe(350_00);
    expect(total.get('transporte')).toBe(80_00);
  });

  it('ignora los borrados', () => {
    const total = gastoPorCategoria(
      [
        gasto({ occurredAt: '2026-09-01T10:00:00-07:00', amountCents: 100_00 }),
        gasto({
          occurredAt: '2026-09-02T10:00:00-07:00',
          amountCents: 400_00,
          deletedAt: '2026-09-03T10:00:00-07:00',
        }),
      ],
      '2026-09',
    );
    expect(total.get('comida')).toBe(100_00);
  });

  /** BUG-002: el periodo se decide en hora local, no en UTC. */
  it('clasifica por mes local', () => {
    const total = gastoPorCategoria(
      [gasto({ occurredAt: '2026-09-30T23:50:00-07:00', amountCents: 100_00 })],
      '2026-09',
    );
    expect(total.get('comida')).toBe(100_00);
  });

  it('una categoría sin gastos no aparece en el mapa', () => {
    expect(gastoPorCategoria([], '2026-09').has('comida')).toBe(false);
  });
});

describe('fraccionUsada', () => {
  it('calcula la fracción', () => {
    expect(fraccionUsada(250_00, 500_00)).toBe(0.5);
  });

  /** Sin topar en 1: la pantalla necesita saber que se rebasó y por cuánto. */
  it('pasa de 1 cuando se rebasa', () => {
    expect(fraccionUsada(600_00, 500_00)).toBe(1.2);
  });

  it('con límite en cero devuelve 0 en vez de NaN o Infinity', () => {
    expect(fraccionUsada(100_00, 0)).toBe(0);
  });
});

describe('umbralCruzado', () => {
  it('no avisa mientras no se llegue al 80%', () => {
    expect(umbralCruzado(300_00, 399_99, 500_00)).toBeNull();
  });

  it('avisa al cruzar el 80%', () => {
    expect(umbralCruzado(390_00, 410_00, 500_00)).toBe(0.8);
  });

  it('el 80% exacto ya cuenta como cruzado', () => {
    expect(umbralCruzado(399_00, 400_00, 500_00)).toBe(0.8);
  });

  it('avisa al cruzar el 100%', () => {
    expect(umbralCruzado(450_00, 500_00, 500_00)).toBe(1);
  });

  /**
   * El corazón de la Fase 2. Con un solo estado —"¿ya pasé el 80%?"— el aviso
   * saldría en cada gasto posterior al primero que lo cruzó, y a la tercera
   * vez el usuario deja de leerlo.
   */
  it('no repite el aviso en los gastos siguientes', () => {
    expect(umbralCruzado(410_00, 420_00, 500_00)).toBeNull();
    expect(umbralCruzado(420_00, 450_00, 500_00)).toBeNull();
  });

  /** Quien pasa de 10% a 120% necesita oír "te pasaste", no "vas en 80%". */
  it('devuelve el más alto cuando un solo gasto cruza los dos', () => {
    expect(umbralCruzado(50_00, 600_00, 500_00)).toBe(1);
  });

  it('tampoco avisa dos veces por rebasar más', () => {
    expect(umbralCruzado(600_00, 700_00, 500_00)).toBeNull();
  });

  it('con límite en cero no avisa', () => {
    expect(umbralCruzado(0, 100_00, 0)).toBeNull();
  });
});
