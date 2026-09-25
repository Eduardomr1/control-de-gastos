import { MoneyError } from '@/shared/lib/money';

import {
  alternarActivo,
  crearRecurrente,
  eliminarRecurrente,
  fetchRecurrentes,
  limpiarRecurrentes,
  marcarGeneradoHasta,
} from './recurrentes.local';
import type { NewRecurrenteInput } from '../types';

const T = 'T09:00:00-07:00';

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
  limpiarRecurrentes();
});

describe('crearRecurrente', () => {
  it('guarda y devuelve el recurrente con id propio', async () => {
    const creado = await crearRecurrente(renta);
    expect(creado.id).toHaveLength(36);
    expect(await fetchRecurrentes()).toEqual([creado]);
  });

  it('nace sin marca de generación', async () => {
    expect((await crearRecurrente(renta)).generadasHasta).toBeUndefined();
  });

  it('rechaza el monto en cero y el negativo', async () => {
    await expect(crearRecurrente({ ...renta, amountCents: 0 })).rejects.toBeInstanceOf(
      MoneyError,
    );
    await expect(crearRecurrente({ ...renta, amountCents: -1 })).rejects.toBeInstanceOf(
      MoneyError,
    );
    expect(await fetchRecurrentes()).toEqual([]);
  });
});

describe('alternarActivo', () => {
  it('apaga y vuelve a encender', async () => {
    const r = await crearRecurrente(renta);
    await alternarActivo(r.id, false);
    expect((await fetchRecurrentes())[0]?.activo).toBe(false);
    await alternarActivo(r.id, true);
    expect((await fetchRecurrentes())[0]?.activo).toBe(true);
  });

  /**
   * Pausar no es borrar y volver a crear. Si apagar limpiara la marca, volver
   * a encenderlo meses después regeneraría de golpe todos los cobros del
   * periodo en que estuvo apagado.
   */
  it('apagar conserva la marca de generación', async () => {
    const r = await crearRecurrente(renta);
    marcarGeneradoHasta(r.id, `2026-09-01${T}`);
    await alternarActivo(r.id, false);
    expect((await fetchRecurrentes())[0]?.generadasHasta).toBe(`2026-09-01${T}`);
  });

  it('un id que no existe no altera nada', async () => {
    await crearRecurrente(renta);
    await alternarActivo('no-existe', false);
    expect((await fetchRecurrentes())[0]?.activo).toBe(true);
  });
});

describe('eliminarRecurrente', () => {
  it('lo saca de la lista', async () => {
    const r = await crearRecurrente(renta);
    await eliminarRecurrente(r.id);
    expect(await fetchRecurrentes()).toEqual([]);
  });

  it('no toca a los demás', async () => {
    const uno = await crearRecurrente(renta);
    await crearRecurrente({ ...renta, nombre: 'Streaming' });
    await eliminarRecurrente(uno.id);

    const vivos = await fetchRecurrentes();
    expect(vivos).toHaveLength(1);
    expect(vivos[0]?.nombre).toBe('Streaming');
  });
});

describe('marcarGeneradoHasta', () => {
  it('avanza la marca', async () => {
    const r = await crearRecurrente(renta);
    marcarGeneradoHasta(r.id, `2026-08-01${T}`);
    expect((await fetchRecurrentes())[0]?.generadasHasta).toBe(`2026-08-01${T}`);
  });

  it('un id que no existe no crea una fila fantasma', async () => {
    marcarGeneradoHasta('no-existe', `2026-08-01${T}`);
    expect(await fetchRecurrentes()).toEqual([]);
  });
});
