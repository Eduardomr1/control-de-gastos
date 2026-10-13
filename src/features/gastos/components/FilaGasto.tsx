import { memo, useCallback, useMemo, useRef } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';
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

/**
 * Función comparadora exhaustiva para React.memo:
 * Evita re-renders fantasma cuando otras transacciones en la lista cambian o se eliminan,
 * evaluando inmutabilidad profunda de propiedades clave de Expense y Category.
 */
export function areFilaGastoPropsEqual(
  prevProps: FilaGastoProps,
  nextProps: FilaGastoProps
): boolean {
  if (prevProps.index !== nextProps.index) return false;
  if (prevProps.onLongPress !== nextProps.onLongPress) return false;
  if (prevProps.onSwipeEliminar !== nextProps.onSwipeEliminar) return false;

  const prevExp = prevProps.expense;
  const nextExp = nextProps.expense;
  if (
    prevExp.id !== nextExp.id ||
    prevExp.amountCents !== nextExp.amountCents ||
    prevExp.currency !== nextExp.currency ||
    prevExp.categoryId !== nextExp.categoryId ||
    prevExp.occurredAt !== nextExp.occurredAt ||
    prevExp.syncState !== nextExp.syncState ||
    prevExp.note !== nextExp.note ||
    prevExp.deletedAt !== nextExp.deletedAt
  ) {
    return false;
  }

  const prevCat = prevProps.categoria;
  const nextCat = nextProps.categoria;
  if (prevCat !== nextCat) {
    if (!prevCat || !nextCat) return false;
    if (
      prevCat.id !== nextCat.id ||
      prevCat.name !== nextCat.name ||
      prevCat.color !== nextCat.color
    ) {
      return false;
    }
  }

  return true;
}

export const FilaGasto = memo(function FilaGasto({
  expense,
  index,
  categoria,
  onLongPress,
  onSwipeEliminar,
}: FilaGastoProps) {
  const isPending = expense.syncState === 'pending';
  const nombre = categoria?.name ?? expense.categoryId;
  const color = categoria?.color ?? colores.acento;
  const apilado = apilaPorEscala();

  const fecha = useMemo(() => formatDayShort(expense.occurredAt), [expense.occurredAt]);
  const inicial = useMemo(() => (nombre.trim()[0] ?? 'G').toUpperCase(), [nombre]);
  const montoTexto = useMemo(
    () => formatMoney(expense.amountCents, expense.currency),
    [expense.amountCents, expense.currency]
  );
  const a11y = useMemo(
    () => generarA11yAccionSwipe(nombre, montoTexto),
    [nombre, montoTexto]
  );
  const a11yLabel = useMemo(
    () =>
      [
        'Gasto',
        montoTexto,
        nombre,
        fecha,
        isPending ? 'Pendiente de sincronizar' : '',
      ]
        .filter(Boolean)
        .join('. '),
    [montoTexto, nombre, fecha, isPending]
  );

  const translateX = useSharedValue(0);

  // Mantenemos referencia mutable al handler de swipe para no recrear
  // la instancia de PanResponder en cada renderizado (evita GC pauses y frame drops)
  const onSwipeEliminarRef = useRef(onSwipeEliminar);
  onSwipeEliminarRef.current = onSwipeEliminar;

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
          translateX.value = withSpring(0, { damping: 18, stiffness: 240 });
          if (decision.accionEjecutada === 'eliminar') {
            onSwipeEliminarRef.current?.();
          }
        },
        onPanResponderTerminate: () => {
          translateX.value = withSpring(0, { damping: 18, stiffness: 240 });
        },
      }),
    [translateX]
  );

  const handlePressEliminar = useCallback(() => {
    translateX.value = withSpring(0, { damping: 18, stiffness: 240 });
    onSwipeEliminarRef.current?.();
  }, [translateX]);

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

  const iconBadgeStyle = useMemo(
    () => [
      styles.categoriaBadge,
      {
        backgroundColor: `${color}18`,
        borderColor: `${color}30`,
      },
    ],
    [color]
  );

  const detalleContainerStyle = useMemo(
    () => [
      styles.detalleContainer,
      apilado ? styles.detalleContainerApilado : styles.detalleContainerHorizontal,
    ],
    [apilado]
  );

  const rowPressableStyle = useMemo(
    () => [
      styles.rowPressable,
      { minHeight: rowMinHeight() },
      apilado ? styles.rowPressableApilado : styles.rowPressableHorizontal,
    ],
    [apilado]
  );

  const montoStyle = useMemo(
    () => [styles.montoGasto, apilado ? undefined : styles.montoGastoMargin],
    [apilado]
  );

  return (
    <View style={styles.container}>
      {/* Fondo de acción rápida (Eliminar) que se revela al hacer swipe hacia la izquierda */}
      <Animated.View
        accessible={false}
        style={[styles.actionBackground, actionAnimatedStyle]}
      >
        <GAnimatedPressable
          testID={`btn-eliminar-swipe-${index}`}
          accessibilityRole="button"
          accessibilityLabel={a11y.label}
          scaleTarget={0.92}
          onPress={handlePressEliminar}
          style={styles.actionPressable}
        >
          <Animated.View
            style={[styles.actionIconContainer, iconAnimatedStyle]}
          >
            <GTexto
              variante="label"
              color="#FFFFFF"
              style={styles.actionText}
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
          accessibilityLabel={a11yLabel}
          scaleTarget={0.98}
          style={rowPressableStyle}
        >
          {/* Contenedor de Categoría con Tinte y Letra Inicial */}
          <View
            accessible={false}
            style={iconBadgeStyle}
          >
            <GTexto
              variante="label"
              color={color}
              style={styles.categoriaBadgeText}
            >
              {inicial}
            </GTexto>
          </View>

          {/* Detalle del Gasto: Categoría, Nota y Fecha */}
          <View style={detalleContainerStyle}>
            <GTexto variante="body" style={styles.nombreGasto}>
              {nombre}
            </GTexto>
            <GTexto variante="caption" color={colores.textoSecundario}>
              {expense.note ? `${fecha} · ${expense.note}` : fecha}
            </GTexto>
            {isPending ? (
              <View style={styles.pendingBadge}>
                <GTexto
                  variante="caption"
                  color="#B45309"
                  testID="badge-pending"
                  style={styles.pendingText}
                >
                  ⏱ Pendiente de sincronizar
                </GTexto>
              </View>
            ) : null}
          </View>

          {/* Monto del Gasto */}
          <GTexto
            variante="amount"
            testID={`gasto-monto-${index}`}
            style={montoStyle}
          >
            {`- ${montoTexto}`}
          </GTexto>
        </GAnimatedPressable>
      </Animated.View>
    </View>
  );
}, areFilaGastoPropsEqual);

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
  },
  actionBackground: {
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
  actionPressable: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  actionIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontWeight: '800',
    fontSize: scaledSize(14, 1.4),
    letterSpacing: 0.3,
  },
  rowPressable: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: colores.superficie,
    gap: 14,
  },
  rowPressableHorizontal: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  rowPressableApilado: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
  },
  categoriaBadge: {
    width: scaledSize(44, 1.5),
    height: scaledSize(44, 1.5),
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  categoriaBadgeText: {
    fontWeight: '800',
    fontSize: scaledSize(15, 1.5),
  },
  detalleContainer: {
    flexGrow: 1,
    flexShrink: 1,
    gap: 2,
  },
  detalleContainerHorizontal: {
    flexBasis: 150,
  },
  detalleContainerApilado: {
    flexBasis: 'auto',
    alignSelf: 'stretch',
  },
  nombreGasto: {
    fontWeight: '600',
    color: colores.texto,
  },
  pendingBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FEF3C7',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 2,
  },
  pendingText: {
    fontWeight: '600',
  },
  montoGasto: {
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  montoGastoMargin: {
    marginLeft: 'auto',
  },
});
