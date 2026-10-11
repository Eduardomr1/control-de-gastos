/**
 * Configuración para el comportamiento de gestos swipe interactivos en filas de gastos.
 * Diseñado bajo arquitectura desacoplada para garantizar pruebas puras en Node/Jest.
 */
export interface ConfiguracionSwipe {
  /** Umbral en píxeles para activar la acción rápida al soltar (default: 72). */
  readonly umbralActivacion?: number;
  /** Límite elástico máximo al deslizar a la izquierda (default: 110). */
  readonly maxDesplazamientoIzquierda?: number;
  /** Límite elástico máximo al deslizar a la derecha (default: 36). */
  readonly maxDesplazamientoDerecha?: number;
  /** Factor de fricción / amortiguación elástica más allá del límite (default: 0.22). */
  readonly resistenciaFriccion?: number;
  /** Velocidad mínima en x (px/ms) para activar con gesto rápido (flick) (default: -0.65). */
  readonly velocidadMinimaActivacion?: number;
}

export type DireccionSwipe = 'ninguna' | 'izquierda' | 'derecha';
export type TipoAccionSwipe = 'eliminar' | 'ninguna';

export interface EstadoSwipe {
  readonly direccion: DireccionSwipe;
  readonly desplazamiento: number;
  readonly distancia: number;
  /** Progreso normalizado de 0 a 1 respecto al umbral de activación. */
  readonly progreso: number;
  /** Indica si se superó el umbral requerido para activar la acción rápida. */
  readonly umbralAlcanzado: boolean;
  readonly accion: TipoAccionSwipe;
}

export interface FeedbackVisualSwipe {
  readonly opacidadAccion: number;
  readonly escalaIcono: number;
  readonly colorFondo: string;
  readonly colorTexto: string;
  readonly textoAccion: string;
}

export interface DecisionReleaseSwipe {
  readonly accionEjecutada: TipoAccionSwipe;
  readonly posicionDestinoX: number;
}

export const CONFIG_SWIPE_PREDETERMINADA: Required<ConfiguracionSwipe> = {
  umbralActivacion: 72,
  maxDesplazamientoIzquierda: 110,
  maxDesplazamientoDerecha: 36,
  resistenciaFriccion: 0.22,
  velocidadMinimaActivacion: -0.65,
};

/**
 * Determina la dirección del gesto a partir del desplazamiento en X.
 */
export function determinarDireccionSwipe(dx: number): DireccionSwipe {
  'worklet';
  if (typeof dx !== 'number' || Number.isNaN(dx) || Math.abs(dx) <= 1) {
    return 'ninguna';
  }
  return dx < 0 ? 'izquierda' : 'derecha';
}

/**
 * Calcula el desplazamiento aplicando resistencia de fricción (rubber-banding)
 * cuando se superan los límites permitidos hacia la izquierda o derecha.
 */
export function calcularDesplazamientoSwipe(
  dx: number,
  config?: ConfiguracionSwipe
): number {
  'worklet';
  if (typeof dx !== 'number' || Number.isNaN(dx)) return 0;

  const maxIzq =
    config?.maxDesplazamientoIzquierda ??
    CONFIG_SWIPE_PREDETERMINADA.maxDesplazamientoIzquierda;
  const maxDer =
    config?.maxDesplazamientoDerecha ??
    CONFIG_SWIPE_PREDETERMINADA.maxDesplazamientoDerecha;
  const friccion =
    config?.resistenciaFriccion ??
    CONFIG_SWIPE_PREDETERMINADA.resistenciaFriccion;

  // Deslizamiento a la izquierda (valores negativos)
  if (dx < 0) {
    const distancia = Math.abs(dx);
    if (distancia <= maxIzq) {
      return dx;
    }
    const exceso = distancia - maxIzq;
    return -(maxIzq + exceso * friccion);
  }

  // Deslizamiento a la derecha (valores positivos) con resistencia elástica
  if (dx > 0) {
    if (dx <= maxDer) {
      return dx;
    }
    const exceso = dx - maxDer;
    return maxDer + exceso * friccion;
  }

  return 0;
}

/**
 * Obtiene el estado actual del swipe analizando distancia, umbral y dirección.
 */
export function calcularEstadoSwipe(
  dx: number,
  config?: ConfiguracionSwipe
): EstadoSwipe {
  'worklet';
  const saneadoDx = typeof dx === 'number' && !Number.isNaN(dx) ? dx : 0;
  const umbral = Math.max(
    1,
    config?.umbralActivacion ?? CONFIG_SWIPE_PREDETERMINADA.umbralActivacion
  );
  const direccion = determinarDireccionSwipe(saneadoDx);
  const distancia = Math.abs(saneadoDx);

  const progreso = Math.min(1, Math.max(0, distancia / umbral));
  const umbralAlcanzado = direccion === 'izquierda' && distancia >= umbral;
  const accion: TipoAccionSwipe = umbralAlcanzado ? 'eliminar' : 'ninguna';

  return {
    direccion,
    desplazamiento: saneadoDx,
    distancia,
    progreso,
    umbralAlcanzado,
    accion,
  };
}

/**
 * Calcula las propiedades visuales y estilos reactivos de feedback (opacidad, escala, colores)
 * para otorgar sensación de feedback táctil e inmediata respuesta al usuario.
 */
export function calcularFeedbackVisualSwipe(
  estado: EstadoSwipe
): FeedbackVisualSwipe {
  'worklet';
  if (estado.direccion !== 'izquierda') {
    return {
      opacidadAccion: 0,
      escalaIcono: 0.8,
      colorFondo: '#EF4444',
      colorTexto: '#FFFFFF',
      textoAccion: '',
    };
  }

  // A medida que se acerca al umbral, opacidad crece de 0 a 1 suavemente
  const opacidadAccion = Math.min(1, Math.max(0, estado.progreso));

  // Escala del icono: inicia en 0.85, llega a 1.0 al umbral, y da pop de feedback a 1.15 si lo rebasa
  const escalaIcono = estado.umbralAlcanzado
    ? 1.15
    : 0.85 + 0.15 * estado.progreso;

  // Rojo más intenso (#DC2626) al superar el umbral para confirmar al usuario que soltar activará la acción
  const colorFondo = estado.umbralAlcanzado ? '#DC2626' : '#EF4444';

  return {
    opacidadAccion,
    escalaIcono,
    colorFondo,
    colorTexto: '#FFFFFF',
    textoAccion: 'Eliminar',
  };
}

/**
 * Determina qué acción debe ejecutarse cuando el usuario suelta el gesto (release),
 * evaluando tanto el desplazamiento acumulado como la velocidad de liberación.
 */
export function resolverReleaseSwipe(
  dx: number,
  vx: number = 0,
  config?: ConfiguracionSwipe
): DecisionReleaseSwipe {
  'worklet';
  const saneadoDx = typeof dx === 'number' && !Number.isNaN(dx) ? dx : 0;
  const saneadoVx = typeof vx === 'number' && !Number.isNaN(vx) ? vx : 0;
  const umbral = Math.max(
    1,
    config?.umbralActivacion ?? CONFIG_SWIPE_PREDETERMINADA.umbralActivacion
  );
  const velMin =
    config?.velocidadMinimaActivacion ??
    CONFIG_SWIPE_PREDETERMINADA.velocidadMinimaActivacion;

  // Solo se activa en dirección izquierda
  if (saneadoDx < 0) {
    const distancia = Math.abs(saneadoDx);
    const superaUmbral = distancia >= umbral;
    // Activación rápida (flick): velocidad hacia la izquierda suficiente superando al menos el 45% del umbral
    const gestoFlickRapido = saneadoVx <= velMin && distancia >= umbral * 0.45;

    if (superaUmbral || gestoFlickRapido) {
      return {
        accionEjecutada: 'eliminar',
        posicionDestinoX: 0,
      };
    }
  }

  return {
    accionEjecutada: 'ninguna',
    posicionDestinoX: 0,
  };
}

/**
 * Genera textos y descripciones accesibles para el gesto swipe en lectores de pantalla.
 */
export function generarA11yAccionSwipe(
  nombreGasto: string,
  montoFormateado: string
): { readonly label: string; readonly hint: string } {
  const nombreLimpio = nombreGasto.trim() || 'Gasto';
  return {
    label: `Eliminar ${nombreLimpio} de ${montoFormateado}`,
    hint: 'Desliza a la izquierda o mantén presionado para abrir el diálogo de confirmación de eliminación',
  };
}
