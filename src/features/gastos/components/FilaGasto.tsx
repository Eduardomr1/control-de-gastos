import { Pressable, View } from 'react-native';

import { formatDayShort } from '@/shared/lib/date';
import { formatMoney } from '@/shared/lib/money';
import { colores } from '@/shared/theme/colores';
import { apilaPorEscala, rowMinHeight, scaledSize } from '@/shared/theme/tipografia';
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
  const apilado = apilaPorEscala();

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
        // Con la fuente muy ampliada la fila se vuelve columna: en horizontal
        // el monto le roba a la categoría el ancho que necesita y la palabra
        // termina partida a la mitad. Ver BUG-017.
        flexDirection: apilado ? 'column' : 'row',
        flexWrap: 'wrap',
        alignItems: apilado ? 'flex-start' : 'center',
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

      <View
        style={{
          flexGrow: 1,
          flexShrink: 1,
          // Apilado toma el ancho completo; en fila cede lo que necesita el monto.
          flexBasis: apilado ? 'auto' : 150,
          alignSelf: apilado ? 'stretch' : undefined,
          gap: 2,
        }}
      >
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

      <GTexto
        variante="amount"
        testID={`gasto-monto-${index}`}
        style={apilado ? undefined : { marginLeft: 'auto' }}
      >
        {formatMoney(expense.amountCents, expense.currency)}
      </GTexto>
    </Pressable>
  );
}
