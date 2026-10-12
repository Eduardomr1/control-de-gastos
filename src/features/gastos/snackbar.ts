/**
 * Lógica pura desacoplada para la cola y estado del Snackbar de Deshacer (Undo).
 * Diseñado bajo arquitectura desacoplada para garantizar 100% de cobertura y ejecución
 * instantánea en pruebas unitarias Node/Jest sin dependencias de React Native o Reanimated.
 */

import type { Expense } from '@/types/expense';

export interface GastoEliminadoPendiente {
  readonly id: string;
  readonly amountCents: number;
  readonly currency: string;
  readonly descripcion: string;
  readonly categoryId?: string | undefined;
  readonly nombreCategoria?: string | undefined;
  readonly timestamp: number;
}

export interface ConfiguracionSnackbar {
  /** Duración en milisegundos para permitir revertir antes de persistir definitivamente (default: 4500ms, entre 4 y 5s). */
  readonly duracionMs?: number | undefined;
  /** Límite de retención en cola (default: 10). */
  readonly maxElementosEnCola?: number | undefined;
}

export const CONFIG_SNACKBAR_PREDETERMINADA = {
  duracionMs: 4500,
  maxElementosEnCola: 10,
} as const;

export type EstadoVisibilidadSnackbar = 'oculto' | 'visible';

export interface EstadoColaSnackbar {
  readonly itemsPendientes: readonly GastoEliminadoPendiente[];
  readonly itemActivo: GastoEliminadoPendiente | null;
  readonly visibilidad: EstadoVisibilidadSnackbar;
  readonly duracionMs: number;
  readonly tiempoInicioMs: number | null;
}

export type AccionSnackbar =
  | {
      readonly tipo: 'PROGRAMAR_ELIMINACION';
      readonly payload: {
        readonly gasto: GastoEliminadoPendiente;
        readonly ahora?: number | undefined;
      };
    }
  | {
      readonly tipo: 'DESHACER';
      readonly payload?: {
        readonly gastoId?: string | undefined;
      } | undefined;
    }
  | {
      readonly tipo: 'EXPIRAR';
      readonly payload?: {
        readonly gastoId?: string | undefined;
      } | undefined;
    }
  | {
      readonly tipo: 'LIMPIAR';
    };

export interface ResultadoProgramarEliminacion {
  readonly nuevoEstado: EstadoColaSnackbar;
  readonly itemsAConfirmar: readonly GastoEliminadoPendiente[];
}

export interface ResultadoDeshacerEliminacion {
  readonly nuevoEstado: EstadoColaSnackbar;
  readonly gastoRestaurado: GastoEliminadoPendiente | null;
}

export interface ResultadoExpirarEliminacion {
  readonly nuevoEstado: EstadoColaSnackbar;
  readonly gastoExpirado: GastoEliminadoPendiente | null;
}

export interface FeedbackA11ySnackbar {
  readonly label: string;
  readonly actionLabel: string;
  readonly hint: string;
}

/**
 * Crea el estado inicial limpio para el gestor del snackbar de deshacer.
 */
export function crearEstadoInicialSnackbar(
  config?: ConfiguracionSnackbar
): EstadoColaSnackbar {
  return {
    itemsPendientes: [],
    itemActivo: null,
    visibilidad: 'oculto',
    duracionMs: config?.duracionMs ?? CONFIG_SNACKBAR_PREDETERMINADA.duracionMs,
    tiempoInicioMs: null,
  };
}

/**
 * Normaliza un objeto de gasto en un item pendiente para el snackbar con descripción amigable.
 */
export function crearGastoEliminadoPendiente(
  gasto: Pick<Expense, 'id' | 'amountCents' | 'currency'> & {
    readonly categoryId?: string | undefined;
    readonly note?: string | undefined;
  },
  opciones?: {
    readonly nombreCategoria?: string | undefined;
    readonly ahora?: number | undefined;
  }
): GastoEliminadoPendiente {
  const nombreLimpio = opciones?.nombreCategoria?.trim();
  const notaLimpia = gasto.note?.trim();
  const categoriaFallback = gasto.categoryId?.trim();

  const descripcion =
    nombreLimpio ||
    notaLimpia ||
    categoriaFallback ||
    'Gasto';

  return {
    id: gasto.id,
    amountCents: typeof gasto.amountCents === 'number' && !Number.isNaN(gasto.amountCents) ? gasto.amountCents : 0,
    currency: gasto.currency || 'MXN',
    descripcion,
    categoryId: gasto.categoryId,
    nombreCategoria: opciones?.nombreCategoria,
    timestamp: opciones?.ahora ?? Date.now(),
  };
}

/**
 * Programa la eliminación de un gasto activando el snackbar por 4-5 segundos.
 * Si ya existía otro gasto activo en espera, confirma inmediatamente el anterior para persistirlo.
 */
export function programarEliminacion(
  estado: EstadoColaSnackbar,
  gasto: GastoEliminadoPendiente,
  ahora?: number | undefined,
  config?: ConfiguracionSnackbar
): ResultadoProgramarEliminacion {
  const timestampActual = ahora ?? Date.now();
  const duracion =
    config?.duracionMs ?? estado.duracionMs ?? CONFIG_SNACKBAR_PREDETERMINADA.duracionMs;

  // Si ya es el item activo, evitamos reiniciar innecesariamente
  if (estado.itemActivo?.id === gasto.id) {
    return {
      nuevoEstado: estado,
      itemsAConfirmar: [],
    };
  }

  // Si había un item previo activo, se confirma inmediatamente para su persistencia
  const itemsAConfirmar: GastoEliminadoPendiente[] = [];
  if (estado.itemActivo && estado.itemActivo.id !== gasto.id) {
    itemsAConfirmar.push(estado.itemActivo);
  }

  // Filtramos de la cola de pendientes el item que se confirma y el nuevo si ya estaba
  const pendientesRestantes = estado.itemsPendientes.filter(
    (item) => item.id !== gasto.id && (!estado.itemActivo || item.id !== estado.itemActivo.id)
  );

  const nuevoEstado: EstadoColaSnackbar = {
    itemsPendientes: [...pendientesRestantes, gasto],
    itemActivo: gasto,
    visibilidad: 'visible',
    duracionMs: duracion,
    tiempoInicioMs: timestampActual,
  };

  return {
    nuevoEstado,
    itemsAConfirmar,
  };
}

/**
 * Revierte la eliminación del gasto (Deshacer), cancelando su borrado y restaurándolo.
 */
export function deshacerEliminacion(
  estado: EstadoColaSnackbar,
  gastoId?: string | undefined
): ResultadoDeshacerEliminacion {
  const idABuscar = gastoId ?? estado.itemActivo?.id;
  if (!idABuscar) {
    return {
      nuevoEstado: estado,
      gastoRestaurado: null,
    };
  }

  const gastoEncontrado =
    estado.itemsPendientes.find((item) => item.id === idABuscar) ??
    (estado.itemActivo?.id === idABuscar ? estado.itemActivo : null);

  if (!gastoEncontrado) {
    return {
      nuevoEstado: estado,
      gastoRestaurado: null,
    };
  }

  const nuevosPendientes = estado.itemsPendientes.filter(
    (item) => item.id !== idABuscar
  );

  const esActivo = estado.itemActivo?.id === idABuscar;
  const nuevoItemActivo = esActivo
    ? (nuevosPendientes[nuevosPendientes.length - 1] ?? null)
    : estado.itemActivo;

  const nuevoEstado: EstadoColaSnackbar = {
    ...estado,
    itemsPendientes: nuevosPendientes,
    itemActivo: nuevoItemActivo,
    visibilidad: nuevoItemActivo ? 'visible' : 'oculto',
    tiempoInicioMs: nuevoItemActivo ? estado.tiempoInicioMs : null,
  };

  return {
    nuevoEstado,
    gastoRestaurado: gastoEncontrado,
  };
}

/**
 * Concluye el ciclo de vida del snackbar cuando se agota el tiempo (timeout 4-5s)
 * marcando el gasto como expirado para persistir definitivamente la eliminación.
 */
export function expirarEliminacion(
  estado: EstadoColaSnackbar,
  gastoId?: string | undefined
): ResultadoExpirarEliminacion {
  const idABuscar = gastoId ?? estado.itemActivo?.id;
  if (!idABuscar) {
    return {
      nuevoEstado: estado,
      gastoExpirado: null,
    };
  }

  const gastoEncontrado =
    estado.itemsPendientes.find((item) => item.id === idABuscar) ??
    (estado.itemActivo?.id === idABuscar ? estado.itemActivo : null);

  if (!gastoEncontrado) {
    return {
      nuevoEstado: estado,
      gastoExpirado: null,
    };
  }

  const nuevosPendientes = estado.itemsPendientes.filter(
    (item) => item.id !== idABuscar
  );

  const esActivo = estado.itemActivo?.id === idABuscar;
  const nuevoItemActivo = esActivo
    ? (nuevosPendientes[nuevosPendientes.length - 1] ?? null)
    : estado.itemActivo;

  const nuevoEstado: EstadoColaSnackbar = {
    ...estado,
    itemsPendientes: nuevosPendientes,
    itemActivo: nuevoItemActivo,
    visibilidad: nuevoItemActivo ? 'visible' : 'oculto',
    tiempoInicioMs: nuevoItemActivo ? estado.tiempoInicioMs : null,
  };

  return {
    nuevoEstado,
    gastoExpirado: gastoEncontrado,
  };
}

/**
 * Reducer puro para transiciones predecibles de estado en la cola del snackbar.
 */
export function reducirColaSnackbar(
  estado: EstadoColaSnackbar,
  accion: AccionSnackbar,
  config?: ConfiguracionSnackbar
): EstadoColaSnackbar {
  switch (accion.tipo) {
    case 'PROGRAMAR_ELIMINACION':
      return programarEliminacion(
        estado,
        accion.payload.gasto,
        accion.payload.ahora,
        config
      ).nuevoEstado;

    case 'DESHACER':
      return deshacerEliminacion(estado, accion.payload?.gastoId).nuevoEstado;

    case 'EXPIRAR':
      return expirarEliminacion(estado, accion.payload?.gastoId).nuevoEstado;

    case 'LIMPIAR':
      return crearEstadoInicialSnackbar(config);

    default:
      return estado;
  }
}

/**
 * Comprueba si un gasto específico está pendiente de eliminación definitiva.
 */
export function estaPendienteDeEliminacion(
  estado: EstadoColaSnackbar,
  gastoId: string
): boolean {
  if (!gastoId) return false;
  return (
    estado.itemActivo?.id === gastoId ||
    estado.itemsPendientes.some((item) => item.id === gastoId)
  );
}

/**
 * Obtiene la lista de identificadores únicos pendientes de eliminación.
 */
export function obtenerIdsPendientes(
  estado: EstadoColaSnackbar
): readonly string[] {
  const ids = new Set<string>();
  if (estado.itemActivo) {
    ids.add(estado.itemActivo.id);
  }
  for (const item of estado.itemsPendientes) {
    ids.add(item.id);
  }
  return Array.from(ids);
}

/**
 * Filtra los gastos visibles de la lista ocultando de manera reactiva y optimista
 * aquellos que se encuentren pendientes de confirmación en el snackbar de deshacer.
 */
export function filtrarGastosVisibles<T extends { readonly id: string }>(
  gastos: readonly T[],
  idsPendientes: ReadonlySet<string> | readonly string[]
): T[] {
  if (!gastos || gastos.length === 0) return [];
  const set = idsPendientes instanceof Set ? idsPendientes : new Set(idsPendientes);
  if (set.size === 0) return [...gastos];
  return gastos.filter((g) => !set.has(g.id));
}

/**
 * Calcula el progreso normalizado (0 a 1) del temporizador del snackbar.
 */
export function calcularProgresoTiempo(
  tiempoTranscurridoMs: number,
  duracionTotalMs: number
): number {
  if (
    typeof duracionTotalMs !== 'number' ||
    Number.isNaN(duracionTotalMs) ||
    duracionTotalMs <= 0
  ) {
    return 1;
  }
  if (
    typeof tiempoTranscurridoMs !== 'number' ||
    Number.isNaN(tiempoTranscurridoMs) ||
    tiempoTranscurridoMs <= 0
  ) {
    return 0;
  }
  return Math.min(1, Math.max(0, tiempoTranscurridoMs / duracionTotalMs));
}

/**
 * Calcula los milisegundos restantes del temporizador del snackbar.
 */
export function calcularTiempoRestanteMs(
  tiempoInicioMs: number,
  ahoraMs: number,
  duracionTotalMs: number
): number {
  if (
    typeof tiempoInicioMs !== 'number' ||
    typeof ahoraMs !== 'number' ||
    typeof duracionTotalMs !== 'number' ||
    Number.isNaN(tiempoInicioMs) ||
    Number.isNaN(ahoraMs) ||
    Number.isNaN(duracionTotalMs)
  ) {
    return 0;
  }
  const transcurrido = ahoraMs - tiempoInicioMs;
  return Math.max(0, duracionTotalMs - transcurrido);
}

/**
 * Formatea el texto conciso a desplegar en el Snackbar.
 */
export function formatearMensajeSnackbar(
  descripcion: string,
  montoFormateado?: string
): string {
  const desc = descripcion?.trim() || 'Gasto';
  if (montoFormateado && montoFormateado.trim().length > 0) {
    return `${desc} (${montoFormateado.trim()}) eliminado`;
  }
  return `${desc} eliminado`;
}

/**
 * Genera etiquetas y pistas accesibles para lectores de pantalla (VoiceOver / TalkBack).
 */
export function generarA11ySnackbar(
  gasto: GastoEliminadoPendiente | null,
  segundosRestantes?: number
): FeedbackA11ySnackbar {
  if (!gasto) {
    return {
      label: 'Sin acciones pendientes',
      actionLabel: 'Deshacer',
      hint: 'No hay elementos para restaurar',
    };
  }

  const desc = gasto.descripcion?.trim() || 'Gasto';
  const tiempoTexto =
    typeof segundosRestantes === 'number' && segundosRestantes > 0
      ? ` Tienes ${Math.ceil(segundosRestantes)} segundos para deshacer.`
      : '';

  return {
    label: `Gasto de ${desc} eliminado.${tiempoTexto}`,
    actionLabel: 'Deshacer eliminación',
    hint: 'Toca dos veces para restaurar este gasto y cancelar su eliminación',
  };
}
