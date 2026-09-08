import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MoneyError, parseAmount } from '@/lib/money';
import { createExpense, draftOccurredAt, fetchCategories } from '@/lib/repository';
import { typography } from '@/lib/typography';

export default function AddScreen() {
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState<string>('comida');
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  });
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: createExpense,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['expenses'] });
      router.back();
    },
  });

  function onSave() {
    try {
      const amountCents = parseAmount(amount);
      if (amountCents === 0) {
        setError('El monto debe ser mayor a cero');
        return;
      }
      setError(null);
      mutation.mutate({
        amountCents,
        currency: 'MXN',
        categoryId,
        occurredAt: draftOccurredAt(),
      });
    } catch (e) {
      setError(e instanceof MoneyError ? e.message : 'Monto inválido');
    }
  }

  return (
    <SafeAreaView
      style={{ flex: 1, padding: 16, gap: 16, backgroundColor: '#FFFFFF' }}
      testID="screen-nuevo-gasto"
    >
      <Text style={{ ...typography.label(), color: '#0B0F14' }}>Monto</Text>
      <TextInput
        testID="input-monto"
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
        placeholder="0.00"
        placeholderTextColor="#6B7280"
        accessibilityLabel="Monto del gasto"
        style={{
          minHeight: 56,
          borderWidth: 1,
          borderColor: error ? '#DC2626' : '#D1D5DB',
          borderRadius: 8,
          paddingHorizontal: 12,
          backgroundColor: '#FFFFFF',
          color: '#0B0F14',
          ...typography.amount(),
        }}
      />
      {error ? (
        <Text testID="error-monto" style={{ ...typography.caption(), color: '#DC2626' }}>
          {error}
        </Text>
      ) : null}

      <Text style={{ ...typography.label(), color: '#0B0F14' }}>Categoría</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {categories.map((category) => (
          <Pressable
            key={category.id}
            testID={`categoria-${category.id}`}
            accessibilityRole="radio"
            accessibilityLabel={category.name}
            accessibilityState={{ selected: categoryId === category.id }}
            onPress={() => setCategoryId(category.id)}
            style={{
              minHeight: 48,
              minWidth: 48,
              paddingHorizontal: 16,
              justifyContent: 'center',
              borderRadius: 24,
              borderWidth: categoryId === category.id ? 2 : 1,
              borderColor: categoryId === category.id ? '#2563EB' : '#D1D5DB',
            }}
          >
            <Text style={{ ...typography.label(), color: '#0B0F14' }}>
              {category.name}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Un solo botón para una sola acción. El guardado es idempotente por id
          de cliente, así que el doble tap es inofensivo aunque el usuario
          alcance a presionarlo dos veces. Ver BUG-003. */}
      <Pressable
        testID="btn-guardar"
        accessibilityRole="button"
        accessibilityLabel="Guardar gasto"
        disabled={mutation.isPending}
        onPress={onSave}
        style={{
          minHeight: 56,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 8,
          backgroundColor: mutation.isPending ? '#93C5FD' : '#2563EB',
        }}
      >
        <Text style={{ ...typography.label(), color: '#fff' }}>
          {mutation.isPending ? 'Guardando…' : 'Guardar'}
        </Text>
      </Pressable>
    </SafeAreaView>
  );
}
