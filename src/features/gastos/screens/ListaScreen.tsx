import { Link, router } from 'expo-router';
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  type ComponentType,
  type ReactNode,
} from 'react';
import {
  Alert,
  SectionList,
  StyleSheet,
  Text,
  View,
  type SectionListProps,
  type SectionListRenderItemInfo,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  FadeInRight,
  FadeInUp,
  useAnimatedScrollHandler,
  useSharedValue,
} from 'react-native-reanimated';

import { formatMonthKey } from '@/shared/lib/date';
import { formatMoney } from '@/shared/lib/money';
import { colores } from '@/shared/theme/colores';
import { controlSize, scaledSize } from '@/shared/theme/tipografia';
import { esFailure, type Failure } from '@/shared/errors';
import { GAsyncGate, GTexto, GAnimatedPressable } from '@/shared/ui';
import { signOut } from '@/features/auth';
import { ResumenDePresupuestos, type Presupuesto } from '@/features/presupuestos';
import { TarjetasDeSaldo, type SaldoDeCuenta } from '@/features/cuentas';
import { isRemote } from '@/shared/lib/environment';
import type { Category, Expense } from '@/types/expense';
import { useGastos } from '../hooks/useGastos';
import { FilaGasto } from '../components/FilaGasto';
import { TotalDelMes } from '../components/TotalDelMes';
import { HeaderColapsable } from '../components/HeaderColapsable';
import { ListaVacia } from '../components/ListaVacia';
import { EsqueletoLista } from '../components/EsqueletoLista';
import type { SeccionDeMes } from '../secciones';

const AnimatedSectionList = Animated.createAnimatedComponent(
  SectionList,
) as unknown as ComponentType<
  SectionListProps<Expense, SeccionDeMes> & {
    onScroll?: ReturnType<typeof useAnimatedScrollHandler> | undefined;
    scrollEventThrottle?: number | undefined;
  }
>;

/**
 * KeyExtractor estático declarado fuera del renderizado para preservar identidad referencial constante.
 */
export const extractGastoKey = (item: Expense): string => item.id;

export function ListaScreen() {
  const {
    currentMonth,
    resultados,
    gastos,
    secciones,
    categorias,
    total,
    ingresosDelMes,
    presupuestos,
    saldos,
    eliminar,
  } = useGastos();

  const confirmarEliminar = useCallback(
    (id: string, label: string) => {
      Alert.alert('Eliminar gasto', `¿Eliminar ${label}?`, [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => eliminar.mutate(id) },
      ]);
    },
    [eliminar]
  );

  const contenido = useMemo(
    () => (
      <ContenidoLista
        currentMonth={currentMonth}
        conteo={gastos.length}
        ingresosCents={ingresosDelMes}
        presupuestos={presupuestos}
        saldos={saldos}
        secciones={secciones}
        categorias={categorias}
        total={total}
        onSalir={isRemote ? signOut : undefined}
        onEliminar={confirmarEliminar}
      />
    ),
    [
      currentMonth,
      gastos.length,
      ingresosDelMes,
      presupuestos,
      saldos,
      secciones,
      categorias,
      total,
      confirmarEliminar,
    ]
  );

  return (
    <GAsyncGate
      resultados={resultados}
      cargando={<EsqueletoLista />}
      error={(e) => (
        <PantallaDeFallo
          failure={esFailure(e) ? e : { tipo: 'Desconocido' }}
          contenidoSinRed={contenido}
        />
      )}
    >
      {contenido}
    </GAsyncGate>
  );
}

/**
 * Los tres casos que GAsyncGate no distingue por sí solo: sesión expirada
 * redirige a login, sin red muestra la misma lista con una franja de aviso
 * (necesita el contenido ya construido, no solo el Failure), y el resto es un
 * error real.
 */
function PantallaDeFallo({
  failure,
  contenidoSinRed,
}: {
  failure: Failure;
  contenidoSinRed: ReactNode;
}) {
  useEffect(() => {
    // AuthGate en _layout.tsx cubre la ausencia de sesión al abrir la app;
    // esto cubre que expire mientras la lista ya está en pantalla.
    if (failure.tipo === 'SesionExpirada') router.replace('/login');
  }, [failure.tipo]);

  useEffect(() => {
    // detalleTecnico nunca se renderiza, pero tampoco se pierde en silencio.
    if ('detalleTecnico' in failure && failure.detalleTecnico) {
      console.error(`[${failure.tipo}]`, failure.detalleTecnico);
    }
  }, [failure]);

  if (failure.tipo === 'SesionExpirada') return <EsqueletoLista />;
  if (failure.tipo === 'SinRed') {
    return (
      <>
        <View style={styles.avisoSinConexion} testID="aviso-sin-conexion">
          <GTexto variante="caption" color="#92400E" style={styles.avisoTexto}>
            Sin conexión — mostrando datos guardados
          </GTexto>
        </View>
        {contenidoSinRed}
      </>
    );
  }

  return (
    <SafeAreaView style={styles.errorContainer} testID="error-lista">
      <GTexto variante="titulo">{copiaError(failure)}</GTexto>
    </SafeAreaView>
  );
}

/** Failure → copy visible. La UI nunca ve el mensaje crudo del backend. */
function copiaError(failure: Failure): string {
  switch (failure.tipo) {
    case 'ServidorNoDisponible':
      return 'Hay un problema con el servidor';
    case 'DatosInvalidos':
      return 'Los datos recibidos no son válidos';
    default:
      return 'No se pudieron cargar los gastos';
  }
}

interface FilaGastoItemProps {
  readonly item: Expense;
  readonly absoluteIndex: number;
  readonly isFirst: boolean;
  readonly isLast: boolean;
  readonly categoria: Category | undefined;
  readonly onEliminar: (id: string, label: string) => void;
}

/**
 * Item individual memoizado:
 * Aísla las animaciones Reanimated y los callbacks de eliminación por fila,
 * permitiendo que las demás filas permanezcan intactas a 60 FPS durante scrolls y mutaciones.
 */
export const FilaGastoItem = memo(
  function FilaGastoItem({
    item,
    absoluteIndex,
    isFirst,
    isLast,
    categoria,
    onEliminar,
  }: FilaGastoItemProps) {
    const montoFormateado = useMemo(
      () => formatMoney(item.amountCents, item.currency),
      [item.amountCents, item.currency]
    );

    const handleEliminar = useCallback(() => {
      onEliminar(item.id, montoFormateado);
    }, [item.id, montoFormateado, onEliminar]);

    const enteringAnim = useMemo(
      () => FadeInRight.delay(Math.min(absoluteIndex * 25, 250)).springify(),
      [absoluteIndex]
    );

    const cardStyle = useMemo(
      () => [
        styles.cardBase,
        isFirst && styles.cardFirst,
        isLast && styles.cardLast,
        !isLast && styles.cardNotLast,
      ],
      [isFirst, isLast]
    );

    return (
      <Animated.View entering={enteringAnim} style={cardStyle}>
        <FilaGasto
          expense={item}
          index={absoluteIndex}
          categoria={categoria}
          onLongPress={handleEliminar}
          onSwipeEliminar={handleEliminar}
        />
      </Animated.View>
    );
  },
  (prev, next) => {
    return (
      prev.item.id === next.item.id &&
      prev.item.amountCents === next.item.amountCents &&
      prev.item.currency === next.item.currency &&
      prev.item.categoryId === next.item.categoryId &&
      prev.item.occurredAt === next.item.occurredAt &&
      prev.item.syncState === next.item.syncState &&
      prev.item.note === next.item.note &&
      prev.item.deletedAt === next.item.deletedAt &&
      prev.absoluteIndex === next.absoluteIndex &&
      prev.isFirst === next.isFirst &&
      prev.isLast === next.isLast &&
      prev.categoria?.id === next.categoria?.id &&
      prev.categoria?.name === next.categoria?.name &&
      prev.categoria?.color === next.categoria?.color &&
      prev.onEliminar === next.onEliminar
    );
  }
);

interface ContenidoListaProps {
  readonly currentMonth: string;
  readonly conteo: number;
  readonly ingresosCents: number;
  readonly presupuestos: readonly Presupuesto[];
  readonly saldos: readonly SaldoDeCuenta[];
  readonly secciones: ReturnType<typeof useGastos>['secciones'];
  readonly categorias: ReturnType<typeof useGastos>['categorias'];
  readonly total: number;
  readonly onSalir?: (() => void) | undefined;
  readonly onEliminar: (id: string, label: string) => void;
}

export const ContenidoLista = memo(function ContenidoLista({
  currentMonth,
  conteo,
  ingresosCents,
  presupuestos,
  saldos,
  secciones,
  categorias,
  total,
  onSalir,
  onEliminar,
}: ContenidoListaProps) {
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const gastosDelMes = useMemo(
    () => secciones.find((s) => s.mes === currentMonth)?.data ?? [],
    [secciones, currentMonth]
  );

  const listHeaderComponent = useMemo(
    () => (
      <>
        <TotalDelMes
          currentMonth={currentMonth}
          totalCents={total}
          ingresosCents={ingresosCents}
          conteo={conteo}
          onSalir={onSalir}
        />
        <TarjetasDeSaldo saldos={saldos} />
        <ResumenDePresupuestos
          presupuestos={presupuestos}
          gastosDelMes={gastosDelMes}
          mes={currentMonth}
          categorias={categorias}
        />
      </>
    ),
    [
      currentMonth,
      total,
      ingresosCents,
      conteo,
      onSalir,
      saldos,
      presupuestos,
      gastosDelMes,
      categorias,
    ]
  );

  const listEmptyComponent = useMemo(
    () => <ListaVacia mes={formatMonthKey(currentMonth)} />,
    [currentMonth]
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: SeccionDeMes }) => (
      <GTexto
        variante="eyebrow"
        color={colores.textoSecundario}
        style={styles.sectionHeader}
      >
        {section.mes === currentMonth
          ? section.titulo
          : `${section.titulo} · ${formatMoney(section.subtotal)}`}
      </GTexto>
    ),
    [currentMonth]
  );

  const renderItem = useCallback(
    ({
      item,
      index,
      section,
    }: SectionListRenderItemInfo<Expense, SeccionDeMes>) => {
      const isFirst = index === 0;
      const isLast = index === section.data.length - 1;
      const absoluteIndex = section.offset + index;
      const categoria = categorias.get(item.categoryId);

      return (
        <FilaGastoItem
          item={item}
          absoluteIndex={absoluteIndex}
          isFirst={isFirst}
          isLast={isLast}
          categoria={categoria}
          onEliminar={onEliminar}
        />
      );
    },
    [categorias, onEliminar]
  );

  return (
    <SafeAreaView style={styles.safeArea} testID="screen-lista">
      <HeaderColapsable
        scrollY={scrollY}
        currentMonth={currentMonth}
        totalCents={total}
        ingresosCents={ingresosCents}
        onSalir={onSalir}
      />
      <AnimatedSectionList
        sections={secciones}
        keyExtractor={extractGastoKey}
        onScroll={onScroll}
        scrollEventThrottle={16}
        ListHeaderComponent={listHeaderComponent}
        ListEmptyComponent={listEmptyComponent}
        contentContainerStyle={styles.contentContainer}
        renderSectionHeader={renderSectionHeader}
        renderItem={renderItem}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={7}
        removeClippedSubviews={true}
        updateCellsBatchingPeriod={50}
      />

      <Animated.View
        entering={FadeInUp.duration(400).springify()}
        style={styles.fabContainer}
      >
        <Link href="/add" asChild>
          <GAnimatedPressable
            testID="fab-agregar"
            accessibilityRole="button"
            accessibilityLabel="Agregar gasto"
            scaleTarget={0.91}
            style={styles.fabButton}
          >
            <Text allowFontScaling={false} style={styles.fabIcon}>
              +
            </Text>
          </GAnimatedPressable>
        </Link>
      </Animated.View>
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colores.fondo,
  },
  contentContainer: {
    paddingBottom: 120,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  cardBase: {
    marginHorizontal: 16,
    backgroundColor: colores.superficie,
    borderColor: colores.borde,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderTopWidth: 1,
    overflow: 'hidden',
  },
  cardFirst: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  cardLast: {
    borderBottomWidth: 1,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  cardNotLast: {
    borderBottomWidth: 0,
  },
  fabContainer: {
    position: 'absolute',
    right: 20,
    bottom: 32,
  },
  fabButton: {
    width: controlSize(64),
    height: controlSize(64),
    borderRadius: controlSize(64) / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colores.acento,
    shadowColor: colores.acento,
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 8,
  },
  fabIcon: {
    color: colores.sobreAcento,
    fontSize: scaledSize(28, 1.5),
    lineHeight: scaledSize(32, 1.5),
    fontWeight: '400',
  },
  avisoSinConexion: {
    padding: 8,
    backgroundColor: '#FEF3C7',
  },
  avisoTexto: {
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    padding: 32,
    backgroundColor: colores.fondo,
  },
});

