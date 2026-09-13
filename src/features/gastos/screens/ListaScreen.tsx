import { Link, router } from 'expo-router';
import { useEffect, type ReactNode } from 'react';
import { Alert, FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { formatMoney } from '@/shared/lib/money';
import { controlSize, typography } from '@/shared/theme/tipografia';
import { esFailure, type Failure } from '@/shared/errors';
import { GAsyncGate } from '@/shared/ui';
import { signOut } from '@/lib/auth';
import { isRemote } from '../api';
import { useGastos } from '../hooks/useGastos';
import { FilaGasto } from '../components/FilaGasto';
import { TotalDelMes } from '../components/TotalDelMes';
import { ListaVacia } from '../components/ListaVacia';
import { EsqueletoLista } from '../components/EsqueletoLista';

export function ListaScreen() {
  const { currentMonth, resultados, gastos, categoryNames, total, eliminar } = useGastos();

  function confirmarEliminar(id: string, label: string) {
    Alert.alert('Eliminar gasto', `¿Eliminar ${label}?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => eliminar.mutate(id) },
    ]);
  }

  const contenido = (
    <ContenidoLista
      currentMonth={currentMonth}
      gastos={gastos}
      categoryNames={categoryNames}
      total={total}
      onSalir={isRemote ? signOut : undefined}
      onEliminar={confirmarEliminar}
    />
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
        <View style={{ padding: 8, backgroundColor: '#FEF3C7' }} testID="aviso-sin-conexion">
          <Text style={{ ...typography.caption(), color: '#92400E', textAlign: 'center' }}>
            Sin conexión — mostrando datos guardados
          </Text>
        </View>
        {contenidoSinRed}
      </>
    );
  }

  return (
    <SafeAreaView
      style={{ flex: 1, padding: 32, backgroundColor: '#FFFFFF' }}
      testID="error-lista"
    >
      <Text style={{ ...typography.label(), color: '#0B0F14' }}>{copiaError(failure)}</Text>
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

function ContenidoLista({
  currentMonth,
  gastos,
  categoryNames,
  total,
  onSalir,
  onEliminar,
}: {
  currentMonth: string;
  gastos: ReturnType<typeof useGastos>['gastos'];
  categoryNames: Map<string, string>;
  total: number;
  onSalir?: (() => void) | undefined;
  onEliminar: (id: string, label: string) => void;
}) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} testID="screen-lista">
      <TotalDelMes currentMonth={currentMonth} totalCents={total} onSalir={onSalir} />

      <FlatList
        data={gastos}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <FilaGasto
            expense={item}
            index={index}
            categoryName={categoryNames.get(item.categoryId) ?? item.categoryId}
            onLongPress={() =>
              onEliminar(item.id, formatMoney(item.amountCents, item.currency))
            }
          />
        )}
        ListEmptyComponent={<ListaVacia />}
      />

      <Link href="/add" asChild>
        <Pressable
          testID="fab-agregar"
          accessibilityRole="button"
          accessibilityLabel="Agregar gasto"
          style={{
            position: 'absolute',
            right: 20,
            bottom: 32,
            // Escalado con el ajuste de fuente: quien amplía el texto también
            // necesita un objetivo táctil mayor. Ver BUG-007.
            width: controlSize(56),
            height: controlSize(56),
            borderRadius: controlSize(56) / 2,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#2563EB',
          }}
        >
          <Text style={{ color: '#fff', fontSize: 28, lineHeight: 32 }}>+</Text>
        </Pressable>
      </Link>
    </SafeAreaView>
  );
}
