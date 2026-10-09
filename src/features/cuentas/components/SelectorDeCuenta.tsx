import { View } from 'react-native';

import { colores } from '@/shared/theme/colores';
import { GAnimatedPressable, GTexto } from '@/shared/ui';

import type { Cuenta } from '../types';

/**
 * Elige la cuenta de un movimiento.
 *
 * No se dibuja con una sola cuenta: mientras el usuario no cree la segunda,
 * "General" es la única respuesta posible y un selector con una opción es un
 * control que solo puede confirmar lo obvio. La cuenta se sigue guardando; lo
 * que se oculta es la pregunta.
 *
 * Presentacional: recibe las cuentas en vez de pedirlas, para que la pantalla
 * que lo monta meta esa consulta en su propio `GAsyncGate` (BUG-006).
 */
export function SelectorDeCuenta({
  cuentas,
  seleccionada,
  onSeleccionar,
}: {
  cuentas: readonly Cuenta[];
  seleccionada: string | undefined;
  onSeleccionar: (cuentaId: string) => void;
}) {
  if (cuentas.length < 2) return null;

  return (
    <View style={{ gap: 12 }} testID="selector-cuenta">
      <GTexto variante="eyebrow" color={colores.textoSecundario}>
        Cuenta
      </GTexto>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {cuentas.map((cuenta) => {
          const activa = cuenta.id === seleccionada;
          return (
            <GAnimatedPressable
              key={cuenta.id}
              testID={`cuenta-${cuenta.id}`}
              accessibilityRole="radio"
              accessibilityLabel={cuenta.nombre}
              accessibilityState={{ selected: activa }}
              onPress={() => onSeleccionar(cuenta.id)}
              scaleTarget={0.94}
              style={{
                minHeight: 48,
                justifyContent: 'center',
                paddingHorizontal: 16,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: activa ? colores.acento : colores.borde,
                backgroundColor: activa ? colores.acento : colores.superficie,
              }}
            >
              <GTexto
                color={activa ? colores.sobreAcento : colores.texto}
                style={{ fontWeight: '600' }}
              >
                {cuenta.nombre}
              </GTexto>
            </GAnimatedPressable>
          );
        })}
      </View>
    </View>
  );
}
