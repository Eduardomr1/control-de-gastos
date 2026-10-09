import { Link } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { formatMoney } from '@/shared/lib/money';
import { colores } from '@/shared/theme/colores';
import { GTexto, GAnimatedPressable } from '@/shared/ui';

import { saldoTotal } from '../saldos';
import { ETIQUETA_TIPO, type SaldoDeCuenta } from '../types';

/**
 * Saldo por cuenta y consolidado en el encabezado de la lista.
 * Tarjetas horizontales interactivas con microinteracción elástica.
 */
export function TarjetasDeSaldo({ saldos }: { saldos: readonly SaldoDeCuenta[] }) {
  if (saldos.length < 2) return null;

  const total = saldoTotal(saldos);

  return (
    <View
      style={{
        paddingVertical: 16,
        gap: 12,
        borderBottomWidth: 1,
        borderBottomColor: colores.borde,
      }}
      testID="tarjetas-de-saldo"
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 8,
          paddingHorizontal: 20,
        }}
      >
        <GTexto variante="eyebrow" color={colores.textoSecundario}>
          {`Cuentas · ${formatMoney(total)}`}
        </GTexto>
        <Link href="/cuentas" asChild>
          <GAnimatedPressable
            testID="btn-configurar-cuentas"
            accessibilityRole="button"
            accessibilityLabel="Administrar cuentas"
            scaleTarget={0.92}
            style={{
              minHeight: 36,
              paddingHorizontal: 12,
              borderRadius: 999,
              backgroundColor: colores.acentoSuave,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <GTexto variante="caption" color={colores.acento} style={{ fontWeight: '700' }}>
              Administrar
            </GTexto>
          </GAnimatedPressable>
        </Link>
      </View>

      {/* Carrusel horizontal de Cuentas */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}
      >
        {saldos.map(({ cuenta, saldoCents }) => (
          <Link key={cuenta.id} href="/cuentas" asChild>
            <GAnimatedPressable
              testID={`saldo-${cuenta.id}`}
              accessibilityLabel={`${cuenta.nombre}: ${formatMoney(saldoCents, cuenta.currency)}`}
              scaleTarget={0.96}
              style={{
                minWidth: 144,
                gap: 4,
                paddingHorizontal: 16,
                paddingVertical: 14,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: colores.borde,
                backgroundColor: colores.superficie,
                ...colores.sombraTarjeta,
              }}
            >
              <GTexto variante="caption" color={colores.textoSecundario} style={{ fontSize: 11, fontWeight: '600' }}>
                {ETIQUETA_TIPO[cuenta.tipo]}
              </GTexto>
              <GTexto variante="body" style={{ fontWeight: '700', color: colores.texto }}>
                {cuenta.nombre}
              </GTexto>
              <GTexto
                variante="label"
                color={saldoCents < 0 ? colores.error : colores.positivo}
                style={{ fontWeight: '800', marginTop: 2 }}
              >
                {formatMoney(saldoCents, cuenta.currency)}
              </GTexto>
            </GAnimatedPressable>
          </Link>
        ))}
      </ScrollView>
    </View>
  );
}
