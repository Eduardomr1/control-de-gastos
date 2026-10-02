import { DateError } from '@/shared/lib/date';
import { MoneyError } from '@/shared/lib/money';

import {
  aportar,
  crearMeta,
  eliminarMeta,
  fetchMetas,
  limpiarMetas,
} from './metas.local';
import type { NewMetaInput } from '../types';

const viaje: NewMetaInput = { nombre: 'Viaje', objetivoCents: 20_000_00 };

beforeEach(() => {
  limpiarMetas();
});

describe('crearMeta', () => {
  it('guarda con id propio y arranca en cero', async () => {
    const meta = await crearMeta(viaje);
    expect(meta.id).toHaveLength(36);
    expect(meta.actualCents).toBe(0);
    expect(await fetchMetas()).toEqual([meta]);
  });

  it('conserva la fecha límite cuando viene, y no inventa el campo cuando no', async () => {
    const con = await crearMeta({ ...viaje, fechaLimite: '2027-06-30' });
    expect(con.fechaLimite).toBe('2027-06-30');
    limpiarMetas();
    expect('fechaLimite' in (await crearMeta(viaje))).toBe(false);
  });

  it('rechaza una fecha limite que no existe', async () => {
    await expect(crearMeta({ ...viaje, fechaLimite: '2027-02-30' })).rejects.toBeInstanceOf(
      DateError,
    );
    expect(await fetchMetas()).toEqual([]);
  });

  it('rechaza el objetivo en cero y el negativo', async () => {
    await expect(crearMeta({ ...viaje, objetivoCents: 0 })).rejects.toBeInstanceOf(
      MoneyError,
    );
    await expect(crearMeta({ ...viaje, objetivoCents: -1 })).rejects.toBeInstanceOf(
      MoneyError,
    );
    expect(await fetchMetas()).toEqual([]);
  });
});

describe('aportar', () => {
  /**
   * El criterio de salida de la Fase 7: tres aportes tienen que sumarse, no
   * pisarse. Por eso la función recibe el monto del aporte y no el nuevo
   * total: con el total, el cálculo quedaría del lado de la pantalla y dos
   * aportes rápidos partirían del mismo valor viejo.
   */
  it('tres aportes suman exactamente su total', async () => {
    const meta = await crearMeta(viaje);
    await aportar(meta.id, 1_000_00);
    await aportar(meta.id, 2_500_50);
    await aportar(meta.id, 499_50);
    expect((await fetchMetas())[0]?.actualCents).toBe(4_000_00);
  });

  /**
   * Quien junta de más lo ve. Toparlo en el objetivo silenciaría dinero que el
   * usuario sí apartó; toparse es cosa de la barra al dibujar, no del dato.
   */
  it('no se topa en el objetivo', async () => {
    const meta = await crearMeta({ ...viaje, objetivoCents: 1_000_00 });
    await aportar(meta.id, 1_500_00);
    expect((await fetchMetas())[0]?.actualCents).toBe(1_500_00);
  });

  it('rechaza el aporte en cero y el negativo', async () => {
    const meta = await crearMeta(viaje);
    await expect(aportar(meta.id, 0)).rejects.toBeInstanceOf(MoneyError);
    await expect(aportar(meta.id, -100)).rejects.toBeInstanceOf(MoneyError);
    expect((await fetchMetas())[0]?.actualCents).toBe(0);
  });

  it('un id que no existe no crea una meta fantasma', async () => {
    await aportar('no-existe', 100_00);
    expect(await fetchMetas()).toEqual([]);
  });

  it('no aporta a una meta borrada', async () => {
    const meta = await crearMeta(viaje);
    await eliminarMeta(meta.id);
    await aportar(meta.id, 100_00);
    expect(await fetchMetas()).toEqual([]);
  });

  it('no toca a las demás metas', async () => {
    const uno = await crearMeta(viaje);
    await crearMeta({ nombre: 'Laptop', objetivoCents: 30_000_00 });
    await aportar(uno.id, 500_00);

    const metas = await fetchMetas();
    expect(metas.find((m) => m.id === uno.id)?.actualCents).toBe(500_00);
    expect(metas.find((m) => m.id !== uno.id)?.actualCents).toBe(0);
  });

  /** BUG-001: la suma va por sumCents, no sobre flotantes. */
  it('no arrastra residuo de punto flotante', async () => {
    const meta = await crearMeta(viaje);
    await aportar(meta.id, 10);
    await aportar(meta.id, 20);
    expect((await fetchMetas())[0]?.actualCents).toBe(30);
  });
});

describe('eliminarMeta', () => {
  it('la saca de la lista', async () => {
    const meta = await crearMeta(viaje);
    await eliminarMeta(meta.id);
    expect(await fetchMetas()).toEqual([]);
  });

  it('no toca a las demás', async () => {
    const uno = await crearMeta(viaje);
    await crearMeta({ nombre: 'Laptop', objetivoCents: 30_000_00 });
    await eliminarMeta(uno.id);

    const vivas = await fetchMetas();
    expect(vivas).toHaveLength(1);
    expect(vivas[0]?.nombre).toBe('Laptop');
  });
});
