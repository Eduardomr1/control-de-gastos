import type { Expense } from '@/types/expense';

export interface PosibleDuplicado {
  readonly original: Expense;
  readonly candidato: Expense;
  readonly diferenciaMinutos: number;
  readonly coincidenciaExactaMonto: boolean;
  readonly coincidenciaCategoria: boolean;
}

/**
 * Detecta transacciones potencialmente duplicadas creadas accidentalmente
 * (por ejemplo doble tap sin conexión o recarga de interfaz).
 *
 * Considera como duplicado movimientos con id distinto, mismo monto en centavos,
 * misma categoría y una diferencia menor a `ventanaMinutosMax` (por defecto 10 min).
 */
export function detectarDuplicados(
  gastos: readonly Expense[],
  ventanaMinutosMax = 10
): readonly PosibleDuplicado[] {
  if (gastos.length < 2) return [];

  const noEliminados = gastos.filter((g) => !g.deletedAt);
  const duplicados: PosibleDuplicado[] = [];

  // Comparar pares O(N^2) sobre listas locales
  for (let i = 0; i < noEliminados.length; i++) {
    const a = noEliminados[i]!;
    const timeA = new Date(a.occurredAt).getTime();

    for (let j = i + 1; j < noEliminados.length; j++) {
      const b = noEliminados[j]!;
      if (a.id === b.id) continue;

      if (a.amountCents === b.amountCents && a.categoryId === b.categoryId) {
        const timeB = new Date(b.occurredAt).getTime();
        const difMinutos = Math.abs(timeB - timeA) / (1000 * 60);

        if (difMinutos <= ventanaMinutosMax) {
          duplicados.push({
            original: timeA <= timeB ? a : b,
            candidato: timeA <= timeB ? b : a,
            diferenciaMinutos: Number(difMinutos.toFixed(1)),
            coincidenciaExactaMonto: true,
            coincidenciaCategoria: true,
          });
        }
      }
    }
  }

  return duplicados;
}
