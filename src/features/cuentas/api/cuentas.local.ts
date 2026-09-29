/**
 * Backend local de cuentas.
 *
 * La cuenta "General" nace en la migración v6, no aquí: es la que recoge todos
 * los movimientos anteriores a esta fase, y tiene que existir aunque el
 * usuario nunca abra la pantalla de cuentas. En Node no hay SQLite y la
 * migración no corre, así que `fetchCuentas` la sintetiza para que la lista
 * nunca esté vacía y el selector siempre tenga qué ofrecer.
 */

import { crearRepositorio, type Disco } from '@/shared/lib/db/repositorioLocal';
import { generarId } from '@/shared/lib/id';

import { CUENTA_GENERAL, type Cuenta, type NewCuentaInput } from '../types';

const cuentasCache = crearRepositorio<Cuenta>(
  () =>
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    (require('../store/cuentasDb') as { cuentasDb: Disco<Cuenta> }).cuentasDb,
);

function general(): Cuenta {
  return {
    id: CUENTA_GENERAL,
    nombre: 'General',
    tipo: 'efectivo',
    saldoInicialCents: 0,
    currency: 'MXN',
    syncState: 'synced',
    updatedAt: new Date().toISOString(),
  };
}

export async function fetchCuentas(): Promise<Cuenta[]> {
  const vivas = cuentasCache.read().filter((c) => !c.deletedAt);
  return vivas.length === 0 ? [general()] : vivas;
}

export async function crearCuenta(input: NewCuentaInput): Promise<Cuenta> {
  const cuenta: Cuenta = {
    ...input,
    id: generarId(),
    syncState: 'synced',
    updatedAt: new Date().toISOString(),
  };
  cuentasCache.upsert(cuenta);
  return cuenta;
}

export async function editarCuenta(
  id: string,
  cambios: Partial<NewCuentaInput>,
): Promise<void> {
  const actual = cuentasCache.read().find((c) => c.id === id);
  if (!actual) return;
  cuentasCache.upsert({ ...actual, ...cambios, updatedAt: new Date().toISOString() });
}

/**
 * Borrado suave, y nunca el de General.
 *
 * General es el destino de todo movimiento sin cuenta: borrarla dejaría esos
 * movimientos sin dónde sumarse y el total consolidado dejaría de cuadrar con
 * la suma de las cuentas. El borrado es suave además porque los movimientos
 * que la referencian siguen ahí — quitar la cuenta no es quitar el gasto.
 */
export async function eliminarCuenta(id: string): Promise<void> {
  if (id === CUENTA_GENERAL) return;
  const now = new Date().toISOString();
  cuentasCache.write(
    cuentasCache
      .read()
      .map((c) => (c.id === id ? { ...c, deletedAt: now, updatedAt: now } : c)),
  );
}

/** Vacía la copia local. La usa `signOut`. */
export function limpiarCuentas(): void {
  cuentasCache.clear();
}
