import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SelectorDeCuenta, useCuentas } from '@/features/cuentas';
import { colores } from '@/shared/theme/colores';
import { scaledSize, typography } from '@/shared/theme/tipografia';
import { GAnimatedPressable, GBoton, GCampo, GTexto } from '@/shared/ui';

import { draftOccurredAt } from '../api/ingresos.local';
import { useCrearIngreso } from '../hooks/useCrearIngreso';
import { FUENTES } from '../types';
import { validarEntradaIngreso } from '../validacion';

export function AgregarIngresoScreen() {
  const [amount, setAmount] = useState('');
  const [fuente, setFuente] = useState<string>(FUENTES[0]);
  const [note, setNote] = useState('');
  const [cuentaId, setCuentaId] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const { cuentas } = useCuentas();
  const mutation = useCrearIngreso();

  // La primera cuenta manda mientras el usuario no elija otra. Con una sola
  // cuenta el selector ni se dibuja, y aun asi el movimiento queda asignado:
  // la columna nunca nace vacia.
  const cuentaElegida = cuentaId ?? cuentas[0]?.id;

  function onSave() {
    const validacion = validarEntradaIngreso({
      amountText: amount,
      fuente,
      noteText: note,
      cuentaId: cuentaElegida,
    });

    if (!validacion.esValido || !validacion.payload) {
      setError(validacion.error ?? 'Verifica los datos ingresados');
      return;
    }

    setError(null);
    mutation.mutate({
      ...validacion.payload,
      occurredAt: draftOccurredAt(),
    });
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
        <GAnimatedPressable
          testID="btn-cancelar"
          accessibilityRole="button"
          accessibilityLabel="Cancelar"
          onPress={() => router.back()}
          scaleTarget={0.92}
          style={{ minHeight: 44, justifyContent: 'center' }}
        >
          <GTexto variante="body" color={colores.acento} style={{ fontWeight: '600' }}>
            Cancelar
          </GTexto>
        </GAnimatedPressable>

        <GTexto variante="label" style={{ fontWeight: '600' }}>
          Nuevo ingreso
        </GTexto>

        {/* Contrapeso del botón Cancelar: mantiene el título centrado. */}
        <View style={{ width: scaledSize(58) }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, gap: 20 }}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View
          entering={FadeInDown.duration(350)}
          style={{
            alignItems: 'center',
            gap: 10,
            paddingVertical: 18,
            paddingHorizontal: 16,
            borderRadius: 16,
            backgroundColor: colores.superficie,
            borderWidth: 1,
            borderColor: colores.borde,
            ...colores.sombraTarjeta,
          }}
        >
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
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(60).duration(300)}
          style={{ gap: 12 }}
        >
          <GTexto variante="eyebrow" color={colores.textoSecundario}>
            Fuente
          </GTexto>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {FUENTES.map((opcion) => {
              const activa = fuente === opcion;
              return (
                <GAnimatedPressable
                  key={opcion}
                  testID={`fuente-${opcion.toLowerCase()}`}
                  accessibilityRole="radio"
                  accessibilityLabel={opcion}
                  accessibilityState={{ selected: activa }}
                  onPress={() => setFuente(opcion)}
                  scaleTarget={0.94}
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
                    style={{ fontWeight: activa ? '700' : '600' }}
                  >
                    {opcion}
                  </GTexto>
                </GAnimatedPressable>
              );
            })}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(120).duration(300)}>
          <SelectorDeCuenta
            cuentas={cuentas}
            seleccionada={cuentaElegida}
            onSeleccionar={setCuentaId}
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(180).duration(300)}>
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
        </Animated.View>
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
