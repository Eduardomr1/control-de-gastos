import { useMutation, useQueries, useQueryClient } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { Alert, FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { formatMonthKey, groupByMonth, monthKeyOf, nowLocalIso } from '@/lib/date';
import { formatMoney, sumCents } from '@/lib/money';
import { controlSize, rowMinHeight, typography } from '@/lib/typography';
import { deleteExpense, fetchCategories, fetchExpenses, isRemote } from '@/lib/repository';
import { signOut } from '@/lib/auth';
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
  const isError = results.some((r) => r.isError);

  if (isPending) return <ScreenSkeleton />;
  if (isError) return <ErrorState />;

  const [expensesResult, categoriesResult] = results;
  const expenses = (expensesResult?.data ?? []) as Expense[];
  const categories = (categoriesResult?.data ?? []) as Category[];
  // La consulta de categorías ya se hacía para el gating de carga; aquí se le
  // da uso: la fila muestra el nombre legible en vez del identificador crudo.
  const categoryNames = new Map(categories.map((c) => [c.id, c.name]));
  const visible = expenses.filter((e) => !e.deletedAt);
  const monthExpenses = groupByMonth(visible).get(currentMonth) ?? [];
  const total = sumCents(monthExpenses.map((e) => e.amountCents));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} testID="screen-lista">
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

function ErrorState() {
  return (
    <SafeAreaView
      style={{ flex: 1, padding: 32, backgroundColor: '#FFFFFF' }}
      testID="error-lista"
    >
      <Text style={{ ...typography.label(), color: '#0B0F14' }}>
        No se pudieron cargar los gastos
      </Text>
    </SafeAreaView>
  );
}
