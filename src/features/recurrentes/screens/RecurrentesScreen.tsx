import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useCategorias } from '@/features/categorias';
import { formatDayShort, nowLocalIso } from '@/shared/lib/date';
import { MoneyError, formatMoney, parseAmount } from '@/shared/lib/money';
import { colores } from '@/shared/theme/colores';
import { scaledSize } from '@/shared/theme/tipografia';
import { GBoton, GCampo, GTexto } from '@/shared/ui';

import { proximaOcurrencia } from '../calendario';
import {
  useMutacionesDeRecurrentes,
  useRecurrentes,
} from '../hooks/useRecurrentes';
import {
  ETIQUETA_FRECUENCIA,
  FRECUENCIAS,
  type Frecuencia,
  type Recurrente,
} from '../types';

/**
 * Lista y alta de movimientos recurrentes.
 *
 * Alta en la misma pantalla que la lista y no en una aparte: un recurrente se
 * da de alta tres o cuatro veces en la vida de la app, y una pantalla
 * dedicada para eso es una navegación más por un formulario de cuatro campos.
 */
export function RecurrentesScreen() {
  const { recurrentes } = useRecurrentes();
  const { crear, alternar, eliminar } = useMutacionesDeRecurrentes();
  const { data: categorias = [] } = useCategorias();

  const [nombre, setNombre] = useState('');
  const [monto, setMonto] = useState('');
  const [frecuencia, setFrecuencia] = useState<Frecuencia>('mensual');
  const [error, setError] = useState<string | null>(null);

  function onAgregar() {
    try {
      setError(null);
      if (nombre.trim() === '') {
        setError('Ponle un nombre para reconocerlo');
        return;
      }
      crear.mutate(
        {
          tipo: 'gasto',
          nombre: nombre.trim(),
          amountCents: parseAmount(monto),
          currency: 'MXN',
          categoryId: categorias[0]?.id ?? 'otros',
          frecuencia,
          // Arranca hoy: el primer cobro es el de hoy mismo y el generador lo
          // materializa en esta misma sesión. Dejarlo para el mes siguiente
          // obligaría a explicar por qué no pasó nada al guardar.
          inicio: nowLocalIso(),
          activo: true,
        },
        {
          onSuccess: () => {
            setNombre('');
            setMonto('');
          },
        },
      );
    } catch (e) {
      setError(e instanceof MoneyError ? e.message : 'Monto inválido');
    }
  }

  function confirmarEliminar(r: Recurrente) {
    Alert.alert('Eliminar recurrente', `¿Eliminar ${r.nombre}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => eliminar.mutate(r.id),
      },
    ]);
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colores.fondo }}
      testID="screen-recurrentes"
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
          Recurrentes
        </GTexto>

        <View style={{ width: scaledSize(58) }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, gap: 20 }}
        keyboardShouldPersistTaps="handled"
      >
        {recurrentes.length === 0 ? (
          <GTexto variante="body" color={colores.textoSecundario}>
            Sin recurrentes. La renta, el streaming o la quincena se registran
            solos y te avisan dos días antes.
          </GTexto>
        ) : (
          recurrentes.map((r) => (
            <FilaRecurrente
              key={r.id}
              recurrente={r}
              onAlternar={(activo) => alternar.mutate({ id: r.id, activo })}
              onEliminar={() => confirmarEliminar(r)}
            />
          ))
        )}

        <View
          style={{
            gap: 14,
            paddingTop: 18,
            borderTopWidth: 1,
            borderTopColor: colores.borde,
          }}
        >
          <GTexto variante="eyebrow" color={colores.textoSecundario}>
            Nuevo recurrente
          </GTexto>

          <GCampo
            testID="input-nombre"
            etiqueta="Nombre"
            value={nombre}
            onChangeText={setNombre}
            placeholder="Renta"
            accessibilityLabel="Nombre del recurrente"
          />

          <GCampo
            testID="input-monto"
            etiqueta="Monto"
            value={monto}
            onChangeText={setMonto}
            keyboardType="decimal-pad"
            placeholder="0.00"
            accessibilityLabel="Monto del recurrente"
          />

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {FRECUENCIAS.map((opcion) => {
              const activa = frecuencia === opcion;
              return (
                <Pressable
                  key={opcion}
                  testID={`frecuencia-${opcion}`}
                  accessibilityRole="radio"
                  accessibilityLabel={ETIQUETA_FRECUENCIA[opcion]}
                  accessibilityState={{ selected: activa }}
                  onPress={() => setFrecuencia(opcion)}
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
                    {ETIQUETA_FRECUENCIA[opcion]}
                  </GTexto>
                </Pressable>
              );
            })}
          </View>

          {error ? (
            <GTexto variante="caption" color={colores.error} testID="error-recurrente">
              {error}
            </GTexto>
          ) : null}

          <GBoton
            testID="btn-agregar-recurrente"
            label={crear.isPending ? 'Guardando…' : 'Agregar recurrente'}
            busy={crear.isPending}
            onPress={onAgregar}
            accessibilityLabel="Agregar recurrente"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function FilaRecurrente({
  recurrente,
  onAlternar,
  onEliminar,
}: {
  recurrente: Recurrente;
  onAlternar: (activo: boolean) => void;
  onEliminar: () => void;
}) {
  const proxima = proximaOcurrencia(
    recurrente.inicio,
    recurrente.frecuencia,
    nowLocalIso(),
  );

  return (
    <Pressable
      testID={`recurrente-${recurrente.id}`}
      onLongPress={onEliminar}
      accessibilityLabel={`${recurrente.nombre}, ${formatMoney(recurrente.amountCents, recurrente.currency)}, ${ETIQUETA_FRECUENCIA[recurrente.frecuencia]}`}
      accessibilityHint="Mantén presionado para eliminar"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        minHeight: 64,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colores.borde,
        backgroundColor: colores.superficie,
      }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <GTexto variante="label" style={{ fontWeight: '600' }}>
          {recurrente.nombre}
        </GTexto>
        <GTexto variante="caption" color={colores.textoSecundario}>
          {`${formatMoney(recurrente.amountCents, recurrente.currency)} · ${ETIQUETA_FRECUENCIA[recurrente.frecuencia]}`}
        </GTexto>
        {recurrente.activo && proxima ? (
          <GTexto variante="caption" color={colores.textoSecundario}>
            {`Próximo: ${formatDayShort(proxima)}`}
          </GTexto>
        ) : null}
      </View>

      <Switch
        testID={`switch-${recurrente.id}`}
        value={recurrente.activo}
        onValueChange={onAlternar}
        accessibilityLabel={`Activar ${recurrente.nombre}`}
        trackColor={{ true: colores.acento, false: colores.borde }}
      />
    </Pressable>
  );
}
