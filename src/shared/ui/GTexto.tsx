import { Text, type TextProps } from 'react-native';

import { colores } from '@/shared/theme/colores';
import { typography } from '@/shared/theme/tipografia';

type Variante = keyof typeof typography;

/**
 * Texto con tokens de tipografía y color de tema. Nunca `fontSize` literal ni
 * color fuera de la paleta: así el escalado de fuente (Dynamic Type) y el
 * tema quedan garantizados en un solo lugar en vez de por convención.
 */
export function GTexto({
  variante = 'label',
  color = colores.texto,
  style,
  ...props
}: TextProps & { variante?: Variante; color?: string }) {
  return <Text style={[typography[variante](), { color }, style]} {...props} />;
}
