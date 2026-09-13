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
  fondo: '#FFFFFF',
  texto: '#0B0F14',
  textoSecundario: '#6B7280',
  acento: '#2563EB',
  acentoDeshabilitado: '#93C5FD',
  error: '#DC2626',
  borde: '#D1D5DB',
} as const;
