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

interface BarraMesItemProps {
  barra: BarraDeMes;
  maximo: number;
  index: number;
  activo: boolean;
  onSeleccionar?: ((mes: MonthKey) => void) | undefined;
}

function BarraMesItem({
  barra,
  maximo,
  index,
  activo,
  onSeleccionar,
}: BarraMesItemProps) {
  const porcentajeObjetivo = Math.min(100, Math.max(0, (barra.totalCents / maximo) * 100));
  const animProgress = useSharedValue(0);

  useEffect(() => {
    animProgress.value = 0;
    animProgress.value = withDelay(
      index * 60,
      withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) })
    );
  }, [barra.totalCents, maximo, index, animProgress]);

  const barAnimatedStyle = useAnimatedStyle(() => ({
    width: `${animProgress.value * porcentajeObjetivo}%`,
  }));

  return (
    <Animated.View entering={FadeInDown.delay(index * 40).duration(260)}>
      <GAnimatedPressable
        testID={`barra-${barra.mes}`}
        accessibilityRole={onSeleccionar ? 'radio' : 'progressbar'}
        accessibilityState={onSeleccionar ? { selected: activo } : undefined}
        accessibilityLabel={`${formatMonthKey(barra.mes)}: ${formatMoney(barra.totalCents)}`}
        onPress={onSeleccionar ? () => onSeleccionar(barra.mes) : undefined}
        scaleTarget={0.98}
        style={{
          gap: 6,
          minHeight: 44,
          justifyContent: 'center',
          paddingVertical: 8,
          paddingHorizontal: 12,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: activo ? colores.acento : 'transparent',
          backgroundColor: activo ? colores.superficie : 'transparent',
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
              style={{ fontWeight: activo ? '700' : '500' }}
            >
              {formatMonthName(barra.mes)}
            </GTexto>
            {activo ? (
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
            color={activo ? colores.texto : colores.textoSecundario}
            style={{ fontWeight: activo ? '700' : '500' }}
          >
            {formatMoney(barra.totalCents)}
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
                backgroundColor: activo ? colores.acento : colores.acentoDeshabilitado,
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
  onSeleccionar?: (mes: MonthKey) => void;
}) {
  const maximo = Math.max(...barras.map((b) => b.totalCents), 1);

  return (
    <View style={{ gap: 4 }} testID="barras-por-mes">
      {barras.map((barra, index) => {
        const activo = barra.mes === seleccionado;
        return (
          <BarraMesItem
            key={barra.mes}
            barra={barra}
            maximo={maximo}
            index={index}
            activo={activo}
            onSeleccionar={onSeleccionar}
          />
        );
      })}
    </View>
  );
}
