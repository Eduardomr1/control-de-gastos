import { useQueries } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { formatMonthKey, groupByMonth, monthKeyOf, nowLocalIso } from '@/lib/date';
import { formatMoney, sumCents } from '@/lib/money';
import { controlSize, rowMinHeight, typography } from '@/lib/typography';
import { fetchCategories, fetchExpenses } from '@/lib/repository';
import type { Expense } from '@/types/expense';

export default function ListScreen() {
  const currentMonth = monthKeyOf(nowLocalIso());

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

  const [expensesResult] = results;
  const expenses = (expensesResult?.data ?? []) as Expense[];
  const visible = expenses.filter((e) => !e.deletedAt);
  const monthExpenses = groupByMonth(visible).get(currentMonth) ?? [];
  const total = sumCents(monthExpenses.map((e) => e.amountCents));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} testID="screen-lista">
      <View style={{ padding: 16, gap: 4 }}>
        <Text style={{ ...typography.caption(), color: '#6B7280' }}>
          {formatMonthKey(currentMonth)}
        </Text>
        <Text style={{ ...typography.amount(), color: '#0B0F14' }} testID="total-mes">
          {formatMoney(total)}
        </Text>
      </View>

      <FlatList
        data={monthExpenses}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => <ExpenseRow expense={item} index={index} />}
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

function ExpenseRow({ expense, index }: { expense: Expense; index: number }) {
  const isPending = expense.syncState === 'pending';
  return (
    <View
      testID={`gasto-${index}`}
      accessible
      accessibilityLabel={[
        'Gasto',
        formatMoney(expense.amountCents, expense.currency),
        expense.categoryId,
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
      <Text style={{ ...typography.label(), color: '#374151' }}>{expense.categoryId}</Text>
      {isPending ? (
        // El estado no se comunica solo con color: lleva ícono y texto.
        <Text testID="badge-pending" style={{ ...typography.caption(), color: '#B45309' }}>
          ⏱ Pendiente de sincronizar
        </Text>
      ) : null}
    </View>
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
