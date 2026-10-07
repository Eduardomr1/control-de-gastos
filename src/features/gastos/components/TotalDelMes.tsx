import { Link } from 'expo-router';
import { Pressable, View } from 'react-native';

import { formatMonthName } from '@/shared/lib/date';
import { formatMoney } from '@/shared/lib/money';
import { colores } from '@/shared/theme/colores';
import { GTexto } from '@/shared/ui';

/**
 * Encabezado de la lista: balance del mes arriba, y debajo las dos mitades que
 * lo forman.
 *
 * El protagonista es el balance y no el gasto acumulado, porque es el número
 * que responde la pregunta que trae el usuario ("¿cómo voy este mes?"). El
 * gasto sigue visible con su propio `testID`: es el dato que verifican los
 * flujos E2E, y ninguno tuvo que cambiar por este rediseño.
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

  return (
    <View
      style={{
        paddingHorizontal: 20,
        paddingBottom: 16,
        gap: 4,
        borderBottomWidth: 1,
        borderBottomColor: colores.borde,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <GTexto variante="eyebrow" color={colores.textoSecundario}>
          {`Balance de ${formatMonthName(currentMonth)}`}
        </GTexto>
        {onSalir ? (
          <Pressable
            testID="btn-salir"
            accessibilityRole="button"
            accessibilityLabel="Cerrar sesión"
            onPress={onSalir}
            // 44pt es el minimo tactil de Apple y Material.
            style={{ minHeight: 44, minWidth: 44, justifyContent: 'center' }}
          >
            <GTexto variante="caption" color={colores.acento}>
              Salir
            </GTexto>
          </Pressable>
        ) : null}
      </View>

      {/* flexWrap: a escala de fuente grande el monto y la divisa se acomodan
          en dos renglones en vez de recortarse. */}
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
          // Un balance negativo se muestra en rojo y con su signo, no en valor
          // absoluto: gastar más de lo que entró es exactamente el dato que la
          // pantalla existe para dar.
          color={balance < 0 ? colores.error : colores.positivo}
          testID="balance-mes"
        >
          {formatMoney(balance)}
        </GTexto>
        <GTexto variante="caption" color={colores.textoSecundario}>
          MXN
        </GTexto>
      </View>

      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 16,
          paddingTop: 8,
        }}
      >
        <View style={{ gap: 2 }}>
          <GTexto variante="caption" color={colores.textoSecundario}>
            Gastos
          </GTexto>
          <GTexto variante="label" color={colores.texto} testID="total-mes">
            {formatMoney(totalCents)}
          </GTexto>
        </View>

        <View style={{ gap: 2 }}>
          <GTexto variante="caption" color={colores.textoSecundario}>
            Ingresos
          </GTexto>
          <GTexto variante="label" color={colores.positivo} testID="total-ingresos-mes">
            {formatMoney(ingresosCents)}
          </GTexto>
        </View>

        {/* El FAB se queda para el gasto, que es la acción frecuente; el
            ingreso se registra dos o tres veces al mes y no merece competir
            por el pulgar. Aquí está donde el usuario ya vino a mirarlo. */}
        <Pastilla
          href="/ingreso"
          testID="btn-agregar-ingreso"
          etiqueta="+ Ingreso"
          accessibilityLabel="Registrar ingreso"
          color={colores.positivo}
        />

        <Pastilla
          href="/recurrentes"
          testID="btn-recurrentes"
          etiqueta="Recurrentes"
          accessibilityLabel="Ver movimientos recurrentes"
          color={colores.acento}
        />

        <Pastilla
          href="/reportes"
          testID="btn-reportes"
          etiqueta="Reportes"
          accessibilityLabel="Ver reportes"
          color={colores.acento}
        />

        {/* Siempre visible, aunque las tarjetas de saldo no se dibujen: con
            una sola cuenta, el boton "Administrar" de esas tarjetas no existe,
            y sin este no habria por donde crear la segunda. */}
        <Pastilla
          href="/cuentas"
          testID="btn-cuentas"
          etiqueta="Cuentas"
          accessibilityLabel="Administrar cuentas"
          color={colores.acento}
        />

        <Pastilla
          href="/metas"
          testID="btn-metas"
          etiqueta="Metas"
          accessibilityLabel="Ver metas de ahorro"
          color={colores.acento}
        />

        <Pastilla
          href="/escanear"
          testID="btn-escanear-recibo"
          etiqueta="Escanear"
          accessibilityLabel="Escanear recibo con OCR"
          color={colores.acento}
        />
      </View>

      <GTexto variante="caption" color={colores.textoSecundario} style={{ paddingTop: 8 }}>
        {conteo === 1 ? '1 gasto registrado' : `${conteo} gastos registrados`}
      </GTexto>
    </View>
  );
}

/** Enlace en forma de pastilla. Cinco iguales seguidas pedían un solo molde. */
function Pastilla({
  href,
  testID,
  etiqueta,
  accessibilityLabel,
  color,
}: {
  href: string;
  testID: string;
  etiqueta: string;
  accessibilityLabel: string;
  color: string;
}) {
  return (
    <Link href={href} asChild>
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={{
          minHeight: 44,
          justifyContent: 'center',
          paddingHorizontal: 14,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: color,
        }}
      >
        <GTexto variante="caption" color={color} style={{ fontWeight: '600' }}>
          {etiqueta}
        </GTexto>
      </Pressable>
    </Link>
  );
}
