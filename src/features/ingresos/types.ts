import type { SyncState } from '@/types/expense';

/**
 * Un ingreso. Hereda las mismas decisiones de dominio que `Expense`, porque el
 * problema es el mismo: dinero en centavos enteros, fecha ISO con offset
 * explícito, id de cliente para poder crear sin red, y borrado suave.
 *
 * Vive en el feature y no en `@/types/` a diferencia de `Expense`: nada de
 * `shared/` lo necesita. El día que ingresos sincronice contra Supabase y
 * `sync-engine.ts` tenga que resolver sus conflictos, se mueve — no antes.
 *
 * `cuentaId` llegó en la Fase 5. La columna existía desde v2, nullable y sin
 * usar, justo para que esa fase solo tuviera que poblarla.
 */
export interface Income {
  readonly id: string;
  readonly amountCents: number;
  readonly currency: string;
  /** De dónde vino. Texto libre con sugerencias, no un catálogo del backend. */
  readonly fuente: string;
  /** ISO 8601 con offset explícito. Nunca una fecha "desnuda". */
  readonly occurredAt: string;
  readonly note?: string;
  readonly cuentaId?: string;
  readonly syncState: SyncState;
  readonly updatedAt: string;
  readonly deletedAt?: string;
}

export type NewIncomeInput = Omit<
  Income,
  'id' | 'syncState' | 'updatedAt' | 'deletedAt'
>;

/**
 * Sugerencias de fuente. Una constante y no una tabla: son cinco cadenas que
 * no cambian por usuario ni por dispositivo, y el campo acepta cualquier otra
 * cosa que el usuario escriba. Una tabla obligaría a una migración, un CRUD y
 * una pantalla de administración para algo que se resuelve con un arreglo.
 */
export const FUENTES = ['Sueldo', 'Freelance', 'Venta', 'Regalo', 'Otro'] as const;
