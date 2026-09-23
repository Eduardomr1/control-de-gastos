import { View } from 'react-native';

import { formatMoney } from '@/shared/lib/money';
import { colores } from '@/shared/theme/colores';
import { GTexto } from '@/shared/ui';

import { fraccionUsada } from '../progreso';

/**
 * Una categoría con su límite y lo que va gastado.
 *
 * El relleno se topa al 100% pero el texto no: rebasar se anuncia con el monto
 * y con el color, no dejando que la barra se salga de la tarjeta. Quien va en
 * 140% necesita ver cuánto se pasó, y una barra que sobresale no lo dice.
 */
export function BarraDePresupuesto({
  nombre,
  gastadoCents,
  limiteCents,
}: {
  nombre: string;
  gastadoCents: number;
  limiteCents: number;
}) {
  const fraccion = fraccionUsada(gastadoCents, limiteCents);
  const porcentaje = Math.min(fraccion, 1) * 100;
  const color =
    fraccion >= 1 ? colores.error : fraccion >= 0.8 ? '#D97706' : colores.acento;

  return (
    <View style={{ gap: 6 }} testID={`presupuesto-${nombre.toLowerCase()}`}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <GTexto variante="caption" color={colores.texto} style={{ fontWeight: '600' }}>
          {nombre}
        </GTexto>
        <GTexto variante="caption" color={color}>
          {`${formatMoney(gastadoCents)} de ${formatMoney(limiteCents)}`}
        </GTexto>
      </View>

      {/* minHeight y no height: la regla de lint lo exige, y con razón — una
          altura fija recorta contenido al ampliar la fuente (BUG-005). Aquí no
          hay texto dentro, pero la regla no distingue y tampoco debería. */}
      <View
        style={{
          minHeight: 8,
          borderRadius: 999,
          backgroundColor: colores.borde,
          overflow: 'hidden',
        }}
        accessibilityRole="progressbar"
        accessibilityLabel={`${nombre}: ${formatMoney(gastadoCents)} de ${formatMoney(limiteCents)}`}
        accessibilityValue={{ min: 0, max: limiteCents, now: gastadoCents }}
      >
        <View
          style={{
            width: `${porcentaje}%`,
            minHeight: 8,
            borderRadius: 999,
            backgroundColor: color,
          }}
        />
      </View>
    </View>
  );
}
