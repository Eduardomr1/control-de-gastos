/**
 * Proyección de ritmo de gasto mensual (burn-rate) y alertas proactivas.
 *
 * Un umbral estático al 80% solo avisa cuando el dinero ya casi se acabó. Si el
 * día 5 del mes ya se consumió el 45% del presupuesto, el umbral estático calla
 * aunque ese ritmo proyecte cerrar al 270%. Este módulo cruza el gasto local
 * acumulado contra el calendario real del mes (incluyendo años bisiestos) sin
 * pasar por UTC ni usar aritmética flotante.
 */

import {
  componentesLocales,
  diasDelMes,
  monthKeyOf,
  type MonthKey,
} from '@/shared/lib/date';
import { MoneyError, assertCents, sumCents } from '@/shared/lib/money';
import type { Expense } from '@/types/expense';

import { presupuestoVigente } from './progreso';
import type { Presupuesto } from './types';

export type RiesgoPresupuestal =
  | 'bajo'
  | 'alerta_proyectada'
  | 'umbral_80'
  | 'excedido';

export interface ProyeccionMensual {
  readonly mes: MonthKey;
  readonly diasTranscurridos: number;
  readonly diasTotales: number;
  readonly diasRestantes: number;
  readonly gastadoCents: number;
  readonly limiteCents: number;
  /** Gasto promedio diario en centavos enteros (half-up). */
  readonly ritmoDiarioCents: number;
  /** Cierre estimado al último día del mes manteniendo el ritmo actual. */
  readonly proyectadoFinDeMesCents: number;
  /** Positivo = holgura proyectada; negativo = sobrecosto proyectado. */
  readonly margenProyectadoCents: number;
  /** Cuánto se puede gastar por día restante sin rebasar `limiteCents` (truncado hacia abajo). */
  readonly presupuestoDiarioRestanteCents: number;
  /** Día del mes (`1..diasTotales`) en que se agotaría el límite al ritmo actual, o `null` si alcanza. */
  readonly diaEstimadoAgotamiento: number | null;
  readonly riesgo: RiesgoPresupuestal;
}

export interface AlertaMensualCategoria {
  readonly categoryId: string;
  readonly proyeccion: ProyeccionMensual;
}

/**
 * División entera con redondeo half-up (`>= 0.5` sube) mediante `BigInt`,
 * evitando flotantes y `Math.round` (restringido fuera de `money.ts`).
 */
function dividirHalfUp(numerador: bigint, denominador: bigint): number {
  return Number((numerador * 2n + denominador) / (denominador * 2n));
}

function dividirTecho(numerador: bigint, denominador: bigint): number {
  return Number((numerador + denominador - 1n) / denominador);
}

/**
 * Proyecta el cierre mensual de gasto (global o de una categoría) a la fecha
 * local `fechaReferenciaIso`.
 */
export function proyectarGastoMensual(
  gastos: readonly Expense[],
  limiteCents: number,
  fechaReferenciaIso: string,
  categoryId?: string | undefined,
): ProyeccionMensual {
  assertCents(limiteCents);
  if (limiteCents <= 0) {
    throw new MoneyError('El límite presupuestal debe ser mayor a cero');
  }

  const ref = componentesLocales(fechaReferenciaIso);
  const mes = monthKeyOf(fechaReferenciaIso);
  const diasTotales = diasDelMes(ref.anio, ref.mes);
  const diasTranscurridos = Math.min(Math.max(ref.dia, 1), diasTotales);
  const diasRestantes = diasTotales - diasTranscurridos;

  const montosDelPeriodo: number[] = [];
  for (const gasto of gastos) {
    if (gasto.deletedAt !== undefined) continue;
    if (categoryId !== undefined && gasto.categoryId !== categoryId) continue;
    if (monthKeyOf(gasto.occurredAt) !== mes) continue;
    const fechaGasto = componentesLocales(gasto.occurredAt);
    if (fechaGasto.dia <= diasTranscurridos) {
      montosDelPeriodo.push(gasto.amountCents);
    }
  }

  const gastadoCents = sumCents(montosDelPeriodo);
  const gastadoBig = BigInt(gastadoCents);
  const transcurridosBig = BigInt(diasTranscurridos);
  const totalesBig = BigInt(diasTotales);

  const ritmoDiarioCents = dividirHalfUp(gastadoBig, transcurridosBig);
  const proyectadoFinDeMesCents = dividirHalfUp(
    gastadoBig * totalesBig,
    transcurridosBig,
  );
  const margenProyectadoCents = limiteCents - proyectadoFinDeMesCents;

  const presupuestoDiarioRestanteCents =
    diasRestantes <= 0 || gastadoCents >= limiteCents
      ? 0
      : Number(BigInt(limiteCents - gastadoCents) / BigInt(diasRestantes));

  let diaEstimadoAgotamiento: number | null = null;
  if (
    gastadoCents > 0 &&
    (proyectadoFinDeMesCents >= limiteCents || gastadoCents >= limiteCents)
  ) {
    const estimado = dividirTecho(
      BigInt(limiteCents) * transcurridosBig,
      gastadoBig,
    );
    diaEstimadoAgotamiento = Math.min(diasTotales, Math.max(1, estimado));
  }

  let riesgo: RiesgoPresupuestal = 'bajo';
  if (gastadoCents >= limiteCents) {
    riesgo = 'excedido';
  } else if (gastadoBig * 10n >= BigInt(limiteCents) * 8n) {
    riesgo = 'umbral_80';
  } else if (proyectadoFinDeMesCents > limiteCents) {
    riesgo = 'alerta_proyectada';
  }

  return {
    mes,
    diasTranscurridos,
    diasTotales,
    diasRestantes,
    gastadoCents,
    limiteCents,
    ritmoDiarioCents,
    proyectadoFinDeMesCents,
    margenProyectadoCents,
    presupuestoDiarioRestanteCents,
    diaEstimadoAgotamiento,
    riesgo,
  };
}

const PRIORIDAD_RIESGO: Readonly<Record<RiesgoPresupuestal, number>> = {
  excedido: 3,
  umbral_80: 2,
  alerta_proyectada: 1,
  bajo: 0,
};

/**
 * Evalúa todas las categorías con presupuesto vigente en el mes de
 * `fechaReferenciaIso` y las ordena por severidad de riesgo y déficit proyectado.
 */
export function evaluarAlertasMensuales(
  presupuestos: readonly Presupuesto[],
  gastos: readonly Expense[],
  fechaReferenciaIso: string,
): AlertaMensualCategoria[] {
  const mes = monthKeyOf(fechaReferenciaIso);
  const categoriasUnicas = new Set<string>();
  for (const p of presupuestos) {
    if (!p.deletedAt) categoriasUnicas.add(p.categoryId);
  }

  const alertas: AlertaMensualCategoria[] = [];
  for (const categoryId of categoriasUnicas) {
    const vigente = presupuestoVigente(presupuestos, categoryId, mes);
    if (!vigente || vigente.limiteCents <= 0) continue;
    alertas.push({
      categoryId,
      proyeccion: proyectarGastoMensual(
        gastos,
        vigente.limiteCents,
        fechaReferenciaIso,
        categoryId,
      ),
    });
  }

  return alertas.sort((a, b) => {
    const difRiesgo =
      PRIORIDAD_RIESGO[b.proyeccion.riesgo] - PRIORIDAD_RIESGO[a.proyeccion.riesgo];
    if (difRiesgo !== 0) return difRiesgo;
    if (a.proyeccion.margenProyectadoCents !== b.proyeccion.margenProyectadoCents) {
      return a.proyeccion.margenProyectadoCents - b.proyeccion.margenProyectadoCents;
    }
    return a.categoryId.localeCompare(b.categoryId);
  });
}
