import { Link } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';

import { formatMoney } from '@/shared/lib/money';
import { colores } from '@/shared/theme/colores';
import { GTexto } from '@/shared/ui';

import { saldoTotal } from '../saldos';
import { ETIQUETA_TIPO, type SaldoDeCuenta } from '../types';

/**
 * Saldo por cuenta y consolidado, en el encabezado de la lista.
 *
 * Con una sola cuenta no se dibuja: el saldo de "General" sería el mismo
 * número que ya da el balance del mes, repetido dos centímetros más abajo. La
 * fila aparece cuando el usuario crea su segunda cuenta, que es cuando la
 * pregunta "¿cuánto tengo en cada una?" empieza a existir.
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
          <Pressable
            testID="btn-configurar-cuentas"
            accessibilityRole="button"
            accessibilityLabel="Administrar cuentas"
            style={{ minHeight: 44, justifyContent: 'center' }}
          >
            <GTexto variante="caption" color={colores.acento}>
              Administrar
            </GTexto>
          </Pressable>
        </Link>
      </View>

      {/* Horizontal: con cuatro o cinco cuentas, apilarlas empujaría la lista
          de gastos fuera de la pantalla en el primer scroll. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}
      >
        {saldos.map(({ cuenta, saldoCents }) => (
          <View
            key={cuenta.id}
            testID={`saldo-${cuenta.id}`}
            accessibilityLabel={`${cuenta.nombre}: ${formatMoney(saldoCents, cuenta.currency)}`}
            style={{
              minWidth: 140,
              gap: 4,
              paddingHorizontal: 14,
              paddingVertical: 12,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: colores.borde,
              backgroundColor: colores.superficie,
            }}
          >
            <GTexto variante="caption" color={colores.textoSecundario}>
              {ETIQUETA_TIPO[cuenta.tipo]}
            </GTexto>
            <GTexto variante="caption" style={{ fontWeight: '600' }}>
              {cuenta.nombre}
            </GTexto>
            <GTexto
              variante="label"
              // Un saldo negativo se muestra con su signo y en rojo, igual que
              // el balance: es el dato, no un error de cálculo que ocultar.
              color={saldoCents < 0 ? colores.error : colores.texto}
              style={{ fontWeight: '700' }}
            >
              {formatMoney(saldoCents, cuenta.currency)}
            </GTexto>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
