/**
 * Backend local de presupuestos.
 *
 * Guardar es un upsert por (categoría, mes) y no un insert: el índice único de
 * la migración v3 lo exige, y lo que el usuario hace en la pantalla es "el
 * límite de Comida ahora es 700", no "agrega otro límite para Comida".
 */

import { generarId } from '@/shared/lib/id';
import { MoneyError } from '@/shared/lib/money';

import { presupuestosCache } from '../store/presupuestosCache';
import type { NewPresupuestoInput, Presupuesto } from '../types';

export async function fetchPresupuestos(): Promise<Presupuesto[]> {
  return presupuestosCache.read().filter((p) => !p.deletedAt);
}

/**
 * Fija el límite de una categoría, reemplazando el que hubiera para el mismo
 * periodo. El id se conserva cuando ya existía: así el registro es el mismo a
 * ojos del servidor el día que esto sincronice, y no un alta nueva por cada
 * edición.
 */
export async function guardarPresupuesto(
  input: NewPresupuestoInput,
): Promise<Presupuesto> {
  if (input.limiteCents <= 0) {
    throw new MoneyError('El límite debe ser mayor a cero');
  }

  const existente = presupuestosCache
    .read()
    .find(
      (p) =>
        !p.deletedAt &&
        p.categoryId === input.categoryId &&
        p.mesReferencia === input.mesReferencia,
    );

  const presupuesto: Presupuesto = {
    ...input,
    id: existente?.id ?? generarId(),
    syncState: 'synced',
    updatedAt: new Date().toISOString(),
  };
  presupuestosCache.upsert(presupuesto);
  return presupuesto;
}

/** Borrado suave: quitar el límite no borra el historial del registro. */
export async function eliminarPresupuesto(id: string): Promise<void> {
  const now = new Date().toISOString();
  presupuestosCache.write(
    presupuestosCache
      .read()
      .map((p) => (p.id === id ? { ...p, deletedAt: now, updatedAt: now } : p)),
  );
}

/** Vacía la copia local. La usa `signOut`. */
export function limpiarPresupuestos(): void {
  presupuestosCache.clear();
}
