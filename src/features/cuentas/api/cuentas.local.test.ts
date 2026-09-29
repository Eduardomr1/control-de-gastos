import {
  crearCuenta,
  editarCuenta,
  eliminarCuenta,
  fetchCuentas,
  limpiarCuentas,
} from './cuentas.local';
import { CUENTA_GENERAL, type NewCuentaInput } from '../types';

const debito: NewCuentaInput = {
  nombre: 'Débito BBVA',
  tipo: 'debito',
  saldoInicialCents: 5_000_00,
  currency: 'MXN',
};

beforeEach(() => {
  limpiarCuentas();
});

describe('fetchCuentas', () => {
  /**
   * General la crea la migración v6, que no corre en Node. Sintetizarla aquí
   * evita que el selector de cuenta aparezca vacío en pruebas y en el primer
   * arranque de un dispositivo sin migrar.
   */
  it('sin cuentas guardadas devuelve General', async () => {
    const cuentas = await fetchCuentas();
    expect(cuentas).toHaveLength(1);
    expect(cuentas[0]?.id).toBe(CUENTA_GENERAL);
    expect(cuentas[0]?.nombre).toBe('General');
  });

  it('en cuanto hay una cuenta real, deja de sintetizar General', async () => {
    await crearCuenta(debito);
    const cuentas = await fetchCuentas();
    expect(cuentas).toHaveLength(1);
    expect(cuentas[0]?.nombre).toBe('Débito BBVA');
  });
});

describe('crearCuenta', () => {
  it('guarda con id propio y saldo inicial', async () => {
    const creada = await crearCuenta(debito);
    expect(creada.id).toHaveLength(36);
    expect(creada.saldoInicialCents).toBe(5_000_00);
  });

  it('dos cuentas conviven', async () => {
    await crearCuenta(debito);
    await crearCuenta({ ...debito, nombre: 'Efectivo', tipo: 'efectivo' });
    expect(await fetchCuentas()).toHaveLength(2);
  });
});

describe('editarCuenta', () => {
  it('cambia solo lo que se le pasa', async () => {
    const creada = await crearCuenta(debito);
    await editarCuenta(creada.id, { nombre: 'Débito nuevo' });

    const [cuenta] = await fetchCuentas();
    expect(cuenta?.nombre).toBe('Débito nuevo');
    expect(cuenta?.saldoInicialCents).toBe(5_000_00);
  });

  it('un id que no existe no crea una cuenta fantasma', async () => {
    await editarCuenta('no-existe', { nombre: 'X' });
    expect((await fetchCuentas())[0]?.id).toBe(CUENTA_GENERAL);
  });
});

describe('eliminarCuenta', () => {
  it('saca la cuenta de la lista', async () => {
    await crearCuenta(debito);
    const otra = await crearCuenta({ ...debito, nombre: 'Efectivo' });
    await eliminarCuenta(otra.id);

    const vivas = await fetchCuentas();
    expect(vivas).toHaveLength(1);
    expect(vivas[0]?.nombre).toBe('Débito BBVA');
  });

  /**
   * General es el destino de todo movimiento sin cuenta. Si se pudiera borrar,
   * esos movimientos no se sumarían en ningún saldo y el consolidado dejaría
   * de cuadrar con la suma de las cuentas.
   */
  it('no borra la cuenta General', async () => {
    await eliminarCuenta(CUENTA_GENERAL);
    expect((await fetchCuentas())[0]?.id).toBe(CUENTA_GENERAL);
  });
});
