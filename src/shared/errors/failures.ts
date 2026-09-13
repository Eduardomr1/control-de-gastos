/**
 * Unión discriminada de fallos de dominio. La UI nunca ve un string crudo del
 * backend: solo el `tipo` (y, para credenciales, un `motivo` controlado por
 * nosotros, no el mensaje de Supabase).
 *
 * `detalleTecnico` existe solo para consola/logs. Renderizarlo estaría mal:
 * es exactamente el antipatrón de BUG-014, prefijos y mensajes crudos
 * filtrándose a la pantalla.
 */
export type Failure =
  | { tipo: 'SinRed' }
  | { tipo: 'SesionExpirada' }
  | { tipo: 'ServidorNoDisponible'; detalleTecnico?: string }
  | { tipo: 'DatosInvalidos'; motivo: 'credenciales' | 'cuenta_no_confirmada' }
  | { tipo: 'Desconocido'; detalleTecnico?: string };

/**
 * Type guard para el `unknown` que entrega GAsyncGate.error: TanStack Query no
 * tipa el error de una queryFn como lo que ésta rechaza, así que el
 * estrechamiento ocurre aquí, en el sitio de uso, no en el gate genérico.
 */
export function esFailure(e: unknown): e is Failure {
  return typeof e === 'object' && e !== null && 'tipo' in e;
}
