import { useMutation, useQueries, useQueryClient } from '@tanstack/react-query';
import { Link, router } from 'expo-router';
import { useEffect } from 'react';
import { Alert, FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { formatMonthKey, groupByMonth, monthKeyOf, nowLocalIso } from '@/shared/lib/date';
import { formatMoney, sumCents } from '@/shared/lib/money';
import { controlSize, rowMinHeight, typography } from '@/shared/theme/tipografia';
import { deleteExpense, fetchCategories, fetchExpenses, isRemote } from '@/lib/repository';
import { signOut } from '@/lib/auth';
import { esFailure, type Failure } from '@/shared/errors';
import type { Category, Expense } from '@/types/expense';

export default function ListScreen() {
  const currentMonth = monthKeyOf(nowLocalIso());
  const queryClient = useQueryClient();

  const removal = useMutation({
    mutationFn: deleteExpense,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['expenses'] }),
  });

  function confirmRemoval(id: string, label: string) {
    Alert.alert('Eliminar gasto', `¿Eliminar ${label}?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => removal.mutate(id) },
    ]);
  }

  // Carga Verdadera: las tres consultas se evalúan en conjunto y la pantalla
  // no renderiza contenido parcial. Ver BUG-006.
  const results = useQueries({
    queries: [
      { queryKey: ['expenses', currentMonth], queryFn: fetchExpenses },
      { queryKey: ['categories'], queryFn: fetchCategories },
    ],
  });

  const isPending = results.some((r) => r.isPending);
  const fallido = results.some((r) => r.isError);
  const errorCrudo: unknown = results.find((r) => r.isError)?.error;
  const fallo: Failure = esFailure(errorCrudo) ? errorCrudo : { tipo: 'Desconocido' };
  const detalleTecnico = 'detalleTecnico' in fallo ? fallo.detalleTecnico : undefined;

  // La sesión expiro a medio uso: redirige a login en vez de mostrar un error
  // mudo. AuthGate en _layout.tsx cubre la ausencia de sesión al abrir la app;
  // esto cubre que expire mientras la lista ya está en pantalla.
  useEffect(() => {
    if (fallido && fallo.tipo === 'SesionExpirada') router.replace('/login');
  }, [fallido, fallo.tipo]);

  // detalleTecnico nunca se renderiza, pero tampoco se pierde en silencio.
  useEffect(() => {
    if (detalleTecnico) console.error(`[${fallo.tipo}]`, detalleTecnico);
  }, [fallo.tipo, detalleTecnico]);

  if (isPending) return <ScreenSkeleton />;
  if (fallido && fallo.tipo === 'SesionExpirada') return <ScreenSkeleton />;
  // Servidor roto, datos inválidos o un fallo que no se reconoce: no hay copia
  // local que mostrar con confianza, así que es un estado de error real.
  if (fallido && fallo.tipo !== 'SinRed') return <ErrorState failure={fallo} />;

  const [expensesResult, categoriesResult] = results;
  const expenses = (expensesResult?.data ?? []) as Expense[];
  const categories = (categoriesResult?.data ?? []) as Category[];
  // La consulta de categorías ya se hacía para el gating de carga; aquí se le
  // da uso: la fila muestra el nombre legible en vez del identificador crudo.
  // Sin red, categories queda vacía y el nombre cae al id crudo (ver abajo).
  const categoryNames = new Map(categories.map((c) => [c.id, c.name]));
  const visible = expenses.filter((e) => !e.deletedAt);
  const monthExpenses = groupByMonth(visible).get(currentMonth) ?? [];
  const total = sumCents(monthExpenses.map((e) => e.amountCents));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} testID="screen-lista">
      {fallo.tipo === 'SinRed' ? (
        <View style={{ padding: 8, backgroundColor: '#FEF3C7' }} testID="aviso-sin-conexion">
          <Text style={{ ...typography.caption(), color: '#92400E', textAlign: 'center' }}>
            Sin conexión — mostrando datos guardados
          </Text>
        </View>
      ) : null}
      <View style={{ padding: 16, gap: 4 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ ...typography.caption(), color: '#6B7280' }}>
            {formatMonthKey(currentMonth)}
          </Text>
          {isRemote ? (
            <Pressable
              testID="btn-salir"
              accessibilityRole="button"
              accessibilityLabel="Cerrar sesión"
              onPress={signOut}
              // 44pt es el minimo tactil de Apple y Material.
              style={{ minHeight: 44, minWidth: 44, justifyContent: 'center' }}
            >
              <Text style={{ ...typography.caption(), color: '#2563EB' }}>Salir</Text>
            </Pressable>
          ) : null}
        </View>
        <Text style={{ ...typography.amount(), color: '#0B0F14' }} testID="total-mes">
          {formatMoney(total)}
        </Text>
      </View>

      <FlatList
        data={monthExpenses}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <ExpenseRow
            expense={item}
            index={index}
            categoryName={categoryNames.get(item.categoryId) ?? item.categoryId}
            onLongPress={() =>
              confirmRemoval(item.id, formatMoney(item.amountCents, item.currency))
            }
          />
        )}
        ListEmptyComponent={<EmptyState />}
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

function ExpenseRow({
  expense,
  index,
  categoryName,
  onLongPress,
}: {
  expense: Expense;
  index: number;
  categoryName: string;
  onLongPress: () => void;
}) {
  const isPending = expense.syncState === 'pending';
  return (
    <Pressable
      onLongPress={onLongPress}
      // ponytail: mantener presionado en vez de deslizar. Un swipe necesita
      // gesture-handler y layout propio; el long press ya lo trae Pressable y
      // los lectores de pantalla lo anuncian solo.
      accessibilityHint="Mantén presionado para eliminar"
      testID={`gasto-${index}`}
      accessible
      accessibilityLabel={[
        'Gasto',
        formatMoney(expense.amountCents, expense.currency),
        categoryName,
        isPending ? 'Pendiente de sincronizar' : '',
      ]
        .filter(Boolean)
        .join('. ')}
      style={{
        // minHeight, nunca height. Ver BUG-005.
        minHeight: rowMinHeight(),
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 4,
      }}
    >
      <Text
        style={{ ...typography.amount(), color: '#0B0F14' }}
        testID={`gasto-monto-${index}`}
      >
        {formatMoney(expense.amountCents, expense.currency)}
      </Text>
      <Text style={{ ...typography.label(), color: '#374151' }}>{categoryName}</Text>
      {isPending ? (
        // El estado no se comunica solo con color: lleva ícono y texto.
        <Text testID="badge-pending" style={{ ...typography.caption(), color: '#B45309' }}>
          ⏱ Pendiente de sincronizar
        </Text>
      ) : null}
    </Pressable>
  );
}

function ScreenSkeleton() {
  return (
    <SafeAreaView
      style={{ flex: 1, padding: 16, backgroundColor: '#FFFFFF' }}
      testID="skeleton-lista"
    >
      {[0, 1, 2, 3].map((i) => (
        <View
          key={i}
          style={{
            minHeight: rowMinHeight(),
            marginBottom: 12,
            borderRadius: 8,
            backgroundColor: '#E5E7EB',
          }}
        />
      ))}
    </SafeAreaView>
  );
}

function EmptyState() {
  return (
    <View style={{ padding: 32, alignItems: 'center' }}>
      <Text style={{ ...typography.label(), color: '#6B7280' }}>
        Aún no hay gastos este mes
      </Text>
    </View>
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

function ErrorState({ failure }: { failure: Failure }) {
  return (
    <SafeAreaView
      style={{ flex: 1, padding: 32, backgroundColor: '#FFFFFF' }}
      testID="error-lista"
    >
      <Text style={{ ...typography.label(), color: '#0B0F14' }}>{copiaError(failure)}</Text>
    </SafeAreaView>
  );
}
