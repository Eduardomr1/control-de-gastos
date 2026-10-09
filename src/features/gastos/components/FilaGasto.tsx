import { View } from 'react-native';

import { formatDayShort } from '@/shared/lib/date';
import { formatMoney } from '@/shared/lib/money';
import { colores } from '@/shared/theme/colores';
import { apilaPorEscala, rowMinHeight, scaledSize } from '@/shared/theme/tipografia';
import { GTexto, GAnimatedPressable } from '@/shared/ui';
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
  const inicial = (nombre.trim()[0] ?? 'G').toUpperCase();

  return (
    <GAnimatedPressable
      onLongPress={onLongPress}
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
      scaleTarget={0.98}
      style={{
        minHeight: rowMinHeight(),
        flexDirection: apilado ? 'column' : 'row',
        flexWrap: 'wrap',
        alignItems: apilado ? 'flex-start' : 'center',
        gap: 14,
        paddingHorizontal: 18,
        paddingVertical: 14,
        backgroundColor: colores.superficie,
      }}
    >
      {/* Contenedor de Categoría con Tinte y Letra Inicial */}
      <View
        accessible={false}
        style={{
          width: scaledSize(44, 1.5),
          height: scaledSize(44, 1.5),
          borderRadius: 14,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: `${color}18`,
          borderWidth: 1,
          borderColor: `${color}30`,
        }}
      >
        <GTexto
          variante="label"
          color={color}
          style={{
            fontWeight: '800',
            fontSize: scaledSize(15, 1.5),
          }}
        >
          {inicial}
        </GTexto>
      </View>

      {/* Detalle del Gasto: Categoría, Nota y Fecha */}
      <View
        style={{
          flexGrow: 1,
          flexShrink: 1,
          flexBasis: apilado ? 'auto' : 150,
          alignSelf: apilado ? 'stretch' : undefined,
          gap: 2,
        }}
      >
        <GTexto variante="body" style={{ fontWeight: '600', color: colores.texto }}>
          {nombre}
        </GTexto>
        <GTexto variante="caption" color={colores.textoSecundario}>
          {expense.note ? `${fecha} · ${expense.note}` : fecha}
        </GTexto>
        {isPending ? (
          <View
            style={{
              alignSelf: 'flex-start',
              backgroundColor: '#FEF3C7',
              borderRadius: 6,
              paddingHorizontal: 6,
              paddingVertical: 2,
              marginTop: 2,
            }}
          >
            <GTexto variante="caption" color="#B45309" testID="badge-pending" style={{ fontWeight: '600' }}>
              ⏱ Pendiente de sincronizar
            </GTexto>
          </View>
        ) : null}
      </View>

      {/* Monto del Gasto */}
      <GTexto
        variante="amount"
        testID={`gasto-monto-${index}`}
        style={[
          { fontWeight: '700', letterSpacing: -0.3 },
          apilado ? undefined : { marginLeft: 'auto' },
        ]}
      >
        {`- ${formatMoney(expense.amountCents, expense.currency)}`}
      </GTexto>
    </GAnimatedPressable>
  );
}
