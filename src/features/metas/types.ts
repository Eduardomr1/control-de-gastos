import type { SyncState } from '@/types/expense';

/**
 * Una meta de ahorro: cuánto se quiere juntar, para cuándo, y cuánto va.
 *
 * `actualCents` es una columna y no la suma de una tabla `aportes`, lo que
 * contradice lo que hacen presupuestos y saldos —calcular, nunca
 * materializar— y a propósito: aquí no hay de dónde derivarlo. Un aporte a una
 * meta no es un gasto ni un ingreso, así que la suma no existe en ninguna otra
 * tabla. El día que se pida "historial de aportes", la tabla se agrega y esta
 * columna pasa a ser caché.
 */
export interface Meta {
  readonly id: string;
  readonly nombre: string;
  readonly objetivoCents: number;
  readonly actualCents: number;
  /** `YYYY-MM-DD`. Opcional: una meta sin fecha es igual de válida. */
  readonly fechaLimite?: string;
  readonly syncState: SyncState;
  readonly updatedAt: string;
  readonly deletedAt?: string;
}

export type NewMetaInput = Omit<
  Meta,
  'id' | 'actualCents' | 'syncState' | 'updatedAt' | 'deletedAt'
>;
