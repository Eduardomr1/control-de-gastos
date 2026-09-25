/**
 * Backend local de recurrentes: alta, baja y la marca de generación.
 *
 * La generación de los movimientos vive aparte, en `generador.ts`: aquí solo
 * está el CRUD de la definición, que es lo que la pantalla toca.
 */

import { generarId } from '@/shared/lib/id';
import { MoneyError } from '@/shared/lib/money';

import { recurrentesCache } from '../store/recurrentesCache';
import type { NewRecurrenteInput, Recurrente } from '../types';

export async function fetchRecurrentes(): Promise<Recurrente[]> {
  return recurrentesCache.read().filter((r) => !r.deletedAt);
}

export async function crearRecurrente(
  input: NewRecurrenteInput,
): Promise<Recurrente> {
  if (input.amountCents <= 0) {
    throw new MoneyError('El monto debe ser mayor a cero');
  }

  const recurrente: Recurrente = {
    ...input,
    id: generarId(),
    syncState: 'synced',
    updatedAt: new Date().toISOString(),
  };
  recurrentesCache.upsert(recurrente);
  return recurrente;
}

/**
 * Enciende o apaga un recurrente sin borrarlo.
 *
 * Apagar no toca `generadasHasta`: el historial de lo ya cobrado se conserva,
 * así que volver a encenderlo meses después no regenera todo lo que pasó
 * mientras estaba apagado. Esa es justo la diferencia entre "pausar" y
 * "borrar y volver a crear".
 */
export async function alternarActivo(id: string, activo: boolean): Promise<void> {
  const actual = recurrentesCache.read().find((r) => r.id === id);
  if (!actual) return;
  recurrentesCache.upsert({ ...actual, activo, updatedAt: new Date().toISOString() });
}

export async function eliminarRecurrente(id: string): Promise<void> {
  const now = new Date().toISOString();
  recurrentesCache.write(
    recurrentesCache
      .read()
      .map((r) => (r.id === id ? { ...r, deletedAt: now, updatedAt: now } : r)),
  );
}

/**
 * Avanza la marca de generación. La usa `generador.ts` justo después de
 * insertar los movimientos.
 */
export function marcarGeneradoHasta(id: string, fecha: string): void {
  const actual = recurrentesCache.read().find((r) => r.id === id);
  if (!actual) return;
  recurrentesCache.upsert({
    ...actual,
    generadasHasta: fecha,
    updatedAt: new Date().toISOString(),
  });
}

/** Vacía la copia local. La usa `signOut`. */
export function limpiarRecurrentes(): void {
  recurrentesCache.clear();
}
