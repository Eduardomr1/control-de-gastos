/**
 * En Node no hay binding de expo-sqlite, así que `ingresosCache` cae a memoria
 * por sí solo: no hace falta mockear nada. Lo que se prueba es el contrato del
 * backend, no la persistencia.
 */
import { MoneyError } from '@/shared/lib/money';

import {
  createIngreso,
  deleteIngreso,
  draftOccurredAt,
  fetchIngresos,
  limpiarIngresos,
} from './ingresos.local';
import type { NewIncomeInput } from '../types';

const entrada: NewIncomeInput = {
  amountCents: 15_000_00,
  currency: 'MXN',
  fuente: 'Sueldo',
  occurredAt: '2026-09-21T10:00:00-07:00',
};

beforeEach(() => {
  limpiarIngresos();
});

describe('createIngreso', () => {
  it('guarda el ingreso y lo devuelve con id propio', async () => {
    const creado = await createIngreso(entrada);
    expect(creado.id).toHaveLength(36);
    expect(creado.amountCents).toBe(15_000_00);
    expect(await fetchIngresos()).toEqual([creado]);
  });

  /**
   * Nace `synced` y no `pending`: sin backend remoto no hay cola ni servidor
   * que resuelvan el pendiente, y la fila mostraría "Pendiente de sincronizar"
   * para siempre. Mismo criterio que BUG-016 en gastos.
   */
  it('el ingreso nace sincronizado', async () => {
    expect((await createIngreso(entrada)).syncState).toBe('synced');
  });

  it('conserva la nota cuando viene, y no inventa el campo cuando no', async () => {
    const con = await createIngreso({ ...entrada, note: 'Quincena' });
    expect(con.note).toBe('Quincena');
    limpiarIngresos();
    expect('note' in (await createIngreso(entrada))).toBe(false);
  });

  it('rechaza el monto en cero', async () => {
    await expect(createIngreso({ ...entrada, amountCents: 0 })).rejects.toBeInstanceOf(
      MoneyError,
    );
    expect(await fetchIngresos()).toEqual([]);
  });

  it('rechaza el monto negativo', async () => {
    await expect(createIngreso({ ...entrada, amountCents: -1 })).rejects.toBeInstanceOf(
      MoneyError,
    );
    expect(await fetchIngresos()).toEqual([]);
  });

  it('dos ingresos seguidos no se pisan', async () => {
    await createIngreso(entrada);
    await createIngreso({ ...entrada, amountCents: 500_00 });
    expect(await fetchIngresos()).toHaveLength(2);
  });
});

describe('deleteIngreso', () => {
  it('lo saca de la lista sin borrarlo del disco', async () => {
    const creado = await createIngreso(entrada);
    await deleteIngreso(creado.id);
    expect(await fetchIngresos()).toEqual([]);
  });

  it('borrar un id que no existe no altera nada', async () => {
    await createIngreso(entrada);
    await deleteIngreso('no-existe');
    expect(await fetchIngresos()).toHaveLength(1);
  });
});

describe('draftOccurredAt', () => {
  /** ISO con offset explicito: el mes se decide en hora local (BUG-002). */
  it('propone la fecha de hoy con offset, no una fecha desnuda', () => {
    expect(draftOccurredAt()).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/);
  });
});

describe('limpiarIngresos', () => {
  /** BUG-013 aplicado a ingresos: los datos son del usuario que cierra sesión. */
  it('vacía la copia local', async () => {
    await createIngreso(entrada);
    limpiarIngresos();
    expect(await fetchIngresos()).toEqual([]);
  });
});
