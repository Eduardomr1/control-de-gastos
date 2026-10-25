/**
 * Sobres presupuestales por categoría (envelope budgeting) en centavos enteros.
 *
 * Resuelve dos problemas clásicos de finanzas personales:
 * 1. Al repartir un tope mensual global en porcentajes o pesos relativos
 *    (ej. 50/30/20 o tercios iguales), redondear cada categoría por separado
 *    inventa o pierde centavos. `allocateCents` conserva el total al centavo.
 * 2. Al reasignar saldo disponible de una categoría sub-ejecutada a otra bajo
 *    presión, la suma total presupuestada del mes permanece invariante.
 */

import type { MonthKey } from '@/shared/lib/date';
import { MoneyError, allocateCents, assertCents } from '@/shared/lib/money';
import type { Expense } from '@/types/expense';

import { gastoPorCategoria } from './progreso';

export interface PesoDeSobre {
  readonly categoryId: string;
  readonly peso: number;
}

export type EstadoUmbralSobre = 'normal' | 'precaucion' | 'excedido';

export interface SobreDeCategoria {
  readonly categoryId: string;
  readonly asignadoCents: number;
  readonly gastadoCents: number;
  /** Saldo libre del sobre (`asignadoCents - gastadoCents`); negativo si se rebasó. */
  readonly disponibleCents: number;
  /** Consumo en puntos básicos enteros (`10000 bps = 100.00%`). */
  readonly consumoBps: number;
  readonly estadoUmbral: EstadoUmbralSobre;
}

function construirSobre(
  categoryId: string,
  asignadoCents: number,
  gastadoCents: number,
): SobreDeCategoria {
  assertCents(asignadoCents);
  assertCents(gastadoCents);

  const disponibleCents = asignadoCents - gastadoCents;
  let consumoBps = 0;
  let estadoUmbral: EstadoUmbralSobre = 'normal';

  if (asignadoCents === 0) {
    if (gastadoCents > 0) {
      consumoBps = 10_000;
      estadoUmbral = 'excedido';
    }
  } else {
    consumoBps = Number((BigInt(gastadoCents) * 10_000n) / BigInt(asignadoCents));
    if (gastadoCents >= asignadoCents) {
      estadoUmbral = 'excedido';
    } else if (BigInt(gastadoCents) * 10n >= BigInt(asignadoCents) * 8n) {
      estadoUmbral = 'precaucion';
    }
  }

  return {
    categoryId,
    asignadoCents,
    gastadoCents,
    disponibleCents,
    consumoBps,
    estadoUmbral,
  };
}

/**
 * Reparte `presupuestoGlobalCents` entre categorías según sus pesos enteros y
 * cruza cada sobre contra el gasto acumulado del mes local.
 */
export function distribuirEnSobres(
  presupuestoGlobalCents: number,
  pesos: readonly PesoDeSobre[],
  gastos: readonly Expense[],
  mes: MonthKey,
): SobreDeCategoria[] {
  assertCents(presupuestoGlobalCents);
  if (presupuestoGlobalCents < 0) {
    throw new MoneyError('El presupuesto global no puede ser negativo');
  }

  const vistos = new Set<string>();
  for (const item of pesos) {
    const idLimpio = item.categoryId.trim();
    if (!idLimpio) {
      throw new Error('Cada sobre requiere un categoryId no vacío');
    }
    if (vistos.has(idLimpio)) {
      throw new Error(`Categoría duplicada en sobres: "${idLimpio}"`);
    }
    vistos.add(idLimpio);
  }

  const asignaciones = allocateCents(
    presupuestoGlobalCents,
    pesos.map((p) => p.peso),
  );
  const gastadoMapa = gastoPorCategoria(gastos, mes);

  return pesos.map((item, idx) => {
    const categoryId = item.categoryId.trim();
    const asignadoCents = asignaciones[idx] ?? 0;
    const gastadoCents = gastadoMapa.get(categoryId) ?? 0;
    return construirSobre(categoryId, asignadoCents, gastadoCents);
  });
}

/**
 * Transfiere `montoCents` del saldo disponible de `origenCategoryId` hacia
 * `destinoCategoryId`, preservando intacta la suma total asignada del mes.
 */
export function rebalancearSobres(
  sobres: readonly SobreDeCategoria[],
  origenCategoryId: string,
  destinoCategoryId: string,
  montoCents: number,
): SobreDeCategoria[] {
  assertCents(montoCents);
  if (montoCents <= 0) {
    throw new MoneyError('El monto a transferir entre sobres debe ser mayor a cero');
  }
  if (origenCategoryId === destinoCategoryId) {
    throw new Error('El sobre de origen y el de destino deben ser distintos');
  }

  const origen = sobres.find((s) => s.categoryId === origenCategoryId);
  const destino = sobres.find((s) => s.categoryId === destinoCategoryId);

  if (!origen) {
    throw new Error(`No existe el sobre de origen: "${origenCategoryId}"`);
  }
  if (!destino) {
    throw new Error(`No existe el sobre de destino: "${destinoCategoryId}"`);
  }
  if (origen.disponibleCents < montoCents) {
    throw new MoneyError('El sobre de origen no tiene saldo disponible suficiente');
  }

  return sobres.map((sobre) => {
    if (sobre.categoryId === origenCategoryId) {
      return construirSobre(
        sobre.categoryId,
        sobre.asignadoCents - montoCents,
        sobre.gastadoCents,
      );
    }
    if (sobre.categoryId === destinoCategoryId) {
      return construirSobre(
        sobre.categoryId,
        sobre.asignadoCents + montoCents,
        sobre.gastadoCents,
      );
    }
    return sobre;
  });
}
