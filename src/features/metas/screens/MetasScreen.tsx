import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DateError } from '@/shared/lib/date';
import { MoneyError, formatMoney, parseAmount } from '@/shared/lib/money';
import { colores } from '@/shared/theme/colores';
import { scaledSize } from '@/shared/theme/tipografia';
import { GBarraDeProgreso, GBoton, GCampo, GTexto } from '@/shared/ui';

import { useMetas, useMutacionesDeMetas } from '../hooks/useMetas';
import type { Meta } from '../types';

/**
 * Metas de ahorro: lista con progreso animado, aporte manual y alta.
 *
 * El aporte NO se descuenta de ninguna cuenta, aunque el plan lo dejaba como
 * opción. Descontarlo obligaría a registrarlo como un gasto —y apartar dinero
 * no es gastarlo— o a inventar un tercer tipo de movimiento, la transferencia,
 * que ninguna otra pantalla sabe mostrar. La meta lleva su propia cuenta.
 */
export function MetasScreen() {
  const { metas } = useMetas();
  const { crear, aportar, eliminar } = useMutacionesDeMetas();

  const [nombre, setNombre] = useState('');
  const [objetivo, setObjetivo] = useState('');
  const [fechaLimite, setFechaLimite] = useState('');
  const [error, setError] = useState<string | null>(null);

  function onCrear() {
    setError(null);
    if (nombre.trim() === '') {
      setError('Ponle un nombre a la meta');
      return;
    }
    let objetivoCents: number;
    try {
      objetivoCents = parseAmount(objetivo);
    } catch (e) {
      setError(e instanceof MoneyError ? e.message : 'Objetivo inválido');
      return;
    }
    const fecha = fechaLimite.trim();
    crear.mutate(
      { nombre: nombre.trim(), objetivoCents, ...(fecha ? { fechaLimite: fecha } : {}) },
      {
        onSuccess: () => {
          setNombre('');
          setObjetivo('');
          setFechaLimite('');
        },
        onError: (e) =>
          setError(
            e instanceof MoneyError || e instanceof DateError
              ? e.message
              : 'No se pudo guardar la meta',
          ),
      },
    );
  }

  function confirmarEliminar(meta: Meta) {
    Alert.alert('Eliminar meta', `¿Eliminar ${meta.nombre}?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => eliminar.mutate(meta.id) },
    ]);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colores.fondo }} testID="screen-metas">
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
          Metas de ahorro
        </GTexto>

        <View style={{ width: scaledSize(58) }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }} keyboardShouldPersistTaps="handled">
        {metas.length === 0 ? (
          <GTexto variante="body" color={colores.textoSecundario}>
            Sin metas. Ponle nombre y monto a lo que quieres juntar y ve apartando.
          </GTexto>
        ) : (
          metas.map((meta, index) => (
            <Animated.View
              key={meta.id}
              entering={FadeInDown.delay(index * 50).duration(280)}
            >
              <TarjetaDeMeta
                meta={meta}
                aportando={aportar.isPending}
                onAportar={(montoCents) => aportar.mutateAsync({ id: meta.id, montoCents })}
                onEliminar={() => confirmarEliminar(meta)}
              />
            </Animated.View>
          ))
        )}

        <View style={{ gap: 14, paddingTop: 18, borderTopWidth: 1, borderTopColor: colores.borde }}>
          <GTexto variante="eyebrow" color={colores.textoSecundario}>
            Nueva meta
          </GTexto>

          <GCampo
            testID="input-nombre-meta"
            etiqueta="Nombre"
            value={nombre}
            onChangeText={setNombre}
            placeholder="Viaje a Oaxaca"
            accessibilityLabel="Nombre de la meta"
          />
          <GCampo
            testID="input-objetivo"
            etiqueta="Cuánto quieres juntar"
            value={objetivo}
            onChangeText={setObjetivo}
            keyboardType="decimal-pad"
            placeholder="0.00"
            accessibilityLabel="Monto objetivo"
          />
          <GCampo
            testID="input-fecha-limite"
            etiqueta="Para cuándo (opcional)"
            value={fechaLimite}
            onChangeText={setFechaLimite}
            placeholder="AAAA-MM-DD"
            keyboardType="numbers-and-punctuation"
            accessibilityLabel="Fecha límite, en formato año, mes y día"
          />

          {error ? (
            <GTexto variante="caption" color={colores.error} testID="error-meta">
              {error}
            </GTexto>
          ) : null}

          <GBoton
            testID="btn-crear-meta"
            label={crear.isPending ? 'Guardando…' : 'Crear meta'}
            busy={crear.isPending}
            onPress={onCrear}
            accessibilityLabel="Crear meta"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function TarjetaDeMeta({
  meta,
  aportando,
  onAportar,
  onEliminar,
}: {
  meta: Meta;
  aportando: boolean;
  onAportar: (montoCents: number) => Promise<void>;
  onEliminar: () => void;
}) {
  const [monto, setMonto] = useState('');
  const [error, setError] = useState<string | null>(null);
  const cumplida = meta.actualCents >= meta.objetivoCents;

  async function onPress() {
    setError(null);
    try {
      await onAportar(parseAmount(monto));
      setMonto('');
    } catch (e) {
      setError(e instanceof MoneyError ? e.message : 'Monto inválido');
    }
  }

  return (
    <Pressable
      testID={`meta-${meta.id}`}
      onLongPress={onEliminar}
      accessibilityHint="Mantén presionado para eliminar"
      style={{
        gap: 12,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colores.borde,
        backgroundColor: colores.superficie,
        ...colores.sombraTarjeta,
      }}
    >
      <GBarraDeProgreso
        testID={`progreso-${meta.id}`}
        etiqueta={meta.nombre}
        detalle={`${formatMoney(meta.actualCents)} de ${formatMoney(meta.objetivoCents)}`}
        actualCents={meta.actualCents}
        objetivoCents={meta.objetivoCents}
        color={cumplida ? colores.positivo : colores.acento}
        mostrarPorcentaje={true}
      />

      {cumplida ? (
        <View
          style={{
            alignSelf: 'flex-start',
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 8,
            backgroundColor: colores.positivoSuave,
          }}
        >
          <GTexto variante="caption" color={colores.positivo} style={{ fontWeight: '700' }}>
            🎉 Meta cumplida
          </GTexto>
        </View>
      ) : (
        <GTexto variante="caption" color={colores.textoSecundario}>
          {`Faltan ${formatMoney(meta.objetivoCents - meta.actualCents)}`}
          {meta.fechaLimite ? ` · para el ${meta.fechaLimite}` : ''}
        </GTexto>
      )}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', gap: 10 }}>
        <View style={{ flex: 1, minWidth: 140 }}>
          <GCampo
            testID={`input-aporte-${meta.id}`}
            etiqueta="Aportar"
            value={monto}
            onChangeText={setMonto}
            keyboardType="decimal-pad"
            placeholder="0.00"
            accessibilityLabel={`Monto a aportar a ${meta.nombre}`}
          />
        </View>
        <GBoton
          testID={`btn-aportar-${meta.id}`}
          label="Aportar"
          busy={aportando}
          onPress={onPress}
          accessibilityLabel={`Aportar a ${meta.nombre}`}
        />
      </View>

      {error ? (
        <GTexto variante="caption" color={colores.error}>
          {error}
        </GTexto>
      ) : null}
    </Pressable>
  );
}
