import { useState, useEffect } from 'react';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated';

import { formatMoney, sumCents } from '@/shared/lib/money';
import { colores } from '@/shared/theme/colores';
import { scaledSize } from '@/shared/theme/tipografia';
import { GAnimatedPressable, GTexto } from '@/shared/ui';

import type { TajadaDeCategoria } from '../agregados';
import { sectores } from '../donut';

const RADIO = 90;
const GROSOR = 34;

/**
 * Anillo de gasto por categoría con micro-animaciones en el hilo de UI nativo,
 * rotación suave al cambiar de mes y selección táctil interactiva por tajada.
 */
export function AnilloDeCategorias({ tajadas }: { tajadas: readonly TajadaDeCategoria[] }) {
  const [seleccionada, setSeleccionada] = useState<string | null>(null);

  // Escala y rotación del anillo animadas con resorte al cambiar datos
  const escala = useSharedValue(0.92);
  const rotacion = useSharedValue(-12);

  useEffect(() => {
    escala.value = withSpring(1, { damping: 14, stiffness: 220 });
    rotacion.value = withSpring(0, { damping: 14, stiffness: 220 });
    setSeleccionada(null);
  }, [tajadas, escala, rotacion]);

  const animatedRingStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: escala.value },
      { rotate: `${rotacion.value}deg` },
    ],
  }));

  const total = sumCents(tajadas.map((t) => t.totalCents));
  const arcos = sectores(
    tajadas.map((t) => ({ key: t.categoryId, valor: t.totalCents, color: t.color })),
    RADIO,
    GROSOR,
  );

  if (arcos.length === 0) {
    return (
      <GTexto variante="body" color={colores.textoSecundario} testID="reporte-sin-datos">
        Sin gastos en este mes.
      </GTexto>
    );
  }

  const tajadaActiva = seleccionada
    ? tajadas.find((t) => t.categoryId === seleccionada)
    : null;

  return (
    <View style={{ gap: 20 }} testID="anillo-categorias">
      <View style={{ alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View style={[animatedRingStyle, { width: RADIO * 2, height: RADIO * 2 }]}>
          <Svg
            width={RADIO * 2}
            height={RADIO * 2}
            viewBox={`0 0 ${RADIO * 2} ${RADIO * 2}`}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            {arcos.map((sector) => {
              const esActiva = seleccionada === null || seleccionada === sector.key;
              return (
                <Path
                  key={sector.key}
                  d={sector.d}
                  fill={sector.color}
                  opacity={esActiva ? 1 : 0.35}
                />
              );
            })}
          </Svg>
        </Animated.View>

        {/* Encima del agujero. `position: absolute` y no un <Text> de SVG */}
        <Animated.View
          entering={FadeIn.duration(300)}
          style={{ position: 'absolute', alignItems: 'center', paddingHorizontal: 16 }}
        >
          <GTexto
            variante="caption"
            color={tajadaActiva ? tajadaActiva.color : colores.textoSecundario}
            style={{ fontWeight: tajadaActiva ? '700' : '500' }}
            numberOfLines={1}
          >
            {tajadaActiva ? tajadaActiva.nombre : 'Total'}
          </GTexto>
          <GTexto
            color={colores.texto}
            style={{ fontSize: scaledSize(18, 1.3), fontWeight: '700' }}
            testID="total-reporte"
          >
            {formatMoney(tajadaActiva ? tajadaActiva.totalCents : total)}
          </GTexto>
          {tajadaActiva ? (
            <GTexto variante="caption" color={colores.textoSecundario}>
              {`${tajadaActiva.porcentaje}% del mes`}
            </GTexto>
          ) : null}
        </Animated.View>
      </View>

      <View style={{ gap: 6 }}>
        {tajadas.map((tajada, index) => {
          const esActiva = seleccionada === tajada.categoryId;
          const hayFiltro = seleccionada !== null;

          return (
            <Animated.View
              key={tajada.categoryId}
              entering={FadeInDown.delay(index * 35).duration(280)}
            >
              <GAnimatedPressable
                testID={`leyenda-${tajada.categoryId}`}
                accessibilityRole="button"
                accessibilityLabel={`${tajada.nombre}: ${formatMoney(tajada.totalCents)}, ${tajada.porcentaje} por ciento`}
                onPress={() => {
                  setSeleccionada((prev) => (prev === tajada.categoryId ? null : tajada.categoryId));
                }}
                scaleTarget={0.97}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  borderRadius: 12,
                  backgroundColor: esActiva ? colores.superficie : 'transparent',
                  borderWidth: 1,
                  borderColor: esActiva ? colores.acento : 'transparent',
                  opacity: hayFiltro && !esActiva ? 0.55 : 1,
                }}
              >
                <View
                  style={{
                    width: scaledSize(12, 1.5),
                    minHeight: scaledSize(12, 1.5),
                    borderRadius: 999,
                    backgroundColor: tajada.color,
                  }}
                />
                <GTexto
                  variante="caption"
                  style={{ flex: 1, fontWeight: esActiva ? '700' : '500' }}
                >
                  {tajada.nombre}
                </GTexto>
                <GTexto variante="caption" color={colores.textoSecundario}>
                  {`${tajada.porcentaje}%`}
                </GTexto>
                <GTexto variante="label" style={{ fontWeight: '600' }}>
                  {formatMoney(tajada.totalCents)}
                </GTexto>
              </GAnimatedPressable>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}
