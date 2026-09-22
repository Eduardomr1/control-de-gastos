/**
 * Paleta de la app. Colores explícitos, nunca tema automático: sin esto el
 * tema oscuro del sistema dejaba texto negro sobre fondo negro (BUG-010).
 *
 * Solo se nombran aquí los tonos que ya se repetían en más de una pantalla.
 * Un color usado una sola vez (el gris del skeleton, el ámbar del badge
 * pendiente) se queda como literal en su componente: nombrarlo no evita
 * duplicación que no existe.
 */

export const colores = {
  fondo: '#FBFBFD',
  /** Tarjetas y campos: se levanta medio tono sobre el fondo. */
  superficie: '#FFFFFF',
  texto: '#1D1D1F',
  textoSecundario: '#86868B',
  acento: '#5D3FD3',
  acentoDeshabilitado: '#B9A9EC',
  /** Texto e iconos encima del acento. */
  sobreAcento: '#FFFFFF',
  error: '#DC2626',
  /**
   * Dinero que entra: monto en la captura de ingreso y balance en verde.
   * Verde oscuro y no el verde de marca: sobre `superficie` da 5.1:1, que pasa
   * AA para texto normal. Un verde más vivo se ve mejor y no se lee.
   */
  positivo: '#15803D',
  borde: '#E5E5EA',
} as const;
