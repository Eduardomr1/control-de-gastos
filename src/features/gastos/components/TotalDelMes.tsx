import { Pressable, Text, View } from 'react-native';

import { formatMonthKey } from '@/shared/lib/date';
import { formatMoney } from '@/shared/lib/money';
import { typography } from '@/shared/theme/tipografia';

export function TotalDelMes({
  currentMonth,
  totalCents,
  onSalir,
}: {
  currentMonth: string;
  totalCents: number;
  /** Ausente en modo local: no hay sesión de la que salir. */
  onSalir?: (() => void) | undefined;
}) {
  return (
    <View style={{ padding: 16, gap: 4 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ ...typography.caption(), color: '#6B7280' }}>
          {formatMonthKey(currentMonth)}
        </Text>
        {onSalir ? (
          <Pressable
            testID="btn-salir"
            accessibilityRole="button"
            accessibilityLabel="Cerrar sesión"
            onPress={onSalir}
            // 44pt es el minimo tactil de Apple y Material.
            style={{ minHeight: 44, minWidth: 44, justifyContent: 'center' }}
          >
            <Text style={{ ...typography.caption(), color: '#2563EB' }}>Salir</Text>
          </Pressable>
        ) : null}
      </View>
      <Text style={{ ...typography.amount(), color: '#0B0F14' }} testID="total-mes">
        {formatMoney(totalCents)}
      </Text>
    </View>
  );
}
