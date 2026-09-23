import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useCategorias } from '@/features/categorias';
import { MoneyError, formatMoney, parseAmount, sumCents } from '@/shared/lib/money';
import { colores } from '@/shared/theme/colores';
import { scaledSize } from '@/shared/theme/tipografia';
import { GBoton, GCampo, GTexto } from '@/shared/ui';

import { useGuardarPresupuesto, usePresupuestos } from '../hooks/usePresupuestos';

/**
 * Límite mensual por categoría.
 *
 * Los límites que se fijan aquí son los generales —sin mes—: valen para
 * cualquier mes que no tenga uno propio. El override por mes existe en el
 * esquema y en `presupuestoVigente`, pero no tiene pantalla: nadie ha pedido
 * "solo en diciembre" todavía, y la fila se puede crear el día que se pida
 * sin migrar nada.
 */
export function PresupuestosScreen() {
  const { data: categorias = [] } = useCategorias();
  const { presupuestos } = usePresupuestos();
  const guardar = useGuardarPresupuesto();
  const [borradores, setBorradores] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  function limiteActual(categoryId: string): string {
    const borrador = borradores[categoryId];
    if (borrador !== undefined) return borrador;
    // El general, sin mes: es el unico que esta pantalla edita.
    const general = presupuestos.find(
      (p) => p.categoryId === categoryId && p.mesReferencia === undefined,
    );
    return general ? (general.limiteCents / 100).toFixed(2) : '';
  }

  async function onGuardar() {
    try {
      setError(null);
      // Solo se guarda lo que el usuario tocó. Reescribir los que no cambiaron
      // les movería el updatedAt y los haría ver como editados.
      for (const [categoryId, texto] of Object.entries(borradores)) {
        if (texto.trim() === '') continue;
        await guardar.mutateAsync({ categoryId, limiteCents: parseAmount(texto) });
      }
      router.back();
    } catch (e) {
      setError(e instanceof MoneyError ? e.message : 'Revisa los montos');
    }
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colores.fondo }}
      testID="screen-presupuestos"
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
          Presupuestos
        </GTexto>

        <View style={{ width: scaledSize(58) }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, gap: 18 }}
        keyboardShouldPersistTaps="handled"
      >
        <GTexto variante="body" color={colores.textoSecundario}>
          Un límite mensual por categoría. Al llegar al 80% y al 100% la app
          avisa una vez, no en cada gasto.
        </GTexto>

        {categorias.map((categoria) => (
          <GCampo
            key={categoria.id}
            testID={`limite-${categoria.id}`}
            etiqueta={categoria.name}
            value={limiteActual(categoria.id)}
            onChangeText={(texto) =>
              setBorradores((previos) => ({ ...previos, [categoria.id]: texto }))
            }
            keyboardType="decimal-pad"
            placeholder="Sin límite"
            accessibilityLabel={`Límite mensual de ${categoria.name}`}
          />
        ))}

        {error ? (
          <GTexto variante="caption" color={colores.error} testID="error-presupuesto">
            {error}
          </GTexto>
        ) : null}

        {presupuestos.length > 0 ? (
          <GTexto variante="caption" color={colores.textoSecundario}>
            {`Total presupuestado: ${formatMoney(
              sumCents(presupuestos.map((p) => p.limiteCents)),
            )}`}
          </GTexto>
        ) : null}
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
          label={guardar.isPending ? 'Guardando…' : 'Guardar presupuestos'}
          busy={guardar.isPending}
          onPress={onGuardar}
          accessibilityLabel="Guardar presupuestos"
        />
      </View>
    </SafeAreaView>
  );
}
