import { Pressable, View } from 'react-native';

import { formatMonthKey } from '@/shared/lib/date';
import { formatMoney } from '@/shared/lib/money';
import { colores } from '@/shared/theme/colores';
import { GTexto } from '@/shared/ui';

export function TotalDelMes({
  currentMonth,
  totalCents,
  conteo,
  onSalir,
}: {
  currentMonth: string;
  totalCents: number;
  conteo: number;
  /** Ausente en modo local: no hay sesión de la que salir. */
  onSalir?: (() => void) | undefined;
}) {
  return (
    <View
      style={{
        paddingHorizontal: 20,
        paddingBottom: 16,
        gap: 4,
        borderBottomWidth: 1,
        borderBottomColor: colores.borde,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <GTexto variante="eyebrow" color={colores.textoSecundario}>
          {`Total de ${formatMonthKey(currentMonth)}`}
        </GTexto>
        {onSalir ? (
          <Pressable
            testID="btn-salir"
            accessibilityRole="button"
            accessibilityLabel="Cerrar sesión"
            onPress={onSalir}
            // 44pt es el minimo tactil de Apple y Material.
            style={{ minHeight: 44, minWidth: 44, justifyContent: 'center' }}
          >
            <GTexto variante="caption" color={colores.acento}>
              Salir
            </GTexto>
          </Pressable>
        ) : null}
      </View>

      {/* flexWrap: a escala de fuente grande el monto y la divisa se acomodan
          en dos renglones en vez de recortarse. */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'baseline',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <GTexto variante="total" color={colores.acento} testID="total-mes">
          {formatMoney(totalCents)}
        </GTexto>
        <GTexto variante="caption" color={colores.textoSecundario}>
          MXN
        </GTexto>
      </View>

      <GTexto variante="caption" color={colores.textoSecundario}>
        {conteo === 1 ? '1 gasto registrado' : `${conteo} gastos registrados`}
      </GTexto>
    </View>
  );
}
