import { Link, router } from 'expo-router';
import { useEffect, type ReactNode } from 'react';
import { Alert, Pressable, SectionList, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { formatMonthKey } from '@/shared/lib/date';
import { formatMoney } from '@/shared/lib/money';
import { colores } from '@/shared/theme/colores';
import { controlSize } from '@/shared/theme/tipografia';
import { esFailure, type Failure } from '@/shared/errors';
import { GAsyncGate, GTexto } from '@/shared/ui';
import { signOut } from '@/features/auth';
import { isRemote } from '@/shared/lib/environment';
import { useGastos } from '../hooks/useGastos';
import { FilaGasto } from '../components/FilaGasto';
import { TotalDelMes } from '../components/TotalDelMes';
import { ListaVacia } from '../components/ListaVacia';
import { EsqueletoLista } from '../components/EsqueletoLista';

export function ListaScreen() {
  const { currentMonth, resultados, gastos, secciones, categorias, total, eliminar } =
    useGastos();

  function confirmarEliminar(id: string, label: string) {
    Alert.alert('Eliminar gasto', `¿Eliminar ${label}?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => eliminar.mutate(id) },
    ]);
  }

  const contenido = (
    <ContenidoLista
      currentMonth={currentMonth}
      conteo={gastos.length}
      secciones={secciones}
      categorias={categorias}
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
          <GTexto variante="caption" color="#92400E" style={{ textAlign: 'center' }}>
            Sin conexión — mostrando datos guardados
          </GTexto>
        </View>
        {contenidoSinRed}
      </>
    );
  }

  return (
    <SafeAreaView
      style={{ flex: 1, padding: 32, backgroundColor: colores.fondo }}
      testID="error-lista"
    >
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

function ContenidoLista({
  currentMonth,
  conteo,
  secciones,
  categorias,
  total,
  onSalir,
  onEliminar,
}: {
  currentMonth: string;
  conteo: number;
  secciones: ReturnType<typeof useGastos>['secciones'];
  categorias: ReturnType<typeof useGastos>['categorias'];
  total: number;
  onSalir?: (() => void) | undefined;
  onEliminar: (id: string, label: string) => void;
}) {
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colores.fondo }}
      testID="screen-lista"
    >
      <SectionList
        sections={secciones}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <TotalDelMes
            currentMonth={currentMonth}
            totalCents={total}
            conteo={conteo}
            onSalir={onSalir}
          />
        }
        ListEmptyComponent={<ListaVacia mes={formatMonthKey(currentMonth)} />}
        contentContainerStyle={{ paddingBottom: 120 }}
        renderSectionHeader={({ section }) => (
          <GTexto
            variante="eyebrow"
            color={colores.textoSecundario}
            style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10 }}
          >
            {section.mes === currentMonth
              ? section.titulo
              : `${section.titulo} · ${formatMoney(section.subtotal)}`}
          </GTexto>
        )}
        renderItem={({ item, index, section }) => (
          // El recuadro de la tarjeta se arma por fila: SectionList no envuelve
          // sus secciones, así que los bordes y el radio viven en los extremos.
          <View
            style={{
              marginHorizontal: 16,
              backgroundColor: colores.superficie,
              borderColor: colores.borde,
              borderLeftWidth: 1,
              borderRightWidth: 1,
              borderTopWidth: 1,
              borderBottomWidth: index === section.data.length - 1 ? 1 : 0,
              borderTopLeftRadius: index === 0 ? 24 : 0,
              borderTopRightRadius: index === 0 ? 24 : 0,
              borderBottomLeftRadius: index === section.data.length - 1 ? 24 : 0,
              borderBottomRightRadius: index === section.data.length - 1 ? 24 : 0,
              overflow: 'hidden',
            }}
          >
            <FilaGasto
              expense={item}
              index={section.offset + index}
              categoria={categorias.get(item.categoryId)}
              onLongPress={() =>
                onEliminar(item.id, formatMoney(item.amountCents, item.currency))
              }
            />
          </View>
        )}
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
            width: controlSize(64),
            height: controlSize(64),
            borderRadius: controlSize(64) / 2,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colores.acento,
            // El resplandor del diseño. shadowOffset se omite: su valor por
            // defecto ya es {0,0}, que es justo el halo centrado que se busca.
            shadowColor: colores.acento,
            shadowOpacity: 0.4,
            shadowRadius: 20,
            elevation: 8,
          }}
        >
          <Text style={{ color: colores.sobreAcento, fontSize: 28, lineHeight: 32 }}>+</Text>
        </Pressable>
      </Link>
    </SafeAreaView>
  );
}
