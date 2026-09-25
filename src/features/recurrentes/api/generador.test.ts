/**
 * Los barriles de gastos e ingresos se mockean enteros: importarlos de verdad
 * arrastra MMKV y supabase-js, que no existen en Node. Lo que se prueba aquí
 * es CUÁNTOS movimientos se crean y con qué fecha, no que gastos los guarde
 * bien — eso es de `expenses.local.test.ts`.
 */
jest.mock('@/features/gastos', () => ({ crearGasto: jest.fn() }));
jest.mock('@/features/ingresos', () => ({ crearIngreso: jest.fn() }));

import { generarPendientes } from './generador';
import {
  crearRecurrente,
  fetchRecurrentes,
  limpiarRecurrentes,
} from './recurrentes.local';
import type { NewRecurrenteInput } from '../types';

const { crearGasto } = jest.requireMock('@/features/gastos');
const { crearIngreso } = jest.requireMock('@/features/ingresos');

const T = 'T09:00:00-07:00';
const HOY = `2026-09-20${T}`;

const renta: NewRecurrenteInput = {
  tipo: 'gasto',
  nombre: 'Renta',
  amountCents: 8_000_00,
  currency: 'MXN',
  categoryId: 'hogar',
  frecuencia: 'mensual',
  inicio: `2026-07-01${T}`,
  activo: true,
};

beforeEach(() => {
  jest.clearAllMocks();
  limpiarRecurrentes();
  crearGasto.mockResolvedValue(undefined);
  crearIngreso.mockResolvedValue(undefined);
});

describe('generarPendientes', () => {
  it('sin recurrentes no genera nada', async () => {
    expect(await generarPendientes(HOY)).toEqual({ generados: 0, revisados: 0 });
    expect(crearGasto).not.toHaveBeenCalled();
  });

  it('genera un gasto por cada ocurrencia vencida, con SU fecha', async () => {
    await crearRecurrente(renta);
    expect(await generarPendientes(HOY)).toMatchObject({ generados: 3 });

    const fechas = crearGasto.mock.calls.map(([g]: [{ occurredAt: string }]) => g.occurredAt);
    expect(fechas).toEqual([`2026-07-01${T}`, `2026-08-01${T}`, `2026-09-01${T}`]);
  });

  /**
   * El criterio de salida de la Fase 3. Reabrir la app tres veces el mismo día
   * tiene que generar el cobro una sola vez.
   */
  it('no duplica al correrlo varias veces el mismo día', async () => {
    await crearRecurrente(renta);
    await generarPendientes(HOY);
    await generarPendientes(HOY);
    await generarPendientes(HOY);
    expect(crearGasto).toHaveBeenCalledTimes(3);
  });

  it('deja la marca de generación en la última ocurrencia', async () => {
    await crearRecurrente(renta);
    await generarPendientes(HOY);
    const [guardado] = await fetchRecurrentes();
    expect(guardado?.generadasHasta).toBe(`2026-09-01${T}`);
  });

  it('un mes después genera solo el cobro nuevo', async () => {
    await crearRecurrente(renta);
    await generarPendientes(HOY);
    crearGasto.mockClear();

    expect(await generarPendientes(`2026-10-05${T}`)).toMatchObject({ generados: 1 });
    expect(crearGasto.mock.calls[0]?.[0]?.occurredAt).toBe(`2026-10-01${T}`);
  });

  it('ignora los recurrentes apagados', async () => {
    await crearRecurrente({ ...renta, activo: false });
    expect(await generarPendientes(HOY)).toEqual({ generados: 0, revisados: 0 });
  });

  it('no genera nada cuando la primera ocurrencia es futura', async () => {
    await crearRecurrente({ ...renta, inicio: `2026-12-01${T}` });
    expect(await generarPendientes(HOY)).toMatchObject({ generados: 0, revisados: 1 });
  });

  it('un recurrente de ingreso crea ingresos, no gastos', async () => {
    await crearRecurrente({
      tipo: 'ingreso',
      nombre: 'Quincena',
      amountCents: 15_000_00,
      currency: 'MXN',
      fuente: 'Sueldo',
      frecuencia: 'mensual',
      inicio: `2026-09-01${T}`,
      activo: true,
    });
    await generarPendientes(HOY);
    expect(crearIngreso).toHaveBeenCalledTimes(1);
    expect(crearGasto).not.toHaveBeenCalled();
    expect(crearIngreso.mock.calls[0]?.[0]?.fuente).toBe('Sueldo');
  });

  it('el gasto sin categoría cae en "otros" en vez de no registrarse', async () => {
    const sinCategoria = { ...renta };
    delete (sinCategoria as { categoryId?: string }).categoryId;
    await crearRecurrente(sinCategoria);
    await generarPendientes(HOY);
    expect(crearGasto.mock.calls[0]?.[0]?.categoryId).toBe('otros');
  });

  it('el movimiento generado lleva el nombre del recurrente como nota', async () => {
    await crearRecurrente({ ...renta, inicio: `2026-09-01${T}` });
    await generarPendientes(HOY);
    expect(crearGasto.mock.calls[0]?.[0]?.note).toBe('Renta');
  });

  it('varios recurrentes se procesan en la misma corrida', async () => {
    await crearRecurrente({ ...renta, inicio: `2026-09-01${T}` });
    await crearRecurrente({
      ...renta,
      nombre: 'Streaming',
      inicio: `2026-09-10${T}`,
      amountCents: 199_00,
    });
    expect(await generarPendientes(HOY)).toMatchObject({ generados: 2, revisados: 2 });
  });

  /**
   * El candado contra dos disparos simultáneos: sin él, las dos corridas leen
   * la misma marca vieja y generan el mismo cobro dos veces.
   */
  it('dos corridas simultáneas no generan lo mismo dos veces', async () => {
    await crearRecurrente(renta);
    await Promise.all([generarPendientes(HOY), generarPendientes(HOY)]);
    expect(crearGasto).toHaveBeenCalledTimes(3);
  });
});
