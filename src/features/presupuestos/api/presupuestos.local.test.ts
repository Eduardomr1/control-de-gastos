import { MoneyError } from '@/shared/lib/money';

import {
  eliminarPresupuesto,
  fetchPresupuestos,
  guardarPresupuesto,
  limpiarPresupuestos,
} from './presupuestos.local';

beforeEach(() => {
  limpiarPresupuestos();
});

describe('guardarPresupuesto', () => {
  it('guarda un límite nuevo', async () => {
    const p = await guardarPresupuesto({ categoryId: 'comida', limiteCents: 500_00 });
    expect(p.limiteCents).toBe(500_00);
    expect(await fetchPresupuestos()).toEqual([p]);
  });

  /**
   * Lo que el usuario hace es "el límite de Comida ahora es 700", no "agrega
   * otro límite para Comida". Sin este upsert, la pantalla mostraría el que
   * SQLite devolviera primero.
   */
  it('reemplaza el límite de la misma categoría y periodo', async () => {
    await guardarPresupuesto({ categoryId: 'comida', limiteCents: 500_00 });
    await guardarPresupuesto({ categoryId: 'comida', limiteCents: 700_00 });

    const todos = await fetchPresupuestos();
    expect(todos).toHaveLength(1);
    expect(todos[0]?.limiteCents).toBe(700_00);
  });

  /**
   * Editar conserva el id. Si cada edición generara uno nuevo, el día que esto
   * sincronice el servidor vería un alta distinta cada vez en lugar de la
   * misma fila cambiando.
   */
  it('editar conserva el id', async () => {
    const primero = await guardarPresupuesto({ categoryId: 'comida', limiteCents: 500_00 });
    const segundo = await guardarPresupuesto({ categoryId: 'comida', limiteCents: 700_00 });
    expect(segundo.id).toBe(primero.id);
  });

  it('el límite de un mes concreto convive con el general', async () => {
    await guardarPresupuesto({ categoryId: 'comida', limiteCents: 500_00 });
    await guardarPresupuesto({
      categoryId: 'comida',
      limiteCents: 1_500_00,
      mesReferencia: '2026-12',
    });
    expect(await fetchPresupuestos()).toHaveLength(2);
  });

  it('categorías distintas no se pisan', async () => {
    await guardarPresupuesto({ categoryId: 'comida', limiteCents: 500_00 });
    await guardarPresupuesto({ categoryId: 'transporte', limiteCents: 300_00 });
    expect(await fetchPresupuestos()).toHaveLength(2);
  });

  it('rechaza el límite en cero y el negativo', async () => {
    await expect(
      guardarPresupuesto({ categoryId: 'comida', limiteCents: 0 }),
    ).rejects.toBeInstanceOf(MoneyError);
    await expect(
      guardarPresupuesto({ categoryId: 'comida', limiteCents: -100 }),
    ).rejects.toBeInstanceOf(MoneyError);
    expect(await fetchPresupuestos()).toEqual([]);
  });
});

describe('eliminarPresupuesto', () => {
  it('lo saca de la lista', async () => {
    const p = await guardarPresupuesto({ categoryId: 'comida', limiteCents: 500_00 });
    await eliminarPresupuesto(p.id);
    expect(await fetchPresupuestos()).toEqual([]);
  });

  it('no toca los límites de las otras categorías', async () => {
    const comida = await guardarPresupuesto({ categoryId: 'comida', limiteCents: 500_00 });
    await guardarPresupuesto({ categoryId: 'transporte', limiteCents: 300_00 });
    await eliminarPresupuesto(comida.id);

    const vivos = await fetchPresupuestos();
    expect(vivos).toHaveLength(1);
    expect(vivos[0]?.categoryId).toBe('transporte');
  });

  /** Borrar y volver a fijar el límite no debe chocar contra el índice único. */
  it('tras eliminar se puede fijar de nuevo el mismo par categoría/periodo', async () => {
    const p = await guardarPresupuesto({ categoryId: 'comida', limiteCents: 500_00 });
    await eliminarPresupuesto(p.id);
    const nuevo = await guardarPresupuesto({ categoryId: 'comida', limiteCents: 800_00 });
    expect(nuevo.id).not.toBe(p.id);
    expect(await fetchPresupuestos()).toHaveLength(1);
  });
});
