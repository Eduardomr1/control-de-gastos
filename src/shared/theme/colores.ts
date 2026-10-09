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

  /** Tokens para rediseño Fintech Premium */
  tarjetaHero: '#0F172A',
  tarjetaHeroBorde: '#1E293B',
  tarjetaHeroTexto: '#F8FAFC',
  tarjetaHeroSubtexto: '#94A3B8',
  fondoPildora: '#F1F5F9',
  acentoSuave: '#EEF2FF',
  positivoSuave: '#DCFCE7',
  errorSuave: '#FEE2E2',
  sombraTarjeta: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
} as const;
