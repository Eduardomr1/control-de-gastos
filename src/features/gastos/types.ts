import type { Failure } from '@/shared/errors';

/**
 * Tipos internos del feature. `Expense`, `Category` y `NewExpenseInput` son
 * compartidos entre features y `shared/`, así que se quedan en
 * `@/types/expense` — moverlos aquí obligaría a `shared/lib/mappers.ts` y
 * `shared/lib/sync-engine.ts` a importar de un feature, lo que la Regla 1
 * prohíbe.
 */
export interface PushResult {
  readonly acknowledged: string[];
  readonly failed: { id: string; reason: Failure }[];
}
