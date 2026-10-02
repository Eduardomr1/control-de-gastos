/**
 * Backend local de metas de ahorro.
 *
 * Aportar es una suma sobre el valor guardado, no un `set`: dos aportes
 * seguidos tienen que sumarse, no pisarse. Por eso la función recibe el monto
 * del aporte y no el nuevo total — si recibiera el total, el cálculo quedaría
 * del lado de la pantalla y dos aportes rápidos partirían del mismo valor
 * viejo.
 */

import { DateError, esFechaDelCalendario } from '@/shared/lib/date';
import { crearRepositorio, type Disco } from '@/shared/lib/db/repositorioLocal';
import { generarId } from '@/shared/lib/id';
import { MoneyError, sumCents } from '@/shared/lib/money';

import type { Meta, NewMetaInput } from '../types';

const metasCache = crearRepositorio<Meta>(
  () =>
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    (require('../store/metasDb') as { metasDb: Disco<Meta> }).metasDb,
);

export async function fetchMetas(): Promise<Meta[]> {
  return metasCache.read().filter((m) => !m.deletedAt);
}

export async function crearMeta(input: NewMetaInput): Promise<Meta> {
  if (input.objetivoCents <= 0) {
    throw new MoneyError('El objetivo debe ser mayor a cero');
  }
  // La fecha llega de un campo de texto, no de un selector: se valida aqui y
  // no solo en la pantalla, porque "2026-02-30" tiene la forma correcta y no
  // es un dia.
  if (input.fechaLimite !== undefined && !esFechaDelCalendario(input.fechaLimite)) {
    throw new DateError('La fecha limite no es un dia valido (AAAA-MM-DD)');
  }

  const meta: Meta = {
    ...input,
    id: generarId(),
    actualCents: 0,
    syncState: 'synced',
    updatedAt: new Date().toISOString(),
  };
  metasCache.upsert(meta);
  return meta;
}

/**
 * Suma un aporte a lo que ya llevaba la meta.
 *
 * No se topa en el objetivo: quien junta de más lo ve, y toparlo silenciaría
 * dinero que el usuario sí apartó. Es la barra la que se topa al dibujar.
 */
export async function aportar(id: string, montoCents: number): Promise<void> {
  if (montoCents <= 0) {
    throw new MoneyError('El aporte debe ser mayor a cero');
  }

  const actual = metasCache.read().find((m) => m.id === id && !m.deletedAt);
  if (!actual) return;

  metasCache.upsert({
    ...actual,
    actualCents: sumCents([actual.actualCents, montoCents]),
    updatedAt: new Date().toISOString(),
  });
}

export async function eliminarMeta(id: string): Promise<void> {
  const now = new Date().toISOString();
  metasCache.write(
    metasCache
      .read()
      .map((m) => (m.id === id ? { ...m, deletedAt: now, updatedAt: now } : m)),
  );
}

/** Vacía la copia local. La usa `signOut`. */
export function limpiarMetas(): void {
  metasCache.clear();
}
