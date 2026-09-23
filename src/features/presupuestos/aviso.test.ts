/**
 * En Node no hay binding de expo-sqlite, así que el caché de presupuestos cae
 * a memoria por sí solo. Se siembra con `guardarPresupuesto` en vez de
 * mockear: así el caso de prueba pasa por el mismo camino que la app.
 */
import type { Expense } from '@/types/expense';

import { guardarPresupuesto, limpiarPresupuestos } from './api/presupuestos.local';
import { avisoDeUmbral } from './aviso';

function gasto(g: Partial<Expense> & { id: string; amountCents: number }): Expense {
  return {
    currency: 'MXN',
    categoryId: 'comida',
    occurredAt: '2026-09-10T10:00:00-07:00',
    syncState: 'synced',
    updatedAt: '2026-09-10T10:00:00-07:00',
    ...g,
  };
}

beforeEach(async () => {
  limpiarPresupuestos();
  await guardarPresupuesto({ categoryId: 'comida', limiteCents: 500_00 });
});

describe('avisoDeUmbral', () => {
  it('no avisa cuando la categoría no tiene presupuesto', async () => {
    const nuevo = gasto({ id: 'g1', amountCents: 999_00, categoryId: 'transporte' });
    expect(await avisoDeUmbral(nuevo, [nuevo], 'Transporte')).toBeNull();
  });

  it('no avisa por debajo del 80%', async () => {
    const nuevo = gasto({ id: 'g1', amountCents: 399_00 });
    expect(await avisoDeUmbral(nuevo, [nuevo], 'Comida')).toBeNull();
  });

  it('avisa al cruzar el 80% con el nombre de la categoría y los dos montos', async () => {
    const previos = [gasto({ id: 'g1', amountCents: 390_00 })];
    const nuevo = gasto({ id: 'g2', amountCents: 20_00 });
    const aviso = await avisoDeUmbral(nuevo, [...previos, nuevo], 'Comida');

    expect(aviso).toMatchObject({ umbral: 0.8, gastadoCents: 410_00, limiteCents: 500_00 });
    expect(aviso?.titulo).toBe('Vas al 80% de Comida');
    expect(aviso?.cuerpo).toContain('$410.00');
    expect(aviso?.cuerpo).toContain('$500.00');
  });

  it('avisa distinto al pasarse del 100%', async () => {
    const previos = [gasto({ id: 'g1', amountCents: 450_00 })];
    const nuevo = gasto({ id: 'g2', amountCents: 100_00 });
    const aviso = await avisoDeUmbral(nuevo, [...previos, nuevo], 'Comida');

    expect(aviso?.umbral).toBe(1);
    expect(aviso?.titulo).toBe('Te pasaste del presupuesto de Comida');
  });

  /** El aviso sale una vez, no en cada gasto posterior. */
  it('no repite el aviso en el siguiente gasto', async () => {
    const yaCruzado = [
      gasto({ id: 'g1', amountCents: 390_00 }),
      gasto({ id: 'g2', amountCents: 20_00 }),
    ];
    const nuevo = gasto({ id: 'g3', amountCents: 10_00 });
    expect(await avisoDeUmbral(nuevo, [...yaCruzado, nuevo], 'Comida')).toBeNull();
  });

  /**
   * Quien llama puede pasar la lista de antes o de después de guardar. El
   * resultado no debe depender de ese orden: si dependiera, el aviso saldría o
   * no según qué tan rápido refrescara react-query.
   */
  it('da el mismo resultado venga o no el gasto nuevo ya en la lista', async () => {
    const previos = [gasto({ id: 'g1', amountCents: 390_00 })];
    const nuevo = gasto({ id: 'g2', amountCents: 20_00 });

    const conEl = await avisoDeUmbral(nuevo, [...previos, nuevo], 'Comida');
    const sinEl = await avisoDeUmbral(nuevo, previos, 'Comida');
    expect(sinEl).toEqual(conEl);
  });

  it('el override del mes manda sobre el presupuesto general', async () => {
    await guardarPresupuesto({
      categoryId: 'comida',
      limiteCents: 2_000_00,
      mesReferencia: '2026-09',
    });
    const nuevo = gasto({ id: 'g1', amountCents: 450_00 });
    expect(await avisoDeUmbral(nuevo, [nuevo], 'Comida')).toBeNull();
  });

  /** BUG-002: el gasto de otro mes no consume el presupuesto de este. */
  it('no cuenta los gastos de otros meses', async () => {
    const agosto = [gasto({ id: 'g1', amountCents: 490_00, occurredAt: '2026-08-31T10:00:00-07:00' })];
    const nuevo = gasto({ id: 'g2', amountCents: 100_00 });
    expect(await avisoDeUmbral(nuevo, [...agosto, nuevo], 'Comida')).toBeNull();
  });
});
