import { PixelRatio } from 'react-native';

/**
 * Tipografía que respeta el escalado del sistema sin romper el layout.
 *
 * El monto se escala con un tope: es el elemento protagonista y, sin límite,
 * a 310% desplaza a la categoría y la fecha fuera de la fila. El resto del
 * texto escala sin tope, que es el comportamiento que espera el usuario.
 */

const MAX_AMOUNT_SCALE = 1.8;

export function scaledSize(base: number, maxScale = Infinity): number {
  const scale = Math.min(PixelRatio.getFontScale(), maxScale);
  return Math.round(base * scale);
}

export const typography = {
  /** Monto del gasto. Escalado con tope. */
  amount: () => ({
    fontSize: scaledSize(24, MAX_AMOUNT_SCALE),
    fontWeight: '700' as const,
  }),
  /** Nombre de categoría. Escalado libre. */
  label: () => ({ fontSize: scaledSize(16), fontWeight: '500' as const }),
  /** Fecha y metadatos. Escalado libre. */
  caption: () => ({ fontSize: scaledSize(13), fontWeight: '400' as const }),
} as const;

/**
 * Altura mínima de una fila. NUNCA usar como `height`.
 * Ver BUG-005: la altura fija recorta el texto al ampliar la fuente.
 */
export function rowMinHeight(): number {
  return Math.max(64, scaledSize(64));
}

/**
 * Tamaño de un control táctil, escalado con el ajuste de fuente del sistema.
 *
 * Un usuario que amplía el texto normalmente también necesita objetivos
 * táctiles más grandes, así que los controles escalan junto con la tipografía.
 * El tope evita que el botón flotante domine la pantalla en el escalado máximo.
 * Ver BUG-007.
 */
export function controlSize(base: number, maxScale = 1.5): number {
  const scaled = scaledSize(base, maxScale);
  // 44pt es el mínimo táctil de las guías de Apple y Material.
  return Math.max(44, scaled);
}
