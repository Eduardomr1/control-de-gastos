import { View } from 'react-native';

import { colores } from '@/shared/theme/colores';
import { scaledSize } from '@/shared/theme/tipografia';

import { GTexto } from './GTexto';

/**
 * Avance de una cantidad hacia una meta.
 *
 * Vive en `shared/ui` porque la usan dos features con lecturas opuestas:
 * pasarse del presupuesto es malo y pasarse de la meta de ahorro es bueno. Lo
 * que comparten no es el significado sino la geometría, y por eso el color y
 * los textos los decide quien la monta.
 *
 * El relleno se topa al 100% pero el texto no: rebasar se anuncia con el monto
 * y con el color, no dejando que la barra se salga de la tarjeta. Quien va en
 * 140% necesita ver cuánto se pasó, y una barra que sobresale no lo dice.
 */
export function GBarraDeProgreso({
  etiqueta,
  detalle,
  actualCents,
  objetivoCents,
  color,
  testID,
}: {
  etiqueta: string;
  /** Lo que se lee a la derecha, ej. "$410.00 de $500.00". */
  detalle: string;
  actualCents: number;
  objetivoCents: number;
  color: string;
  testID?: string;
}) {
  // Con objetivo en cero el progreso no existe, y dividir daría Infinity: la
  // barra saldría llena o en NaN según el orden de las operaciones.
  const fraccion = objetivoCents <= 0 ? 0 : actualCents / objetivoCents;
  const porcentaje = Math.min(Math.max(fraccion, 0), 1) * 100;

  return (
    <View style={{ gap: 6 }} {...(testID === undefined ? {} : { testID })}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <GTexto variante="caption" color={colores.texto} style={{ fontWeight: '600' }}>
          {etiqueta}
        </GTexto>
        <GTexto variante="caption" color={color}>
          {detalle}
        </GTexto>
      </View>

      {/* minHeight y no height: la regla de lint lo exige, y con razón — una
          altura fija recorta contenido al ampliar la fuente (BUG-005). Aquí no
          hay texto dentro, pero la regla no distingue y tampoco debería. */}
      <View
        style={{
          minHeight: scaledSize(8, 1.5),
          borderRadius: 999,
          backgroundColor: colores.borde,
          overflow: 'hidden',
        }}
        accessibilityRole="progressbar"
        accessibilityLabel={`${etiqueta}: ${detalle}`}
        accessibilityValue={{ min: 0, max: objetivoCents, now: actualCents }}
      >
        <View
          style={{
            width: `${porcentaje}%`,
            minHeight: scaledSize(8, 1.5),
            borderRadius: 999,
            backgroundColor: color,
          }}
        />
      </View>
    </View>
  );
}
