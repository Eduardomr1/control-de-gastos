import { Link } from 'expo-router';
import { View, ScrollView } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { formatMonthName } from '@/shared/lib/date';
import { formatMoney } from '@/shared/lib/money';
import { colores } from '@/shared/theme/colores';
import { GTexto, GAnimatedPressable } from '@/shared/ui';

/**
 * Encabezado principal del dashboard de gastos:
 * Hero Card fintech con física elástica de entrada vía Reanimated,
 * balance en tiempo real, desglose visual de ingresos/gastos y
 * barra de acciones rápidas con microinteracciones táctiles.
 */
export function TotalDelMes({
  currentMonth,
  totalCents,
  ingresosCents,
  conteo,
  onSalir,
}: {
  currentMonth: string;
  totalCents: number;
  ingresosCents: number;
  conteo: number;
  /** Ausente en modo local: no hay sesión de la que salir. */
  onSalir?: (() => void) | undefined;
}) {
  const balance = ingresosCents - totalCents;
  const esPositivo = balance >= 0;

  return (
    <Animated.View
      entering={FadeInDown.duration(450).springify()}
      style={{
        paddingBottom: 16,
      }}
    >
      {/* Hero Card Fintech */}
      <View
        style={{
          marginHorizontal: 16,
          marginTop: 8,
          marginBottom: 16,
          padding: 20,
          borderRadius: 24,
          backgroundColor: colores.tarjetaHero,
          borderWidth: 1,
          borderColor: colores.tarjetaHeroBorde,
          ...colores.sombraTarjeta,
          gap: 16,
        }}
      >
        {/* Fila superior: Mes y botón Salir */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: esPositivo ? '#10B981' : '#F43F5E',
              }}
            />
            <GTexto
              variante="eyebrow"
              color={colores.tarjetaHeroSubtexto}
              style={{ textTransform: 'uppercase', letterSpacing: 0.8 }}
            >
              {`Balance de ${formatMonthName(currentMonth)}`}
            </GTexto>
          </View>

          {onSalir ? (
            <GAnimatedPressable
              testID="btn-salir"
              accessibilityRole="button"
              accessibilityLabel="Cerrar sesión"
              onPress={onSalir}
              style={{
                minHeight: 36,
                paddingHorizontal: 12,
                borderRadius: 999,
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <GTexto variante="caption" color={colores.tarjetaHeroTexto} style={{ fontWeight: '600' }}>
                Salir
              </GTexto>
            </GAnimatedPressable>
          ) : null}
        </View>

        {/* Monto del Balance Principal */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'baseline',
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          <GTexto
            variante="total"
            color={esPositivo ? '#10B981' : '#F43F5E'}
            testID="balance-mes"
            style={{ fontWeight: '800', letterSpacing: -0.5 }}
          >
            {formatMoney(balance)}
          </GTexto>
          <GTexto
            variante="caption"
            color={colores.tarjetaHeroSubtexto}
            style={{ fontWeight: '600', letterSpacing: 1 }}
          >
            MXN
          </GTexto>
        </View>

        {/* Cajas de Desglose: Gastos e Ingresos */}
        <View
          style={{
            flexDirection: 'row',
            gap: 10,
            paddingTop: 4,
          }}
        >
          {/* Bloque Gastos */}
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(255, 255, 255, 0.06)',
              borderRadius: 16,
              paddingVertical: 10,
              paddingHorizontal: 12,
              gap: 2,
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.06)',
            }}
          >
            <GTexto variante="caption" color={colores.tarjetaHeroSubtexto} style={{ fontSize: 11 }}>
              Gastos
            </GTexto>
            <GTexto
              variante="label"
              color="#F87171"
              testID="total-mes"
              style={{ fontWeight: '700' }}
            >
              {formatMoney(totalCents)}
            </GTexto>
          </View>

          {/* Bloque Ingresos */}
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(255, 255, 255, 0.06)',
              borderRadius: 16,
              paddingVertical: 10,
              paddingHorizontal: 12,
              gap: 2,
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.06)',
            }}
          >
            <GTexto variante="caption" color={colores.tarjetaHeroSubtexto} style={{ fontSize: 11 }}>
              Ingresos
            </GTexto>
            <GTexto
              variante="label"
              color="#34D399"
              testID="total-ingresos-mes"
              style={{ fontWeight: '700' }}
            >
              {formatMoney(ingresosCents)}
            </GTexto>
          </View>
        </View>
      </View>

      {/* Carrusel horizontal de Acciones Rápidas */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 16,
          gap: 8,
          alignItems: 'center',
        }}
      >
        <PastillaAnimada
          href="/ingreso"
          testID="btn-agregar-ingreso"
          etiqueta="+ Ingreso"
          accessibilityLabel="Registrar ingreso"
          color={colores.positivo}
          fondo={colores.positivoSuave}
        />

        <PastillaAnimada
          href="/recurrentes"
          testID="btn-recurrentes"
          etiqueta="Recurrentes"
          accessibilityLabel="Ver movimientos recurrentes"
          color={colores.acento}
          fondo={colores.acentoSuave}
        />

        <PastillaAnimada
          href="/reportes"
          testID="btn-reportes"
          etiqueta="Reportes"
          accessibilityLabel="Ver reportes"
          color={colores.acento}
          fondo={colores.acentoSuave}
        />

        <PastillaAnimada
          href="/cuentas"
          testID="btn-cuentas"
          etiqueta="Cuentas"
          accessibilityLabel="Administrar cuentas"
          color={colores.acento}
          fondo={colores.acentoSuave}
        />

        <PastillaAnimada
          href="/metas"
          testID="btn-metas"
          etiqueta="Metas"
          accessibilityLabel="Ver metas de ahorro"
          color={colores.acento}
          fondo={colores.acentoSuave}
        />

        <PastillaAnimada
          href="/escanear"
          testID="btn-escanear-recibo"
          etiqueta="Escanear"
          accessibilityLabel="Escanear recibo con OCR"
          color={colores.acento}
          fondo={colores.acentoSuave}
        />
      </ScrollView>

      {/* Contador de Gastos del Mes */}
      <View style={{ paddingHorizontal: 20, paddingTop: 14 }}>
        <GTexto variante="caption" color={colores.textoSecundario} style={{ fontWeight: '500' }}>
          {conteo === 1 ? '1 gasto registrado' : `${conteo} gastos registrados`}
        </GTexto>
      </View>
    </Animated.View>
  );
}

/** Enlace en forma de pastilla interactiva con micro-escalado suave al tocar */
function PastillaAnimada({
  href,
  testID,
  etiqueta,
  accessibilityLabel,
  color,
  fondo,
}: {
  href: string;
  testID: string;
  etiqueta: string;
  accessibilityLabel: string;
  color: string;
  fondo: string;
}) {
  return (
    <Link href={href} asChild>
      <GAnimatedPressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        scaleTarget={0.93}
        style={{
          minHeight: 40,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 16,
          borderRadius: 999,
          backgroundColor: fondo,
          borderWidth: 1,
          borderColor: `${color}33`,
        }}
      >
        <GTexto variante="caption" color={color} style={{ fontWeight: '700' }}>
          {etiqueta}
        </GTexto>
      </GAnimatedPressable>
    </Link>
  );
}
