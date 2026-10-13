import type { Category, Expense } from '@/types/expense';

export interface FilaGastoPropsMin {
  readonly expense: Expense;
  readonly index: number;
  readonly categoria: Category | undefined;
  readonly onLongPress: () => void;
  readonly onSwipeEliminar?: (() => void) | undefined;
}

export function areFilaGastoPropsEqual(
  prevProps: FilaGastoPropsMin,
  nextProps: FilaGastoPropsMin
): boolean {
  if (prevProps.index !== nextProps.index) return false;
  if (prevProps.onLongPress !== nextProps.onLongPress) return false;
  if (prevProps.onSwipeEliminar !== nextProps.onSwipeEliminar) return false;

  const prevExp = prevProps.expense;
  const nextExp = nextProps.expense;

  if (prevExp.id !== nextExp.id) return false;
  if (prevExp.amountCents !== nextExp.amountCents) return false;
  if (prevExp.currency !== nextExp.currency) return false;
  if (prevExp.categoryId !== nextExp.categoryId) return false;
  if (prevExp.occurredAt !== nextExp.occurredAt) return false;
  if (prevExp.syncState !== nextExp.syncState) return false;
  if (prevExp.updatedAt !== nextExp.updatedAt) return false;
  if (prevExp.note !== nextExp.note) return false;
  if (prevExp.deletedAt !== nextExp.deletedAt) return false;

  const prevCat = prevProps.categoria;
  const nextCat = nextProps.categoria;

  if (prevCat !== nextCat) {
    if (!prevCat || !nextCat) return false;
    if (prevCat.id !== nextCat.id) return false;
    if (prevCat.name !== nextCat.name) return false;
    if (prevCat.color !== nextCat.color) return false;
  }

  return true;
}

export const extractGastoKey = (item: Expense): string => item.id;
