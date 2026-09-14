import { Pressable, View } from 'react-native';

import { formatDayShort } from '@/shared/lib/date';
import { formatMoney } from '@/shared/lib/money';
import { colores } from '@/shared/theme/colores';
import { rowMinHeight, scaledSize } from '@/shared/theme/tipografia';
import { GTexto } from '@/shared/ui';
import type { Category, Expense } from '@/types/expense';

export function FilaGasto({
  expense,
  index,
  categoria,
  onLongPress,
}: {
  expense: Expense;
  index: number;
  /** Ausente sin red: la fila cae al identificador crudo. */
  categoria: Category | undefined;
  onLongPress: () => void;
}) {
  const isPending = expense.syncState === 'pending';
  const nombre = categoria?.name ?? expense.categoryId;
  const color = categoria?.color ?? colores.acento;
  const fecha = formatDayShort(expense.occurredAt);

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
        nombre,
        fecha,
        isPending ? 'Pendiente de sincronizar' : '',
      ]
        .filter(Boolean)
        .join('. ')}
      style={{
        // minHeight, nunca height. Ver BUG-005.
        minHeight: rowMinHeight(),
        flexDirection: 'row',
        // flexWrap: al ampliar la fuente el monto baja a su propio renglón en
        // vez de empujar la categoría fuera de la fila.
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 14,
        paddingHorizontal: 18,
        paddingVertical: 14,
        backgroundColor: colores.superficie,
      }}
    >
      <View
        accessible={false}
        style={{
          width: scaledSize(42, 1.5),
          height: scaledSize(42, 1.5),
          borderRadius: 14,
          alignItems: 'center',
          justifyContent: 'center',
          // Tinte de la categoría al 10%: el color ya vive en el modelo, así
          // que la fila no necesita un catálogo de iconos aparte.
          backgroundColor: `${color}1A`,
        }}
      >
        <View
          style={{
            width: scaledSize(14, 1.5),
            height: scaledSize(14, 1.5),
            borderRadius: 999,
            backgroundColor: color,
          }}
        />
      </View>

      <View style={{ flexGrow: 1, flexShrink: 1, flexBasis: 150, gap: 2 }}>
        <GTexto variante="body" style={{ fontWeight: '500' }}>
          {nombre}
        </GTexto>
        <GTexto variante="caption" color={colores.textoSecundario}>
          {expense.note ? `${fecha} · ${expense.note}` : fecha}
        </GTexto>
        {isPending ? (
          // El estado no se comunica solo con color: lleva ícono y texto.
          <GTexto variante="caption" color="#B45309" testID="badge-pending">
            ⏱ Pendiente de sincronizar
          </GTexto>
        ) : null}
      </View>

      <GTexto variante="amount" testID={`gasto-monto-${index}`} style={{ marginLeft: 'auto' }}>
        {formatMoney(expense.amountCents, expense.currency)}
      </GTexto>
    </Pressable>
  );
}
