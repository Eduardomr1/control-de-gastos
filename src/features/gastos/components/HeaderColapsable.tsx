import { memo } from 'react';
import { View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
} from 'react-native-reanimated';

import { formatMonthName } from '@/shared/lib/date';
import { formatMoney } from '@/shared/lib/money';
import { colores } from '@/shared/theme/colores';
import { GTexto, GAnimatedPressable } from '@/shared/ui';
import { calcularMetricasDashboard } from '../balance';

export interface HeaderColapsableProps {
  readonly scrollY: SharedValue<number>;
  readonly currentMonth: string;
  readonly totalCents: number;
  readonly ingresosCents: number;
  readonly onSalir?: (() => void) | undefined;
}

/**
 * Header compacto que emerge con física elástica e interpolación suave de scroll
 * cuando el usuario navega a través de las transacciones del mes.
 * Garantiza visibilidad permanente del balance neto y controles clave (Fintech Sticky Pattern).
 */
export const HeaderColapsable = memo(function HeaderColapsable({
  scrollY,
  currentMonth,
  totalCents,
  ingresosCents,
  onSalir,
}: HeaderColapsableProps) {
  const { balanceCents, esPositivo } = calcularMetricasDashboard(
    ingresosCents,
    totalCents
  );

  const animatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [80, 160],
      [0, 1],
      Extrapolation.CLAMP
    );
    const translateY = interpolate(
      scrollY.value,
      [80, 160],
      [-14, 0],
      Extrapolation.CLAMP
    );

    return {
      opacity,
      transform: [{ translateY }],
    };
  });

  return (
    <Animated.View
      testID="header-colapsable-dashboard"
      style={[
        {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 18,
          paddingVertical: 12,
          backgroundColor: colores.superficie,
          borderBottomWidth: 1,
          borderBottomColor: colores.borde,
          ...colores.sombraTarjeta,
        },
        animatedStyle,
      ]}
    >
      {/* Información del Mes y Balance Neto Compacto */}
      <View style={{ gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View
            style={{
              minWidth: 8,
              minHeight: 8,
              borderRadius: 4,
              backgroundColor: esPositivo ? '#10B981' : '#F43F5E',
            }}
          />
          <GTexto
            variante="eyebrow"
            color={colores.textoSecundario}
            style={{ textTransform: 'uppercase', letterSpacing: 0.6 }}
          >
            {formatMonthName(currentMonth)}
          </GTexto>
        </View>

        <GTexto
          variante="label"
          color={esPositivo ? '#10B981' : '#F43F5E'}
          testID="balance-colapsable"
          style={{ fontWeight: '800', letterSpacing: -0.3 }}
        >
          {formatMoney(balanceCents)}
        </GTexto>
      </View>

      {/* Acciones Rápidas del Header Compacto */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {onSalir ? (
          <GAnimatedPressable
            testID="btn-salir-header-colapsable"
            accessibilityRole="button"
            accessibilityLabel="Cerrar sesión"
            onPress={onSalir}
            scaleTarget={0.94}
            style={{
              minHeight: 36,
              paddingHorizontal: 12,
              borderRadius: 999,
              backgroundColor: colores.fondo,
              borderWidth: 1,
              borderColor: colores.borde,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <GTexto variante="caption" color={colores.textoSecundario} style={{ fontWeight: '600' }}>
              Salir
            </GTexto>
          </GAnimatedPressable>
        ) : null}
      </View>
    </Animated.View>
  );
});

