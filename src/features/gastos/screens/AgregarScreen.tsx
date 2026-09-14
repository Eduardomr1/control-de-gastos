import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MoneyError, parseAmount } from '@/shared/lib/money';
import { colores } from '@/shared/theme/colores';
import { scaledSize, typography } from '@/shared/theme/tipografia';
import { GBoton, GCampo, GTexto } from '@/shared/ui';
import { useCategorias } from '@/features/categorias';
import { draftOccurredAt } from '../api';
import { useCrearGasto } from '../hooks/useCrearGasto';

export function AgregarScreen() {
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState<string>('comida');
  const [note, setNote] = useState('');
  const { data: categories = [] } = useCategorias();
  const [error, setError] = useState<string | null>(null);
  const mutation = useCrearGasto();

  function onSave() {
    try {
      const amountCents = parseAmount(amount);
      if (amountCents === 0) {
        setError('El monto debe ser mayor a cero');
        return;
      }
      setError(null);
      const nota = note.trim();
      mutation.mutate({
        amountCents,
        currency: 'MXN',
        categoryId,
        occurredAt: draftOccurredAt(),
        ...(nota ? { note: nota } : {}),
      });
    } catch (e) {
      setError(e instanceof MoneyError ? e.message : 'Monto inválido');
    }
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colores.fondo }}
      testID="screen-nuevo-gasto"
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          paddingHorizontal: 20,
          paddingBottom: 14,
          borderBottomWidth: 1,
          borderBottomColor: colores.borde,
        }}
      >
        <Pressable
          testID="btn-cancelar"
          accessibilityRole="button"
          accessibilityLabel="Cancelar"
          onPress={() => router.back()}
          style={{ minHeight: 44, justifyContent: 'center' }}
        >
          <GTexto variante="body" color={colores.acento} style={{ fontWeight: '600' }}>
            Cancelar
          </GTexto>
        </Pressable>

        <GTexto variante="label" style={{ fontWeight: '600' }}>
          Nuevo gasto
        </GTexto>

        {/* Contrapeso del botón Cancelar: mantiene el título centrado. */}
        <View style={{ width: scaledSize(58) }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, gap: 22 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ alignItems: 'center', gap: 10, paddingVertical: 12 }}>
          <GTexto variante="eyebrow" color={colores.textoSecundario}>
            Monto
          </GTexto>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'baseline',
              justifyContent: 'center',
              flexWrap: 'wrap',
              alignSelf: 'stretch',
              gap: 6,
            }}
          >
            <GTexto
              color={colores.textoSecundario}
              style={{ fontSize: scaledSize(28), fontWeight: '600' }}
            >
              $
            </GTexto>
            <TextInput
              testID="input-monto"
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={colores.textoSecundario}
              accessibilityLabel="Monto del gasto"
              style={{
                flex: 1,
                minWidth: 120,
                textAlign: 'center',
                color: colores.acento,
                ...typography.montoGrande(),
              }}
            />
            <GTexto variante="caption" color={colores.textoSecundario}>
              MXN
            </GTexto>
          </View>
          {error ? (
            <GTexto variante="caption" color={colores.error} testID="error-monto">
              {error}
            </GTexto>
          ) : null}
        </View>

        <View style={{ gap: 12 }}>
          <GTexto variante="eyebrow" color={colores.textoSecundario}>
            Categoría
          </GTexto>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {categories.map((category) => {
              const activa = categoryId === category.id;
              return (
                <Pressable
                  key={category.id}
                  testID={`categoria-${category.id}`}
                  accessibilityRole="radio"
                  accessibilityLabel={category.name}
                  accessibilityState={{ selected: activa }}
                  onPress={() => setCategoryId(category.id)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    minHeight: 48,
                    paddingHorizontal: 16,
                    paddingVertical: 11,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: activa ? colores.acento : colores.borde,
                    backgroundColor: activa ? colores.acento : colores.superficie,
                  }}
                >
                  <View
                    style={{
                      width: scaledSize(14, 1.5),
                      height: scaledSize(14, 1.5),
                      borderRadius: 999,
                      backgroundColor: activa ? colores.sobreAcento : category.color,
                    }}
                  />
                  <GTexto
                    color={activa ? colores.sobreAcento : colores.texto}
                    style={{ fontWeight: '600' }}
                  >
                    {category.name}
                  </GTexto>
                </Pressable>
              );
            })}
          </View>
        </View>

        <GCampo
          testID="input-nota"
          etiqueta="Nota (opcional)"
          value={note}
          onChangeText={setNote}
          placeholder="Cena con Marta"
          accessibilityLabel="Nota del gasto"
          multiline
          textAlignVertical="top"
          style={{ minHeight: scaledSize(76) }}
        />
      </ScrollView>

      {/* Un solo botón para una sola acción. El guardado es idempotente por id
          de cliente, así que el doble tap es inofensivo aunque el usuario
          alcance a presionarlo dos veces. Ver BUG-003. */}
      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: 14,
          paddingBottom: 24,
          borderTopWidth: 1,
          borderTopColor: colores.borde,
        }}
      >
        <GBoton
          testID="btn-guardar"
          label={mutation.isPending ? 'Guardando…' : 'Registrar gasto'}
          busy={mutation.isPending}
          onPress={onSave}
          accessibilityLabel="Guardar gasto"
        />
      </View>
    </SafeAreaView>
  );
}
