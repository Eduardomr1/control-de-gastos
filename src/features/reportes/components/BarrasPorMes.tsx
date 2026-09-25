import { Pressable, View } from 'react-native';

import { formatMonthKey, formatMonthName, type MonthKey } from '@/shared/lib/date';
import { formatMoney } from '@/shared/lib/money';
import { colores } from '@/shared/theme/colores';
import { scaledSize } from '@/shared/theme/tipografia';
import { GTexto } from '@/shared/ui';

import type { BarraDeMes } from '../agregados';

/**
 * Comparativo mes a mes, y a la vez el selector de periodo.
 *
 * Barras horizontales y con `View`, sin SVG: una barra es un rectángulo de
 * ancho porcentual, y eso es exactamente lo que ya sabe hacer el layout. El
 * SVG del anillo existe porque un arco no se puede dibujar con cajas; una
 * barra sí.
 *
 * Horizontales y no verticales: la etiqueta del mes cabe completa al lado, y
 * al ampliar la fuente la barra se estira en lugar de aplastar el texto.
 *
 * Toda la lista se dibuja junta —no una barra por componente— porque el ancho
 * de cada una es relativo al mes más alto del conjunto. Una barra que no
 * conoce a sus vecinas siempre se pinta al 100%, y el comparativo deja de
 * comparar.
 */
export function BarrasPorMes({
  barras,
  seleccionado,
  onSeleccionar,
}: {
  barras: readonly BarraDeMes[];
  seleccionado?: MonthKey;
  onSeleccionar?: (mes: MonthKey) => void;
}) {
  const maximo = Math.max(...barras.map((b) => b.totalCents), 1);

  return (
    <View style={{ gap: 4 }} testID="barras-por-mes">
      {barras.map((barra) => {
        const activo = barra.mes === seleccionado;
        return (
          <Pressable
            key={barra.mes}
            testID={`barra-${barra.mes}`}
            accessibilityRole={onSeleccionar ? 'radio' : 'progressbar'}
            accessibilityState={onSeleccionar ? { selected: activo } : undefined}
            accessibilityLabel={`${formatMonthKey(barra.mes)}: ${formatMoney(barra.totalCents)}`}
            onPress={onSeleccionar ? () => onSeleccionar(barra.mes) : undefined}
            style={{
              gap: 6,
              minHeight: 44,
              justifyContent: 'center',
              paddingVertical: 8,
              paddingHorizontal: 10,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: activo ? colores.borde : 'transparent',
              backgroundColor: activo ? colores.superficie : 'transparent',
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 8,
              }}
            >
              <GTexto
                variante="caption"
                color={colores.texto}
                style={activo ? { fontWeight: '700' } : undefined}
              >
                {formatMonthName(barra.mes)}
              </GTexto>
              <GTexto variante="caption" color={colores.textoSecundario}>
                {formatMoney(barra.totalCents)}
              </GTexto>
            </View>

            <View
              style={{
                minHeight: scaledSize(10, 1.5),
                borderRadius: 999,
                backgroundColor: colores.borde,
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  // Relativo al mes más alto, no a un tope fijo: la comparación
                  // es entre meses, y con un tope absoluto todas las barras se
                  // verían igual de cortas en un periodo tranquilo.
                  width: `${(barra.totalCents / maximo) * 100}%`,
                  minHeight: scaledSize(10, 1.5),
                  borderRadius: 999,
                  backgroundColor: activo ? colores.acento : colores.acentoDeshabilitado,
                }}
              />
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
