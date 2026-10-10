import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { formatMonthKey, formatMonthName, type MonthKey } from '@/shared/lib/date';
import { formatMoney } from '@/shared/lib/money';
import { colores } from '@/shared/theme/colores';
import { scaledSize } from '@/shared/theme/tipografia';
import { GAnimatedPressable, GTexto } from '@/shared/ui';

import type { BarraDeMes } from '../agregados';
import { calcularMetricasBarras, type MetricaBarraMes } from '../seleccion';

interface BarraMesItemProps {
  metrica: MetricaBarraMes;
  index: number;
  onSeleccionar?: ((mes: MonthKey) => void) | undefined;
}

function BarraMesItem({
  metrica,
  index,
  onSeleccionar,
}: BarraMesItemProps) {
  const animProgress = useSharedValue(0);

  useEffect(() => {
    animProgress.value = 0;
    animProgress.value = withDelay(
      index * 60,
      withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) })
    );
  }, [metrica.totalCents, metrica.porcentajeRelativo, index, animProgress]);

  const barAnimatedStyle = useAnimatedStyle(() => ({
    width: `${animProgress.value * metrica.porcentajeRelativo}%`,
  }));

  return (
    <Animated.View entering={FadeInDown.delay(index * 40).duration(260)}>
      <GAnimatedPressable
        testID={`barra-${metrica.mes}`}
        accessibilityRole={onSeleccionar ? 'radio' : 'progressbar'}
        accessibilityState={onSeleccionar ? { selected: metrica.esActivo } : undefined}
        accessibilityLabel={`${formatMonthKey(metrica.mes)}: ${formatMoney(metrica.totalCents)}`}
        onPress={onSeleccionar ? () => onSeleccionar(metrica.mes) : undefined}
        scaleTarget={0.98}
        style={{
          gap: 6,
          minHeight: 44,
          justifyContent: 'center',
          paddingVertical: 8,
          paddingHorizontal: 12,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: metrica.esActivo ? colores.acento : 'transparent',
          backgroundColor: metrica.esActivo ? colores.superficie : 'transparent',
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <GTexto
              variante="caption"
              color={colores.texto}
              style={{ fontWeight: metrica.esActivo ? '700' : '500' }}
            >
              {formatMonthName(metrica.mes)}
            </GTexto>
            {metrica.esActivo ? (
              <View
                style={{
                  paddingHorizontal: 6,
                  paddingVertical: 1,
                  borderRadius: 6,
                  backgroundColor: colores.acentoSuave,
                }}
              >
                <GTexto
                  variante="caption"
                  color={colores.acento}
                  style={{ fontSize: scaledSize(10, 1.2), fontWeight: '700' }}
                >
                  Mes activo
                </GTexto>
              </View>
            ) : null}
          </View>

          <GTexto
            variante="caption"
            color={metrica.esActivo ? colores.texto : colores.textoSecundario}
            style={{ fontWeight: metrica.esActivo ? '700' : '500' }}
          >
            {formatMoney(metrica.totalCents)}
          </GTexto>
        </View>

        <View
          style={{
            minHeight: scaledSize(10, 1.5),
            borderRadius: 999,
            backgroundColor: colores.borde,
            overflow: 'hidden',
          }}
        >
          <Animated.View
            style={[
              barAnimatedStyle,
              {
                minHeight: scaledSize(10, 1.5),
                borderRadius: 999,
                backgroundColor: metrica.esActivo ? colores.acento : colores.acentoDeshabilitado,
              },
            ]}
          />
        </View>
      </GAnimatedPressable>
    </Animated.View>
  );
}

/**
 * Comparativo mes a mes, y a la vez el selector de periodo con animaciones
 * fluidas secuenciales de crecimiento en el hilo nativo de UI.
 */
export function BarrasPorMes({
  barras,
  seleccionado,
  onSeleccionar,
}: {
  barras: readonly BarraDeMes[];
  seleccionado?: MonthKey;
  onSeleccionar?: ((mes: MonthKey) => void) | undefined;
}) {
  const metricas = calcularMetricasBarras(barras, seleccionado);

  return (
    <View style={{ gap: 4 }} testID="barras-por-mes">
      {metricas.map((metrica, index) => (
        <BarraMesItem
          key={metrica.mes}
          metrica={metrica}
          index={index}
          onSeleccionar={onSeleccionar}
        />
      ))}
    </View>
  );
}
