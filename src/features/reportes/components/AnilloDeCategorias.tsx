import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { formatMoney, sumCents } from '@/shared/lib/money';
import { colores } from '@/shared/theme/colores';
import { scaledSize } from '@/shared/theme/tipografia';
import { GTexto } from '@/shared/ui';

import type { TajadaDeCategoria } from '../agregados';
import { sectores } from '../donut';

const RADIO = 90;
const GROSOR = 34;

/**
 * Anillo de gasto por categoría, con el total en el centro y la leyenda
 * debajo.
 *
 * El anillo no escala con el ajuste de fuente y la leyenda sí: una gráfica que
 * crece al 310% no cabe en ninguna pantalla, y el dato ya está en la leyenda,
 * que es lo que un lector de pantalla lee de todos modos. El SVG se marca como
 * decorativo por eso mismo.
 */
export function AnilloDeCategorias({ tajadas }: { tajadas: readonly TajadaDeCategoria[] }) {
  const total = sumCents(tajadas.map((t) => t.totalCents));
  const arcos = sectores(
    tajadas.map((t) => ({ key: t.categoryId, valor: t.totalCents, color: t.color })),
    RADIO,
    GROSOR,
  );

  if (arcos.length === 0) {
    return (
      <GTexto variante="body" color={colores.textoSecundario} testID="reporte-sin-datos">
        Sin gastos en este mes.
      </GTexto>
    );
  }

  return (
    <View style={{ gap: 20 }} testID="anillo-categorias">
      <View style={{ alignItems: 'center', justifyContent: 'center' }}>
        <Svg
          width={RADIO * 2}
          height={RADIO * 2}
          viewBox={`0 0 ${RADIO * 2} ${RADIO * 2}`}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {arcos.map((sector) => (
            <Path key={sector.key} d={sector.d} fill={sector.color} />
          ))}
        </Svg>

        {/* Encima del agujero. `position: absolute` y no un <Text> de SVG: el
            texto de SVG no escala con Dynamic Type ni lo lee VoiceOver. */}
        <View style={{ position: 'absolute', alignItems: 'center' }}>
          <GTexto variante="caption" color={colores.textoSecundario}>
            Total
          </GTexto>
          <GTexto
            color={colores.texto}
            style={{ fontSize: scaledSize(18, 1.3), fontWeight: '700' }}
            testID="total-reporte"
          >
            {formatMoney(total)}
          </GTexto>
        </View>
      </View>

      <View style={{ gap: 10 }}>
        {tajadas.map((tajada) => (
          <View
            key={tajada.categoryId}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
            testID={`leyenda-${tajada.categoryId}`}
            accessibilityLabel={`${tajada.nombre}: ${formatMoney(tajada.totalCents)}, ${tajada.porcentaje} por ciento`}
          >
            <View
              style={{
                width: scaledSize(12, 1.5),
                minHeight: scaledSize(12, 1.5),
                borderRadius: 999,
                backgroundColor: tajada.color,
              }}
            />
            <GTexto variante="caption" style={{ flex: 1 }}>
              {tajada.nombre}
            </GTexto>
            <GTexto variante="caption" color={colores.textoSecundario}>
              {`${tajada.porcentaje}%`}
            </GTexto>
            <GTexto variante="label" style={{ fontWeight: '600' }}>
              {formatMoney(tajada.totalCents)}
            </GTexto>
          </View>
        ))}
      </View>
    </View>
  );
}
