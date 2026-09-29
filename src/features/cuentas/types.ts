import type { SyncState } from '@/types/expense';

export type TipoDeCuenta = 'efectivo' | 'debito' | 'credito';

export const TIPOS_DE_CUENTA: readonly TipoDeCuenta[] = [
  'efectivo',
  'debito',
  'credito',
];

export const ETIQUETA_TIPO: Record<TipoDeCuenta, string> = {
  efectivo: 'Efectivo',
  debito: 'Débito',
  credito: 'Crédito',
};

/**
 * Id de la cuenta "General", la que crea la migración v6 y a la que quedan
 * asignados todos los movimientos anteriores a esta fase.
 *
 * Literal y no generado al vuelo: es lo que hace reversible la migración. Un
 * id aleatorio obligaría a adivinar, al revertir, cuál de las cuentas la creó
 * la migración y cuáles el usuario.
 */
export const CUENTA_GENERAL = '00000000-0000-4000-8000-000000000001';

export interface Cuenta {
  readonly id: string;
  readonly nombre: string;
  readonly tipo: TipoDeCuenta;
  /** Lo que había en la cuenta antes del primer movimiento registrado. */
  readonly saldoInicialCents: number;
  readonly currency: string;
  readonly syncState: SyncState;
  readonly updatedAt: string;
  readonly deletedAt?: string;
}

export type NewCuentaInput = Omit<
  Cuenta,
  'id' | 'syncState' | 'updatedAt' | 'deletedAt'
>;

export interface SaldoDeCuenta {
  readonly cuenta: Cuenta;
  readonly ingresosCents: number;
  readonly gastosCents: number;
  /** `saldoInicial + ingresos − gastos`. Puede ser negativo. */
  readonly saldoCents: number;
}
