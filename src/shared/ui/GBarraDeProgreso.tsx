import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { colores } from '@/shared/theme/colores';
import { scaledSize } from '@/shared/theme/tipografia';

import { GTexto } from './GTexto';

export interface GBarraDeProgresoProps {
  etiqueta: string;
  /** Lo que se lee a la derecha, ej. "$410.00 de $500.00". */
  detalle: string;
  actualCents: number;
  objetivoCents: number;
  color: string;
  altura?: number | undefined;
  colorFondo?: string | undefined;
  mostrarPorcentaje?: boolean | undefined;
  testID?: string | undefined;
}

/**
 * Avance animado de una cantidad hacia una meta o límite presupuestal.
 * Utiliza interpolación fluida a 60-120 FPS vía Reanimated en el hilo de UI nativo.
 */
export function GBarraDeProgreso({
  etiqueta,
  detalle,
  actualCents,
  objetivoCents,
  color,
  altura = scaledSize(9, 1.5),
  colorFondo = colores.fondoPildora,
  mostrarPorcentaje = false,
  testID,
}: GBarraDeProgresoProps) {
  const fraccion = objetivoCents <= 0 ? 0 : actualCents / objetivoCents;
  const porcentaje = Math.min(Math.max(fraccion, 0), 1) * 100;
  const porcentajeReal = Math.round(fraccion * 100);

  const progresoAnimado = useSharedValue(0);

  useEffect(() => {
    progresoAnimado.value = withTiming(porcentaje, {
      duration: 600,
      easing: Easing.out(Easing.cubic),
    });
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
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <GTexto variante="caption" color={colores.texto} style={{ fontWeight: '600' }}>
            {etiqueta}
          </GTexto>
          {mostrarPorcentaje ? (
            <View
              style={{
                paddingHorizontal: 6,
                paddingVertical: 1,
                borderRadius: 6,
                backgroundColor: colorFondo,
              }}
            >
              <GTexto
                variante="caption"
                color={color}
                style={{ fontSize: scaledSize(10, 1.2), fontWeight: '700' }}
              >
                {`${porcentajeReal}%`}
              </GTexto>
            </View>
          ) : null}
        </View>

        <GTexto variante="caption" color={color} style={{ fontWeight: '700' }}>
          {detalle}
        </GTexto>
      </View>

      <View
        style={{
          minHeight: altura,
          borderRadius: 999,
          backgroundColor: colorFondo,
          overflow: 'hidden',
        }}
        accessibilityRole="progressbar"
        accessibilityLabel={`${etiqueta}: ${detalle}`}
        accessibilityValue={{ min: 0, max: objetivoCents, now: actualCents }}
      >
        <Animated.View
          style={[
            {
              minHeight: altura,
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
