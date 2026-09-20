import { PixelRatio, type TextStyle } from 'react-native';

/**
 * Tipografía que respeta el escalado del sistema sin romper el layout.
 *
 * Los tamaños que entrega este módulo YA vienen multiplicados por la escala
 * del sistema. Quien los consuma debe apagar el escalado automático de React
 * Native (`allowFontScaling={false}`), o se aplicará dos veces y los topes de
 * abajo dejarán de servir: la segunda multiplicación no los respeta. Eso lo
 * garantizan `GTexto` y `GCampo`; ver BUG-017.
 *
 * Solo los montos de display llevan tope —el total del encabezado y el monto
 * en captura—: son los elementos más grandes y, sin límite, a 300% no caben en
 * la pantalla. El texto corrido y el monto de una fila escalan sin tope, que
 * es lo que el usuario pidió al ampliar la fuente.
 */

const MAX_AMOUNT_SCALE = 1.8;

/** Cifras de ancho fijo: sin esto los montos bailan al cambiar de dígito. */
const TABULAR = ['tabular-nums'] as TextStyle['fontVariant'];

export function scaledSize(base: number, maxScale = Infinity): number {
  const scale = Math.min(PixelRatio.getFontScale(), maxScale);
  return Math.round(base * scale);
}

export const typography = {
  /**
   * Versalitas de sección: "TOTAL DE SEPTIEMBRE", "CATEGORÍA".
   *
   * La mayúscula es `textTransform`, no `.toUpperCase()` sobre la cadena: así
   * el texto real que leen los lectores de pantalla y las pruebas E2E sigue
   * siendo "Total de enero 2026", no una versión gritada.
   */
  eyebrow: () => ({
    fontSize: scaledSize(12),
    fontWeight: '500' as const,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
  }),
  /** Fecha y metadatos. Escalado libre. */
  caption: () => ({ fontSize: scaledSize(13), fontWeight: '400' as const }),
  /** Texto corrido: subtítulos y copy de estados vacíos. */
  body: () => ({ fontSize: scaledSize(15), fontWeight: '400' as const }),
  /** Nombre de categoría, contenido de campos y botones. */
  label: () => ({ fontSize: scaledSize(16), fontWeight: '500' as const }),
  /** Encabezado de un estado dentro de la pantalla. */
  titulo: () => ({ fontSize: scaledSize(17), fontWeight: '600' as const }),
  /** Título de pantalla. */
  tituloPantalla: () => ({ fontSize: scaledSize(30), fontWeight: '600' as const }),
  /**
   * Monto de una fila. Sin tope, a diferencia de los montos de display.
   *
   * Lo tuvo mientras la fila era siempre horizontal y el monto le robaba
   * ancho a la categoría. Desde que la fila se apila por encima de 1.5x
   * (ver `apilaPorEscala`), el monto solo convive en horizontal por debajo de
   * esa escala, donde un tope de 1.8x nunca llega a activarse. Mantenerlo solo
   * lograba que el dato más importante de la fila fuera el texto más pequeño.
   */
  amount: () => ({
    fontSize: scaledSize(16),
    fontWeight: '700' as const,
    fontVariant: TABULAR,
  }),
  /** Total del mes, en el encabezado de la lista. Escalado con tope. */
  total: () => ({
    fontSize: scaledSize(34, MAX_AMOUNT_SCALE),
    fontWeight: '700' as const,
    fontVariant: TABULAR,
  }),
  /** Monto en captura. El elemento protagonista de Agregar. */
  montoGrande: () => ({
    fontSize: scaledSize(52, MAX_AMOUNT_SCALE),
    fontWeight: '700' as const,
    fontVariant: TABULAR,
  }),
} as const;

/**
 * Altura mínima de una fila. NUNCA usar como `height`.
 * Ver BUG-005: la altura fija recorta el texto al ampliar la fuente.
 */
export function rowMinHeight(): number {
  return Math.max(64, scaledSize(64));
}

/**
 * True cuando el texto está tan ampliado que una fila horizontal deja de ser
 * el layout correcto y conviene apilar.
 *
 * No es cosmética: a 300% una palabra como "Comida" mide más que la columna
 * que le queda al lado del monto, y React Native la parte a media palabra
 * ("Comid" / "a") porque no tiene otra salida. Apilar le devuelve el ancho
 * completo y el corte vuelve a ocurrir entre palabras. Ver BUG-017.
 */
export function apilaPorEscala(umbral = 1.5): boolean {
  return PixelRatio.getFontScale() >= umbral;
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
