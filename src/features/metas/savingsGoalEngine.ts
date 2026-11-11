/**
 * Motor de planificación financiera y proyección de metas de ahorro.
 *
 * Proporciona algoritmos de matemática financiera para cálculo de aportes con interés
 * compuesto e inflación, cronograma de hitos intermedios, análisis de velocidad de
 * recuperación ante déficits y optimización multivariable de distribución de excedentes
 * con algoritmo de Hamilton (mayor resto) sin pérdida de centavos.
 *
 * Toda la aritmética monetaria opera en centavos enteros (`assertCents`).
 */

import { assertCents, MoneyError, allocateCents, sumCents } from '@/shared/lib/money';

export type PrioridadMeta = 'alta' | 'media' | 'baja';

export interface ParametrosCalculoMeta {
  readonly objetivoCents: number;
  readonly actualCents: number;
  /** Plazo objetivo en meses (entero >= 1). */
  readonly mesesPlazo: number;
  /** Tasa de rendimiento nominal anual esperado (ej. 8 para 8%). Por defecto 0. */
  readonly rendimientoAnualPorc?: number | undefined;
  /** Tasa de inflación anual esperada (ej. 4 para 4%). Por defecto 0. */
  readonly inflacionAnualPorc?: number | undefined;
}

export interface ProyeccionMetaAhorro {
  readonly objetivoNominalCents: number;
  readonly objetivoAjustadoInflacionCents: number;
  readonly actualCents: number;
  readonly aporteMensualCents: number;
  readonly totalAportesEstimadosCents: number;
  readonly interesesGanadosEstimadosCents: number;
  readonly progresoPorcentual: number;
  readonly esAlcanzable: boolean;
  readonly mesesPlazo: number;
}

export interface HitoAhorro {
  readonly porcentaje: number;
  readonly montoHitoCents: number;
  readonly mesEstimado: number;
  readonly alcanzado: boolean;
  readonly diferenciaFaltanteCents: number;
}

export interface ParametrosRecuperacionMeta {
  readonly objetivoCents: number;
  readonly actualCents: number;
  /** Meses restantes para la fecha límite original (>= 1). */
  readonly mesesRestantes: number;
  /** Cuota mensual planificada original en centavos. */
  readonly aporteMensualPrevioCents: number;
  /** Número de meses transcurridos desde el inicio de la meta (>= 1). */
  readonly mesesTranscurridos: number;
  readonly rendimientoAnualPorc?: number | undefined;
}

export interface ResultadoRecuperacion {
  readonly esperadoActualCents: number;
  readonly deficitAcumuladoCents: number;
  readonly nuevoAporteMensualCents: number;
  readonly incrementoMensualCents: number;
  readonly mesesAdicionalesSiMantieneAporte: number;
  readonly estaAlDia: boolean;
}

export interface ItemMetaParaAsignacion {
  readonly id: string;
  readonly nombre: string;
  readonly prioridad: PrioridadMeta;
  readonly objetivoCents: number;
  readonly actualCents: number;
  /** Cuota mínima requerida o deseada para el periodo actual en centavos. */
  readonly cuotaMinimaSugeridaCents?: number | undefined;
}

export interface AsignacionMeta {
  readonly id: string;
  readonly nombre: string;
  readonly prioridad: PrioridadMeta;
  readonly aporteAsignadoCents: number;
  readonly nuevoActualCents: number;
  readonly metaCompletada: boolean;
  readonly porcentajeProgresoPostAsignacion: number;
}

export interface PlanDistribucionMetas {
  readonly asignaciones: readonly AsignacionMeta[];
  readonly totalDistribuidoCents: number;
  readonly excedenteNoAsignadoCents: number;
  readonly metasCompletadasCount: number;
}

const PESOS_PRIORIDAD: Record<PrioridadMeta, number> = {
  alta: 5,
  media: 3,
  baja: 1,
};

/**
 * Valida los parámetros básicos de una meta de ahorro.
 */
function validarParametrosBase(
  objetivoCents: number,
  actualCents: number,
  meses: number
): void {
  assertCents(objetivoCents);
  assertCents(actualCents);

  if (objetivoCents <= 0) {
    throw new MoneyError('El objetivo de ahorro debe ser un monto positivo');
  }
  if (actualCents < 0) {
    throw new MoneyError('El monto actual ahorrado no puede ser negativo');
  }
  if (!Number.isInteger(meses) || meses < 1) {
    throw new MoneyError('El plazo en meses debe ser un entero mayor o igual a 1');
  }
}

/**
 * Calcula la cuota mensual requerida y la proyección de crecimiento patrimonial
 * con soporte para capitalización compuesta e indexación inflacionaria.
 */
export function calcularAporteMensualRequerido(
  params: ParametrosCalculoMeta
): ProyeccionMetaAhorro {
  const {
    objetivoCents,
    actualCents,
    mesesPlazo,
    rendimientoAnualPorc = 0,
    inflacionAnualPorc = 0,
  } = params;

  validarParametrosBase(objetivoCents, actualCents, mesesPlazo);

  if (rendimientoAnualPorc < 0 || inflacionAnualPorc < 0) {
    throw new MoneyError('Las tasas de rendimiento e inflación no pueden ser negativas');
  }

  // Ajuste por inflación acumulada en el horizonte: FV = PV * (1 + inf)^(meses/12)
  const inflacionDecimal = inflacionAnualPorc / 100;
  const factorInflacion = Math.pow(1 + inflacionDecimal, mesesPlazo / 12);
  const objetivoAjustadoCents = Math.round(objetivoCents * factorInflacion);

  // Si ya se alcanzó o superó el objetivo ajustado
  if (actualCents >= objetivoAjustadoCents) {
    return {
      objetivoNominalCents: objetivoCents,
      objetivoAjustadoInflacionCents: objetivoAjustadoCents,
      actualCents,
      aporteMensualCents: 0,
      totalAportesEstimadosCents: 0,
      interesesGanadosEstimadosCents: 0,
      progresoPorcentual: 100,
      esAlcanzable: true,
      mesesPlazo,
    };
  }

  const rendimientoDecimal = rendimientoAnualPorc / 100;

  let aporteMensualCents: number;
  let interesesGanadosCents: number;

  if (rendimientoDecimal === 0) {
    // Sin interés compuesto: división lineal del saldo restante
    const faltanteCents = objetivoAjustadoCents - actualCents;
    aporteMensualCents = Math.ceil(faltanteCents / mesesPlazo);
    interesesGanadosCents = 0;
  } else {
    // Tasa efectiva mensual equivalente: (1 + r)^(1/12) - 1
    const tasaMensual = Math.pow(1 + rendimientoDecimal, 1 / 12) - 1;

    // Valor futuro del capital actual ahorrado: FV_actual = actual * (1 + i)^n
    const fvActual = actualCents * Math.pow(1 + tasaMensual, mesesPlazo);

    // Faltante en valor futuro a cubrir con los aportes periódicos
    const faltanteFv = objetivoAjustadoCents - fvActual;

    if (faltanteFv <= 0) {
      // El capital actual por sí solo genera suficientes intereses para cubrir la meta
      aporteMensualCents = 0;
      interesesGanadosCents = Math.round(fvActual - actualCents);
    } else {
      // Anualidad ordinaria con capitalización periódica: PMT = FV * i / ((1 + i)^n - 1)
      const factorAnualidad =
        (Math.pow(1 + tasaMensual, mesesPlazo) - 1) / tasaMensual;
      const pmtCalculado = faltanteFv / factorAnualidad;
      aporteMensualCents = Math.max(1, Math.round(pmtCalculado));

      const totalAportes = aporteMensualCents * mesesPlazo;
      const montoTotalEsperado = Math.round(fvActual + pmtCalculado * factorAnualidad);
      interesesGanadosCents = Math.max(
        0,
        montoTotalEsperado - actualCents - totalAportes
      );
    }
  }

  const totalAportesEstimadosCents = aporteMensualCents * mesesPlazo;
  const progresoPorcentual = Number(
    Math.min(100, (actualCents / objetivoAjustadoCents) * 100).toFixed(2)
  );

  return {
    objetivoNominalCents: objetivoCents,
    objetivoAjustadoInflacionCents: objetivoAjustadoCents,
    actualCents,
    aporteMensualCents,
    totalAportesEstimadosCents,
    interesesGanadosEstimadosCents: interesesGanadosCents,
    progresoPorcentual,
    esAlcanzable: true,
    mesesPlazo,
  };
}

/**
 * Calcula el cronograma de hitos clave (25%, 50%, 75%, 100%) para la meta.
 */
export function calcularHitosAhorro(
  objetivoCents: number,
  actualCents: number,
  aporteMensualCents: number,
  rendimientoAnualPorc = 0
): readonly HitoAhorro[] {
  validarParametrosBase(objetivoCents, actualCents, 1);
  assertCents(aporteMensualCents);

  const porcentajeHitos = [25, 50, 75, 100];
  const tasaMensual =
    rendimientoAnualPorc > 0
      ? Math.pow(1 + rendimientoAnualPorc / 100, 1 / 12) - 1
      : 0;

  return porcentajeHitos.map((porc) => {
    const montoHitoCents = Math.round((objetivoCents * porc) / 100);
    const alcanzado = actualCents >= montoHitoCents;
    const diferenciaFaltanteCents = alcanzado ? 0 : montoHitoCents - actualCents;

    let mesEstimado = 0;

    if (alcanzado) {
      mesEstimado = 0;
    } else if (aporteMensualCents <= 0 && tasaMensual === 0) {
      mesEstimado = Infinity;
    } else {
      // Simulación progresiva mes a mes hasta alcanzar el hito
      let balance = actualCents;
      let mes = 0;
      const maxMesesSim = 1200; // tope de 100 años

      while (balance < montoHitoCents && mes < maxMesesSim) {
        mes += 1;
        balance = Math.round(balance * (1 + tasaMensual) + aporteMensualCents);
      }
      mesEstimado = mes >= maxMesesSim ? Infinity : mes;
    }

    return {
      porcentaje: porc,
      montoHitoCents,
      mesEstimado,
      alcanzado,
      diferenciaFaltanteCents,
    };
  });
}

/**
 * Evalúa desviaciones contra el plan proyectado y genera opciones de recuperación
 * (ajuste de aporte o prórroga del horizonte).
 */
export function calcularVelocidadRecuperacion(
  params: ParametrosRecuperacionMeta
): ResultadoRecuperacion {
  const {
    objetivoCents,
    actualCents,
    mesesRestantes,
    aporteMensualPrevioCents,
    mesesTranscurridos,
    rendimientoAnualPorc = 0,
  } = params;

  validarParametrosBase(objetivoCents, actualCents, mesesRestantes);
  assertCents(aporteMensualPrevioCents);

  if (!Number.isInteger(mesesTranscurridos) || mesesTranscurridos < 1) {
    throw new MoneyError('Los meses transcurridos deben ser un entero mayor o igual a 1');
  }

  // Cuánto se esperaba tener ahorrado al día de hoy (linealizado o compuesto)
  const esperadoActualCents = Math.min(
    objetivoCents,
    aporteMensualPrevioCents * mesesTranscurridos
  );

  const deficitAcumuladoCents = Math.max(0, esperadoActualCents - actualCents);
  const estaAlDia = deficitAcumuladoCents === 0;

  // Nuevo aporte requerido para terminar exactamente en los meses restantes
  const proyeccionRestante = calcularAporteMensualRequerido({
    objetivoCents,
    actualCents,
    mesesPlazo: mesesRestantes,
    rendimientoAnualPorc,
  });

  const nuevoAporteMensualCents = proyeccionRestante.aporteMensualCents;
  const incrementoMensualCents = Math.max(
    0,
    nuevoAporteMensualCents - aporteMensualPrevioCents
  );

  // Si mantiene su aporte original previo, ¿cuántos meses adicionales requiere?
  let mesesAdicionalesSiMantieneAporte = 0;
  if (aporteMensualPrevioCents > 0 && actualCents < objetivoCents) {
    const faltanteCents = objetivoCents - actualCents;
    const mesesTotalesConAportePrevio = Math.ceil(
      faltanteCents / aporteMensualPrevioCents
    );
    mesesAdicionalesSiMantieneAporte = Math.max(
      0,
      mesesTotalesConAportePrevio - mesesRestantes
    );
  }

  return {
    esperadoActualCents,
    deficitAcumuladoCents,
    nuevoAporteMensualCents,
    incrementoMensualCents,
    mesesAdicionalesSiMantieneAporte,
    estaAlDia,
  };
}

/**
 * Optimiza la distribución de un excedente mensual entre múltiples metas de ahorro
 * activas, priorizando según urgencia e importancia y aplicando el algoritmo de
 * Hamilton para asignar el remanente con exactitud al centavo sin sobrepasar objetivos.
 */
export function optimizarDistribucionExcedente(params: {
  readonly excedenteDisponibleCents: number;
  readonly metas: readonly ItemMetaParaAsignacion[];
}): PlanDistribucionMetas {
  const { excedenteDisponibleCents, metas } = params;

  assertCents(excedenteDisponibleCents);
  if (excedenteDisponibleCents < 0) {
    throw new MoneyError('El excedente disponible no puede ser negativo');
  }

  if (metas.length === 0 || excedenteDisponibleCents === 0) {
    return {
      asignaciones: metas.map((m) => ({
        id: m.id,
        nombre: m.nombre,
        prioridad: m.prioridad,
        aporteAsignadoCents: 0,
        nuevoActualCents: m.actualCents,
        metaCompletada: m.actualCents >= m.objetivoCents,
        porcentajeProgresoPostAsignacion: Number(
          Math.min(100, (m.actualCents / m.objetivoCents) * 100).toFixed(2)
        ),
      })),
      totalDistribuidoCents: 0,
      excedenteNoAsignadoCents: excedenteDisponibleCents,
      metasCompletadasCount: metas.filter((m) => m.actualCents >= m.objetivoCents).length,
    };
  }

  // Validar cada meta
  for (const meta of metas) {
    validarParametrosBase(meta.objetivoCents, meta.actualCents, 1);
    if (meta.cuotaMinimaSugeridaCents !== undefined) {
      assertCents(meta.cuotaMinimaSugeridaCents);
    }
  }

  // Filtramos metas que aún requieran aportes
  const estadosMetas = metas.map((meta) => {
    const faltanteCents = Math.max(0, meta.objetivoCents - meta.actualCents);
    return {
      meta,
      faltanteCents,
      asignadoCents: 0,
      completada: faltanteCents === 0,
    };
  });

  let excedenteRestante = excedenteDisponibleCents;

  // Fase 1: Garantizar la cuota mínima sugerida priorizando por importancia (alta -> media -> baja)
  const prioridadesOrdenadas: PrioridadMeta[] = ['alta', 'media', 'baja'];

  for (const prio of prioridadesOrdenadas) {
    for (const estado of estadosMetas) {
      if (estado.completada || estado.meta.prioridad !== prio) continue;
      const cuotaSugerida = estado.meta.cuotaMinimaSugeridaCents ?? 0;
      if (cuotaSugerida <= 0) continue;

      const aAsignar = Math.min(excedenteRestante, estado.faltanteCents, cuotaSugerida);
      if (aAsignar > 0) {
        estado.asignadoCents += aAsignar;
        estado.faltanteCents -= aAsignar;
        excedenteRestante -= aAsignar;
        if (estado.faltanteCents === 0) {
          estado.completada = true;
        }
      }
      if (excedenteRestante === 0) break;
    }
    if (excedenteRestante === 0) break;
  }

  // Fase 2: Distribuir el remanente proporcionalmente según el peso de prioridad
  // mientras haya excedente y metas incompletas
  while (excedenteRestante > 0) {
    const activas = estadosMetas.filter((e) => !e.completada && e.faltanteCents > 0);
    if (activas.length === 0) break;

    const pesos = activas.map((e) => PESOS_PRIORIDAD[e.meta.prioridad]);
    const porciones = allocateCents(excedenteRestante, pesos);

    let asignoEnEstaRonda = false;

    for (let i = 0; i < activas.length; i += 1) {
      const item = activas[i]!;
      const porcion = porciones[i]!;

      // Capped al faltante de la meta para no sobre-financiarla
      const aporteEfectivo = Math.min(porcion, item.faltanteCents);

      if (aporteEfectivo > 0) {
        item.asignadoCents += aporteEfectivo;
        item.faltanteCents -= aporteEfectivo;
        excedenteRestante -= aporteEfectivo;
        if (item.faltanteCents === 0) {
          item.completada = true;
        }
        asignoEnEstaRonda = true;
      }
    }

    // Si ninguna porción pudo ser asignada (por ejemplo todos llegaron a su tope), salimos
    if (!asignoEnEstaRonda) break;
  }

  const totalDistribuidoCents = sumCents(estadosMetas.map((e) => e.asignadoCents));
  const excedenteNoAsignadoCents = excedenteDisponibleCents - totalDistribuidoCents;

  const asignaciones: AsignacionMeta[] = estadosMetas.map((e) => {
    const nuevoActualCents = e.meta.actualCents + e.asignadoCents;
    const completada = nuevoActualCents >= e.meta.objetivoCents;
    const porcentaje = Number(
      Math.min(100, (nuevoActualCents / e.meta.objetivoCents) * 100).toFixed(2)
    );

    return {
      id: e.meta.id,
      nombre: e.meta.nombre,
      prioridad: e.meta.prioridad,
      aporteAsignadoCents: e.asignadoCents,
      nuevoActualCents,
      metaCompletada: completada,
      porcentajeProgresoPostAsignacion: porcentaje,
    };
  });

  const metasCompletadasCount = asignaciones.filter((a) => a.metaCompletada).length;

  return {
    asignaciones,
    totalDistribuidoCents,
    excedenteNoAsignadoCents,
    metasCompletadasCount,
  };
}
