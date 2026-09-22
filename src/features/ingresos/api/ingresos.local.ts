/**
 * Backend local de ingresos.
 *
 * A diferencia de gastos no hay despachador local/remoto: por ahora solo
 * existe este backend. Cuando ingresos sincronice contra Supabase se agrega
 * `ingresos.remote.ts` y un `api/index.ts` que elija, igual que en gastos. Un
 * despachador con un solo destino no despacha nada.
 *
 * El ingreso nace `synced` y no `pending`: sin backend remoto, esta copia
 * local ES la fuente de verdad y nadie va a resolver un pendiente. Mismo
 * criterio que BUG-016 para gastos.
 */

import { nowLocalIso } from '@/shared/lib/date';
import { generarId } from '@/shared/lib/id';
import { MoneyError } from '@/shared/lib/money';

import { ingresosCache } from '../store/ingresosCache';
import type { Income, NewIncomeInput } from '../types';

export async function fetchIngresos(): Promise<Income[]> {
  return ingresosCache.read().filter((i) => !i.deletedAt);
}

/**
 * Crea un ingreso.
 *
 * El monto se valida aquí y no solo en la pantalla: la pantalla es una de las
 * formas de llegar, y el día que haya otra —un recurrente que se genera solo,
 * una importación— la regla tiene que seguir de pie. Un ingreso de cero o
 * negativo no es un ingreso; para eso existe un gasto.
 */
export async function createIngreso(input: NewIncomeInput): Promise<Income> {
  if (input.amountCents <= 0) {
    throw new MoneyError('El monto de un ingreso debe ser mayor a cero');
  }

  const ingreso: Income = {
    ...input,
    id: generarId(),
    syncState: 'synced',
    updatedAt: new Date().toISOString(),
  };
  ingresosCache.upsert(ingreso);
  return ingreso;
}

/** Borrado suave: sin `deletedAt` no se distingue de un registro sin sincronizar. */
export async function deleteIngreso(id: string): Promise<void> {
  const now = new Date().toISOString();
  ingresosCache.write(
    ingresosCache
      .read()
      .map((i) => (i.id === id ? { ...i, deletedAt: now, updatedAt: now } : i)),
  );
}

/** Vacía la copia local. La usa `signOut`: los ingresos son del que sale. */
export function limpiarIngresos(): void {
  ingresosCache.clear();
}

export function draftOccurredAt(): string {
  return nowLocalIso();
}
