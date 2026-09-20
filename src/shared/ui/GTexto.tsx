import { Text, type TextProps } from 'react-native';

import { colores } from '@/shared/theme/colores';
import { typography } from '@/shared/theme/tipografia';

type Variante = keyof typeof typography;

/**
 * Texto con tokens de tipografía y color de tema. Nunca `fontSize` literal ni
 * color fuera de la paleta: así el escalado de fuente (Dynamic Type) y el
 * tema quedan garantizados en un solo lugar en vez de por convención.
 *
 * `allowFontScaling={false}` NO desactiva Dynamic Type — lo contrario. El
 * tamaño que entrega `typography` ya viene multiplicado por
 * `PixelRatio.getFontScale()`, así que dejar el escalado automático de React
 * Native encendido lo aplicaría por segunda vez y anularía los topes, que la
 * segunda multiplicación no respeta. Ver BUG-017.
 */
export function GTexto({
  variante = 'label',
  color = colores.texto,
  style,
  ...props
}: TextProps & { variante?: Variante; color?: string }) {
  return (
    <Text
      allowFontScaling={false}
      style={[typography[variante](), { color }, style]}
      {...props}
    />
  );
}
