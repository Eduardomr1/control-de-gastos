/**
 * Simulador estocástico Monte Carlo de flujo de caja y runway de solvencia.
 *
 * Modela la trayectoria financiera mensual considerando variabilidad estocástica
 * en flujos de ingresos y choques de gastos imprevistos. Toda la aritmética de
 * saldos opera en centavos enteros sin pérdida de precisión.
 */

import { assertCents, MoneyError } from '@/shared/lib/money';

export interface ParametrosSimulacionRunway {
  readonly saldoInicialCents: number;
  readonly ingresosMensualesEsperadosCents: number;
  /** Variabilidad porcentual en ingresos (0 a 100). */
  readonly variabilidadIngresosPorc: number;
  readonly gastosFijosMensualesCents: number;
  readonly gastosVariablesPromedioCents: number;
  /** Variabilidad porcentual en gastos (0 a 100). */
  readonly variabilidadGastosPorc: number;
  /** Número de meses horizonte a proyectar (1 a 120). Por defecto 12. */
  readonly numMeses?: number | undefined;
  /** Número de iteraciones Monte Carlo (10 a 10,000). Por defecto 1,000. */
  readonly iteraciones?: number | undefined;
  /** Semilla pseudoaleatoria opcional para reproducibilidad determinista. */
  readonly semilla?: number | undefined;
}

export interface ResultadoSimulacionRunway {
  readonly probabilidadInsolvenciaPorc: number;
  readonly runwayMesesP10: number;
  readonly runwayMesesP50: number;
  readonly runwayMesesP90: number;
  readonly saldoFinalP10Cents: number;
  readonly saldoFinalP50Cents: number;
  readonly saldoFinalP90Cents: number;
  readonly mesPrimerQuiebreMedio: number | null;
  readonly iteracionesEjecutadas: number;
}

/**
 * Generador pseudoaleatorio Mulberry32 para ejecuciones deterministas y testeables.
 */
class DeterministicPRNG {
  private state: number;

  constructor(seed: number = 42) {
    this.state = (Math.floor(seed) ^ 0x6d2b79f5) >>> 0;
    if (this.state === 0) this.state = 1;
  }

  public next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Genera una variable con distribución normal estándar N(0, 1) vía Box-Muller.
   */
  public nextGaussian(): number {
    let u1 = 0;
    let u2 = 0;
    while (u1 === 0) u1 = this.next();
    while (u2 === 0) u2 = this.next();
    return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  }
}

/**
 * Obtiene el valor percentil de un arreglo numérico ordenado ascendente.
 * Interpolación lineal entre índices más próximos.
 */
function calcularPercentil(valoresOrdenados: readonly number[], p: number): number {
  if (valoresOrdenados.length === 0) return 0;
  if (valoresOrdenados.length === 1) return valoresOrdenados[0]!;

  const pos = (valoresOrdenados.length - 1) * p;
  const base = Math.floor(pos);
  const resto = pos - base;

  const vBase = valoresOrdenados[base]!;
  if (base + 1 < valoresOrdenados.length) {
    const vSig = valoresOrdenados[base + 1]!;
    return Math.round(vBase + resto * (vSig - vBase));
  }
  return vBase;
}

/**
 * Ejecuta una simulación Monte Carlo de flujo de caja para estimar la probabilidad
 * de agotamiento de saldo y percentiles de runway.
 */
export function simularRunwayMonteCarlo(
  params: ParametrosSimulacionRunway
): ResultadoSimulacionRunway {
  assertCents(params.saldoInicialCents);
  assertCents(params.ingresosMensualesEsperadosCents);
  assertCents(params.gastosFijosMensualesCents);
  assertCents(params.gastosVariablesPromedioCents);

  if (params.ingresosMensualesEsperadosCents < 0) {
    throw new MoneyError('Los ingresos esperados deben ser mayores o iguales a cero');
  }
  if (params.gastosFijosMensualesCents < 0 || params.gastosVariablesPromedioCents < 0) {
    throw new MoneyError('Los gastos deben ser mayores o iguales a cero');
  }
  if (params.variabilidadIngresosPorc < 0 || params.variabilidadIngresosPorc > 100) {
    throw new MoneyError('La variabilidad de ingresos debe estar entre 0% y 100%');
  }
  if (params.variabilidadGastosPorc < 0 || params.variabilidadGastosPorc > 100) {
    throw new MoneyError('La variabilidad de gastos debe estar entre 0% y 100%');
  }

  const numMeses = params.numMeses ?? 12;
  if (!Number.isInteger(numMeses) || numMeses < 1 || numMeses > 120) {
    throw new MoneyError('El horizonte de meses debe ser un entero entre 1 y 120');
  }

  const iteraciones = params.iteraciones ?? 1000;
  if (!Number.isInteger(iteraciones) || iteraciones < 10 || iteraciones > 10000) {
    throw new MoneyError('Las iteraciones deben ser un entero entre 10 y 10,000');
  }

  const prng = new DeterministicPRNG(params.semilla ?? 12345);

  const runways: number[] = [];
  const saldosFinales: number[] = [];
  const mesesQuiebre: number[] = [];
  let corridasInsolventes = 0;

  const varIngresoFactor = params.variabilidadIngresosPorc / 100;
  const varGastoFactor = params.variabilidadGastosPorc / 100;

  for (let it = 0; it < iteraciones; it++) {
    let saldo = params.saldoInicialCents;
    let quiebreMes: number | null = null;
    let runwayMeses = numMeses;

    for (let mes = 1; mes <= numMeses; mes++) {
      // Choque estocástico normal centrado en 1.0
      const shockIngreso = 1.0 + varIngresoFactor * (prng.nextGaussian() * 0.5);
      const factorIngreso = Math.max(0, shockIngreso);
      const ingresoMes = Math.round(params.ingresosMensualesEsperadosCents * factorIngreso);

      const shockGasto = 1.0 + varGastoFactor * (prng.nextGaussian() * 0.5);
      const factorGasto = Math.max(0, shockGasto);
      const gastoVarMes = Math.round(params.gastosVariablesPromedioCents * factorGasto);
      const gastoTotalMes = params.gastosFijosMensualesCents + gastoVarMes;

      saldo += ingresoMes - gastoTotalMes;

      if (saldo <= 0 && quiebreMes === null) {
        quiebreMes = mes;
        runwayMeses = mes;
      }
    }

    if (quiebreMes !== null) {
      corridasInsolventes++;
      mesesQuiebre.push(quiebreMes);
    }

    runways.push(runwayMeses);
    saldosFinales.push(saldo);
  }

  runways.sort((a, b) => a - b);
  saldosFinales.sort((a, b) => a - b);

  const probabilidadInsolvenciaPorc = Math.round((corridasInsolventes / iteraciones) * 100);

  const mesPrimerQuiebreMedio =
    mesesQuiebre.length > 0
      ? Number((mesesQuiebre.reduce((acc, v) => acc + v, 0) / mesesQuiebre.length).toFixed(1))
      : null;

  return {
    probabilidadInsolvenciaPorc,
    runwayMesesP10: calcularPercentil(runways, 0.1),
    runwayMesesP50: calcularPercentil(runways, 0.5),
    runwayMesesP90: calcularPercentil(runways, 0.9),
    saldoFinalP10Cents: calcularPercentil(saldosFinales, 0.1),
    saldoFinalP50Cents: calcularPercentil(saldosFinales, 0.5),
    saldoFinalP90Cents: calcularPercentil(saldosFinales, 0.9),
    mesPrimerQuiebreMedio,
    iteracionesEjecutadas: iteraciones,
  };
}

export type PerfilEstabilidadIngreso =
  | 'fijo_asalariado'
  | 'variable_comisiones'
  | 'freelance_independiente';

export interface ParametrosFondoEmergencia {
  readonly gastosFijosMensualesCents: number;
  readonly gastosVariablesEsencialesCents: number;
  /** Meses recomendados base de reserva (e.g. 3 a 12 meses). Por defecto 3 meses. */
  readonly mesesObjetivo?: number | undefined;
  readonly perfilEstabilidad?: PerfilEstabilidadIngreso | undefined;
  /** Si tiene dependientes económicos directos (aumenta colchón de contingencia). */
  readonly tieneDependientes?: boolean | undefined;
  readonly saldoActualCents?: number | undefined;
}

export interface RecomendacionFondoEmergencia {
  readonly gastoMensualEsencialCents: number;
  readonly mesesAjustadosRecomendados: number;
  readonly montoObjetivoCents: number;
  readonly saldoActualCents: number;
  readonly brechaFaltanteCents: number;
  readonly porcentajeCobertura: number;
  readonly desgloseFactores: {
    readonly baseMeses: number;
    readonly ajustePerfilMeses: number;
    readonly ajusteDependientesMeses: number;
  };
}

/**
 * Calcula el colchón financiero y fondo de emergencia recomendado ponderando
 * gastos esenciales fijos/variables, estabilidad de ingresos y cargas familiares.
 */
export function calcularFondoEmergenciaRecomendado(
  params: ParametrosFondoEmergencia
): RecomendacionFondoEmergencia {
  assertCents(params.gastosFijosMensualesCents);
  assertCents(params.gastosVariablesEsencialesCents);
  if (params.gastosFijosMensualesCents < 0 || params.gastosVariablesEsencialesCents < 0) {
    throw new MoneyError('Los gastos esenciales deben ser mayores o iguales a cero');
  }

  const baseMeses = params.mesesObjetivo ?? 3;
  if (!Number.isInteger(baseMeses) || baseMeses < 1 || baseMeses > 24) {
    throw new MoneyError('Los meses objetivo deben ser un entero entre 1 y 24');
  }

  const perfil = params.perfilEstabilidad ?? 'fijo_asalariado';
  let ajustePerfilMeses = 0;
  if (perfil === 'variable_comisiones') ajustePerfilMeses = 2;
  else if (perfil === 'freelance_independiente') ajustePerfilMeses = 3;

  const ajusteDependientesMeses = params.tieneDependientes ? 2 : 0;
  const mesesAjustadosRecomendados = baseMeses + ajustePerfilMeses + ajusteDependientesMeses;

  const gastoMensualEsencialCents =
    params.gastosFijosMensualesCents + params.gastosVariablesEsencialesCents;
  const montoObjetivoCents = gastoMensualEsencialCents * mesesAjustadosRecomendados;

  const saldoActual = params.saldoActualCents ?? 0;
  assertCents(saldoActual);

  const brechaFaltanteCents = Math.max(0, montoObjetivoCents - Math.max(0, saldoActual));
  const porcentajeCobertura =
    montoObjetivoCents === 0
      ? 100
      : Math.min(100, Math.round((Math.max(0, saldoActual) / montoObjetivoCents) * 100));

  return {
    gastoMensualEsencialCents,
    mesesAjustadosRecomendados,
    montoObjetivoCents,
    saldoActualCents: saldoActual,
    brechaFaltanteCents,
    porcentajeCobertura,
    desgloseFactores: {
      baseMeses,
      ajustePerfilMeses,
      ajusteDependientesMeses,
    },
  };
}
