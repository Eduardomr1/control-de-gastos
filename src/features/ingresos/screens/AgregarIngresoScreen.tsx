import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MoneyError, parseAmount } from '@/shared/lib/money';
import { colores } from '@/shared/theme/colores';
import { scaledSize, typography } from '@/shared/theme/tipografia';
import { GBoton, GCampo, GTexto } from '@/shared/ui';

import { draftOccurredAt } from '../api/ingresos.local';
import { useCrearIngreso } from '../hooks/useCrearIngreso';
import { FUENTES } from '../types';

export function AgregarIngresoScreen() {
  const [amount, setAmount] = useState('');
  const [fuente, setFuente] = useState<string>(FUENTES[0]);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const mutation = useCrearIngreso();

  function onSave() {
    try {
      const amountCents = parseAmount(amount);
      // El backend rechaza el monto <= 0 igual que aquí. Esta validación es
      // para poder decirlo en el campo; aquella es para que la regla siga de
      // pie cuando el ingreso no venga de esta pantalla.
      if (amountCents <= 0) {
        setError('El monto debe ser mayor a cero');
        return;
      }
      setError(null);
      const nota = note.trim();
      mutation.mutate({
        amountCents,
        currency: 'MXN',
        fuente,
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
      testID="screen-nuevo-ingreso"
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
          Nuevo ingreso
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
              // El tamaño ya viene escalado por typography. Ver BUG-017.
              allowFontScaling={false}
              testID="input-monto"
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={colores.textoSecundario}
              accessibilityLabel="Monto del ingreso"
              style={{
                flex: 1,
                minWidth: 120,
                textAlign: 'center',
                // Verde y no el acento morado: es la única señal en la
                // pantalla de que este dinero entra en vez de salir.
                color: colores.positivo,
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
            Fuente
          </GTexto>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {FUENTES.map((opcion) => {
              const activa = fuente === opcion;
              return (
                <Pressable
                  key={opcion}
                  testID={`fuente-${opcion.toLowerCase()}`}
                  accessibilityRole="radio"
                  accessibilityLabel={opcion}
                  accessibilityState={{ selected: activa }}
                  onPress={() => setFuente(opcion)}
                  style={{
                    minHeight: 48,
                    paddingHorizontal: 16,
                    paddingVertical: 11,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: activa ? colores.positivo : colores.borde,
                    backgroundColor: activa ? colores.positivo : colores.superficie,
                  }}
                >
                  <GTexto
                    color={activa ? colores.sobreAcento : colores.texto}
                    style={{ fontWeight: '600' }}
                  >
                    {opcion}
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
          placeholder="Quincena de septiembre"
          accessibilityLabel="Nota del ingreso"
          multiline
          textAlignVertical="top"
          style={{ minHeight: scaledSize(76) }}
        />
      </ScrollView>

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
          label={mutation.isPending ? 'Guardando…' : 'Registrar ingreso'}
          busy={mutation.isPending}
          onPress={onSave}
          accessibilityLabel="Guardar ingreso"
        />
      </View>
    </SafeAreaView>
  );
}
