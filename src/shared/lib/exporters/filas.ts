/**
 * La forma que un exportador necesita de un movimiento.
 *
 * Deliberadamente plana y sin `Expense` ni `Income`: `shared/` no puede
 * importar de un feature (Regla 1), y además un exportador no tiene por qué
 * saber que existen dos tipos de movimiento. Quien exporta arma las filas.
 */
export interface FilaExportable {
  /** ISO 8601 con offset. El exportador se queda con la parte de la fecha. */
  readonly fecha: string;
  readonly tipo: 'Gasto' | 'Ingreso';
  readonly concepto: string;
  readonly cuenta: string;
  /** Centavos enteros. Positivo siempre; el signo lo da `tipo`. */
  readonly montoCents: number;
  readonly nota?: string;
}
