import type { SyncState } from '@/types/expense';

export type Frecuencia = 'semanal' | 'mensual' | 'anual';
export type TipoRecurrente = 'gasto' | 'ingreso';

export const FRECUENCIAS: readonly Frecuencia[] = ['semanal', 'mensual', 'anual'];

export const ETIQUETA_FRECUENCIA: Record<Frecuencia, string> = {
  semanal: 'Cada semana',
  mensual: 'Cada mes',
  anual: 'Cada año',
};

/**
 * Un movimiento que se repite: la suscripción, la renta, la quincena.
 *
 * Una sola tabla para gastos e ingresos recurrentes, distinguidos por `tipo`.
 * Dos tablas serían el mismo calendario, el mismo job y la misma pantalla
 * duplicados para cambiar el signo del movimiento que generan.
 *
 * `inicio` es el ancla de todo el calendario y no se mueve nunca. La próxima
 * fecha NO se guarda: se deriva con `proximaOcurrencia`. Una columna con la
 * próxima fecha es un segundo lugar donde la verdad puede quedar mal, y basta
 * un cálculo equivocado para que un cobro mensual se corra para siempre.
 */
export interface Recurrente {
  readonly id: string;
  readonly tipo: TipoRecurrente;
  readonly nombre: string;
  readonly amountCents: number;
  readonly currency: string;
  /** Solo para `tipo: 'gasto'`. */
  readonly categoryId?: string;
  /** Solo para `tipo: 'ingreso'`. */
  readonly fuente?: string;
  readonly frecuencia: Frecuencia;
  /** Primera ocurrencia. ISO 8601 con offset. Ancla fija del calendario. */
  readonly inicio: string;
  /** Última ocurrencia ya materializada. Ausente = ninguna todavía. */
  readonly generadasHasta?: string;
  readonly activo: boolean;
  readonly syncState: SyncState;
  readonly updatedAt: string;
  readonly deletedAt?: string;
}

export type NewRecurrenteInput = Omit<
  Recurrente,
  'id' | 'generadasHasta' | 'syncState' | 'updatedAt' | 'deletedAt'
>;

/** Cuántos días antes del cobro se recuerda. */
export const DIAS_DE_AVISO = 2;
