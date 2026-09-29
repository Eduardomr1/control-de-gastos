import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MoneyError, formatMoney, parseAmount } from '@/shared/lib/money';
import { colores } from '@/shared/theme/colores';
import { scaledSize } from '@/shared/theme/tipografia';
import { GBoton, GCampo, GTexto } from '@/shared/ui';

import { useCuentas, useMutacionesDeCuentas } from '../hooks/useCuentas';
import {
  CUENTA_GENERAL,
  ETIQUETA_TIPO,
  TIPOS_DE_CUENTA,
  type Cuenta,
  type TipoDeCuenta,
} from '../types';

export function CuentasScreen() {
  const { cuentas } = useCuentas();
  const { crear, eliminar } = useMutacionesDeCuentas();

  const [nombre, setNombre] = useState('');
  const [saldoInicial, setSaldoInicial] = useState('');
  const [tipo, setTipo] = useState<TipoDeCuenta>('debito');
  const [error, setError] = useState<string | null>(null);

  function onAgregar() {
    try {
      setError(null);
      if (nombre.trim() === '') {
        setError('Ponle un nombre a la cuenta');
        return;
      }
      crear.mutate(
        {
          nombre: nombre.trim(),
          tipo,
          // Vacío es cero, no un error: una cuenta puede empezar sin saldo, y
          // obligar a teclear "0" solo añade un paso.
          saldoInicialCents: saldoInicial.trim() === '' ? 0 : parseAmount(saldoInicial),
          currency: 'MXN',
        },
        {
          onSuccess: () => {
            setNombre('');
            setSaldoInicial('');
          },
        },
      );
    } catch (e) {
      setError(e instanceof MoneyError ? e.message : 'Saldo inicial inválido');
    }
  }

  function confirmarEliminar(cuenta: Cuenta) {
    Alert.alert(
      'Eliminar cuenta',
      `¿Eliminar ${cuenta.nombre}? Sus movimientos no se borran; dejan de contarse en un saldo propio.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => eliminar.mutate(cuenta.id),
        },
      ],
    );
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colores.fondo }}
      testID="screen-cuentas"
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
          accessibilityLabel="Cerrar"
          onPress={() => router.back()}
          style={{ minHeight: 44, justifyContent: 'center' }}
        >
          <GTexto variante="body" color={colores.acento} style={{ fontWeight: '600' }}>
            Cerrar
          </GTexto>
        </Pressable>

        <GTexto variante="label" style={{ fontWeight: '600' }}>
          Cuentas
        </GTexto>

        <View style={{ width: scaledSize(58) }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, gap: 16 }}
        keyboardShouldPersistTaps="handled"
      >
        {cuentas.map((cuenta) => (
          <Pressable
            key={cuenta.id}
            testID={`fila-cuenta-${cuenta.id}`}
            onLongPress={
              // General no se puede borrar: es el destino de todo movimiento
              // sin cuenta, y sin ella el consolidado dejaría de cuadrar con la
              // suma de las cuentas.
              cuenta.id === CUENTA_GENERAL ? undefined : () => confirmarEliminar(cuenta)
            }
            accessibilityLabel={`${cuenta.nombre}, ${ETIQUETA_TIPO[cuenta.tipo]}, saldo inicial ${formatMoney(cuenta.saldoInicialCents, cuenta.currency)}`}
            accessibilityHint={
              cuenta.id === CUENTA_GENERAL
                ? 'La cuenta General no se puede eliminar'
                : 'Mantén presionado para eliminar'
            }
            style={{
              gap: 2,
              minHeight: 64,
              justifyContent: 'center',
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: colores.borde,
              backgroundColor: colores.superficie,
            }}
          >
            <GTexto variante="label" style={{ fontWeight: '600' }}>
              {cuenta.nombre}
            </GTexto>
            <GTexto variante="caption" color={colores.textoSecundario}>
              {`${ETIQUETA_TIPO[cuenta.tipo]} · inicia en ${formatMoney(cuenta.saldoInicialCents, cuenta.currency)}`}
            </GTexto>
          </Pressable>
        ))}

        <View
          style={{
            gap: 14,
            paddingTop: 18,
            borderTopWidth: 1,
            borderTopColor: colores.borde,
          }}
        >
          <GTexto variante="eyebrow" color={colores.textoSecundario}>
            Nueva cuenta
          </GTexto>

          <GCampo
            testID="input-nombre-cuenta"
            etiqueta="Nombre"
            value={nombre}
            onChangeText={setNombre}
            placeholder="Débito BBVA"
            accessibilityLabel="Nombre de la cuenta"
          />

          <GCampo
            testID="input-saldo-inicial"
            etiqueta="Saldo inicial (opcional)"
            value={saldoInicial}
            onChangeText={setSaldoInicial}
            keyboardType="decimal-pad"
            placeholder="0.00"
            accessibilityLabel="Saldo inicial de la cuenta"
          />

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {TIPOS_DE_CUENTA.map((opcion) => {
              const activa = tipo === opcion;
              return (
                <Pressable
                  key={opcion}
                  testID={`tipo-${opcion}`}
                  accessibilityRole="radio"
                  accessibilityLabel={ETIQUETA_TIPO[opcion]}
                  accessibilityState={{ selected: activa }}
                  onPress={() => setTipo(opcion)}
                  style={{
                    minHeight: 48,
                    justifyContent: 'center',
                    paddingHorizontal: 16,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: activa ? colores.acento : colores.borde,
                    backgroundColor: activa ? colores.acento : colores.superficie,
                  }}
                >
                  <GTexto
                    color={activa ? colores.sobreAcento : colores.texto}
                    style={{ fontWeight: '600' }}
                  >
                    {ETIQUETA_TIPO[opcion]}
                  </GTexto>
                </Pressable>
              );
            })}
          </View>

          {error ? (
            <GTexto variante="caption" color={colores.error} testID="error-cuenta">
              {error}
            </GTexto>
          ) : null}

          <GBoton
            testID="btn-agregar-cuenta"
            label={crear.isPending ? 'Guardando…' : 'Agregar cuenta'}
            busy={crear.isPending}
            onPress={onAgregar}
            accessibilityLabel="Agregar cuenta"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
