import { Pressable, Text } from 'react-native';

import { formatMoney } from '@/shared/lib/money';
import { rowMinHeight, typography } from '@/shared/theme/tipografia';
import type { Expense } from '@/types/expense';

export function FilaGasto({
  expense,
  index,
  categoryName,
  onLongPress,
}: {
  expense: Expense;
  index: number;
  categoryName: string;
  onLongPress: () => void;
}) {
  const isPending = expense.syncState === 'pending';
  return (
    <Pressable
      onLongPress={onLongPress}
      // ponytail: mantener presionado en vez de deslizar. Un swipe necesita
      // gesture-handler y layout propio; el long press ya lo trae Pressable y
      // los lectores de pantalla lo anuncian solo.
      accessibilityHint="Mantén presionado para eliminar"
      testID={`gasto-${index}`}
      accessible
      accessibilityLabel={[
        'Gasto',
        formatMoney(expense.amountCents, expense.currency),
        categoryName,
        isPending ? 'Pendiente de sincronizar' : '',
      ]
        .filter(Boolean)
        .join('. ')}
      style={{
        // minHeight, nunca height. Ver BUG-005.
        minHeight: rowMinHeight(),
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 4,
      }}
    >
      <Text
        style={{ ...typography.amount(), color: '#0B0F14' }}
        testID={`gasto-monto-${index}`}
      >
        {formatMoney(expense.amountCents, expense.currency)}
      </Text>
      <Text style={{ ...typography.label(), color: '#374151' }}>{categoryName}</Text>
      {isPending ? (
        // El estado no se comunica solo con color: lleva ícono y texto.
        <Text testID="badge-pending" style={{ ...typography.caption(), color: '#B45309' }}>
          ⏱ Pendiente de sincronizar
        </Text>
      ) : null}
    </Pressable>
  );
}
