import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { colores } from '@/shared/theme/colores';
import { scaledSize } from '@/shared/theme/tipografia';

import { GTexto } from './GTexto';

/**
 * Avance animado de una cantidad hacia una meta o límite presupuestal.
 * Utiliza interpolación fluida a 60-120 FPS vía Reanimated.
 */
export function GBarraDeProgreso({
  etiqueta,
  detalle,
  actualCents,
  objetivoCents,
  color,
  testID,
}: {
  etiqueta: string;
  /** Lo que se lee a la derecha, ej. "$410.00 de $500.00". */
  detalle: string;
  actualCents: number;
  objetivoCents: number;
  color: string;
  testID?: string;
}) {
  const fraccion = objetivoCents <= 0 ? 0 : actualCents / objetivoCents;
  const porcentaje = Math.min(Math.max(fraccion, 0), 1) * 100;

  const progresoAnimado = useSharedValue(0);

  useEffect(() => {
    progresoAnimado.value = withTiming(porcentaje, { duration: 650 });
  }, [porcentaje, progresoAnimado]);

  const estiloBarra = useAnimatedStyle(() => ({
    width: `${progresoAnimado.value}%`,
  }));

  return (
    <View style={{ gap: 6 }} {...(testID === undefined ? {} : { testID })}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <GTexto variante="caption" color={colores.texto} style={{ fontWeight: '600' }}>
          {etiqueta}
        </GTexto>
        <GTexto variante="caption" color={color} style={{ fontWeight: '700' }}>
          {detalle}
        </GTexto>
      </View>

      <View
        style={{
          minHeight: scaledSize(9, 1.5),
          borderRadius: 999,
          backgroundColor: '#F1F5F9',
          overflow: 'hidden',
        }}
        accessibilityRole="progressbar"
        accessibilityLabel={`${etiqueta}: ${detalle}`}
        accessibilityValue={{ min: 0, max: objetivoCents, now: actualCents }}
      >
        <Animated.View
          style={[
            {
              minHeight: scaledSize(9, 1.5),
              borderRadius: 999,
              backgroundColor: color,
            },
            estiloBarra,
          ]}
        />
      </View>
    </View>
  );
}
