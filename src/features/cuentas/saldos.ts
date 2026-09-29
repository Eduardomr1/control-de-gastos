/**
 * Saldo por cuenta y consolidado.
 *
 * Calculado, nunca materializado: un saldo guardado es un segundo lugar donde
 * la verdad puede quedar mal, y basta un movimiento que se borre sin
 * descontarse para que la cuenta mienta hasta que alguien la recalcule a mano.
 *
 * Recibe gastos e ingresos en vez de pedirlos: cuentas no puede leer las
 * tablas de otros features, y quien pinta el tablero ya los tiene.
 */

import { sumCents } from '@/shared/lib/money';
import type { Expense } from '@/types/expense';

import { CUENTA_GENERAL, type Cuenta, type SaldoDeCuenta } from './types';

/** Lo mínimo que este módulo necesita de un ingreso. */
export interface MovimientoDeIngreso {
  readonly amountCents: number;
  readonly cuentaId?: string;
  readonly deletedAt?: string;
}

/**
 * Saldo de cada cuenta viva, en el orden en que vienen las cuentas.
 *
 * Los movimientos sin cuenta se cuentan en General. La migración v6 llena la
 * columna en toda fila existente, pero un gasto que vuelve de Supabase llega
 * sin ella, y un movimiento huérfano tiene que aparecer en algún saldo: dejarlo
 * fuera haría que la suma de las cuentas no cuadrara con el total.
 */
export function saldosPorCuenta(
  cuentas: readonly Cuenta[],
  gastos: readonly Expense[],
  ingresos: readonly MovimientoDeIngreso[],
): SaldoDeCuenta[] {
  const gastosPorCuenta = acumular(gastos);
  const ingresosPorCuenta = acumular(ingresos);

  return cuentas
    .filter((c) => !c.deletedAt)
    .map((cuenta) => {
      const gastosCents = gastosPorCuenta.get(cuenta.id) ?? 0;
      const ingresosCents = ingresosPorCuenta.get(cuenta.id) ?? 0;
      return {
        cuenta,
        gastosCents,
        ingresosCents,
        saldoCents: cuenta.saldoInicialCents + ingresosCents - gastosCents,
      };
    });
}

/** Suma de todos los saldos. Es el número que el usuario llama "cuánto tengo". */
export function saldoTotal(saldos: readonly SaldoDeCuenta[]): number {
  return sumCents(saldos.map((s) => s.saldoCents));
}

function acumular(
  movimientos: readonly { amountCents: number; cuentaId?: string; deletedAt?: string }[],
): Map<string, number> {
  const porCuenta = new Map<string, number[]>();
  for (const m of movimientos) {
    if (m.deletedAt) continue;
    const id = m.cuentaId ?? CUENTA_GENERAL;
    const bucket = porCuenta.get(id);
    if (bucket) bucket.push(m.amountCents);
    else porCuenta.set(id, [m.amountCents]);
  }
  return new Map([...porCuenta].map(([id, montos]) => [id, sumCents(montos)]));
}
