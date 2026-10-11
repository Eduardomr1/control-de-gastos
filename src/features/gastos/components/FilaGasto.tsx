import { useMemo } from 'react';
import { PanResponder, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { formatDayShort } from '@/shared/lib/date';
import { formatMoney } from '@/shared/lib/money';
import { colores } from '@/shared/theme/colores';
import { apilaPorEscala, rowMinHeight, scaledSize } from '@/shared/theme/tipografia';
import { GTexto, GAnimatedPressable } from '@/shared/ui';
import type { Category, Expense } from '@/types/expense';
import {
  calcularDesplazamientoSwipe,
  generarA11yAccionSwipe,
  resolverReleaseSwipe,
} from '../swipe';

export interface FilaGastoProps {
  readonly expense: Expense;
  readonly index: number;
  /** Ausente sin red: la fila cae al identificador crudo. */
  readonly categoria: Category | undefined;
  readonly onLongPress: () => void;
  readonly onSwipeEliminar?: (() => void) | undefined;
}

export function FilaGasto({
  expense,
  index,
  categoria,
  onLongPress,
  onSwipeEliminar,
}: FilaGastoProps) {
  const isPending = expense.syncState === 'pending';
  const nombre = categoria?.name ?? expense.categoryId;
  const color = categoria?.color ?? colores.acento;
  const fecha = formatDayShort(expense.occurredAt);
  const apilado = apilaPorEscala();
  const inicial = (nombre.trim()[0] ?? 'G').toUpperCase();
  const montoTexto = formatMoney(expense.amountCents, expense.currency);
  const a11y = generarA11yAccionSwipe(nombre, montoTexto);

  const translateX = useSharedValue(0);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponderCapture: (_, gestureState) => {
          // Captura exclusivamente movimientos horizontales intencionales,
          // preservando el desplazamiento vertical fluido de la lista (SectionList).
          return (
            Math.abs(gestureState.dx) > 12 &&
            Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.5
          );
        },
        onPanResponderMove: (_, gestureState) => {
          translateX.value = calcularDesplazamientoSwipe(gestureState.dx);
        },
        onPanResponderRelease: (_, gestureState) => {
          const decision = resolverReleaseSwipe(translateX.value, gestureState.vx);
          if (decision.accionEjecutada === 'eliminar') {
            translateX.value = withSpring(0, { damping: 18, stiffness: 240 });
            onSwipeEliminar?.();
          } else {
            translateX.value = withSpring(0, { damping: 18, stiffness: 240 });
          }
        },
        onPanResponderTerminate: () => {
          translateX.value = withSpring(0, { damping: 18, stiffness: 240 });
        },
      }),
    [onSwipeEliminar, translateX]
  );

  const filaAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const actionAnimatedStyle = useAnimatedStyle(() => {
    // Opacidad de fondo gradual entre 0 y -72px
    const opacity = interpolate(
      translateX.value,
      [0, -25, -72],
      [0, 0.45, 1],
      Extrapolation.CLAMP
    );
    return { opacity };
  });

  const iconAnimatedStyle = useAnimatedStyle(() => {
    // Microinteracción elástica: crece progresivamente y hace pop al superar el umbral
    const scale = interpolate(
      translateX.value,
      [0, -35, -72, -110],
      [0.8, 0.95, 1.15, 1.2],
      Extrapolation.CLAMP
    );
    return {
      transform: [{ scale }],
    };
  });

  return (
    <View style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Fondo de acción rápida (Eliminar) que se revela al hacer swipe hacia la izquierda */}
      <Animated.View
        accessible={false}
        style={[
          {
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: '#DC2626',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-end',
            paddingRight: 20,
          },
          actionAnimatedStyle,
        ]}
      >
        <GAnimatedPressable
          testID={`btn-eliminar-swipe-${index}`}
          accessibilityRole="button"
          accessibilityLabel={a11y.label}
          scaleTarget={0.92}
          onPress={() => {
            translateX.value = withSpring(0, { damping: 18, stiffness: 240 });
            onSwipeEliminar?.();
          }}
          style={{
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 12,
            paddingVertical: 8,
          }}
        >
          <Animated.View
            style={[
              {
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
              },
              iconAnimatedStyle,
            ]}
          >
            <GTexto
              variante="label"
              color="#FFFFFF"
              style={{
                fontWeight: '800',
                fontSize: scaledSize(14, 1.4),
                letterSpacing: 0.3,
              }}
            >
              ✕ Eliminar
            </GTexto>
          </Animated.View>
        </GAnimatedPressable>
      </Animated.View>

      {/* Contenido principal de la fila con animación de traslación Reanimated y PanResponder */}
      <Animated.View
        {...panResponder.panHandlers}
        style={filaAnimatedStyle}
      >
        <GAnimatedPressable
          onLongPress={onLongPress}
          accessibilityHint={a11y.hint}
          testID={`gasto-${index}`}
          accessible
          accessibilityLabel={[
            'Gasto',
            montoTexto,
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
            {`- ${montoTexto}`}
          </GTexto>
        </GAnimatedPressable>
      </Animated.View>
    </View>
  );
}
