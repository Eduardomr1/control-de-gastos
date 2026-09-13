import { Pressable, type PressableProps } from 'react-native';

import { colores } from '@/shared/theme/colores';
import { controlSize } from '@/shared/theme/tipografia';
import { GTexto } from './GTexto';

interface GBotonProps extends Omit<PressableProps, 'style' | 'children'> {
  label: string;
  /** Deshabilita el botón y lo pinta con el tono de "en curso". */
  busy?: boolean;
}

/**
 * Botón con el mínimo táctil de 44pt garantizado y un único estado ocupado.
 * Una acción por instancia: si una pantalla necesita dos botones, son dos
 * `GBoton`, no una prop de lista de acciones.
 */
export function GBoton({ label, busy = false, disabled, onPress, ...props }: GBotonProps) {
  const inactivo = Boolean(busy || disabled);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inactivo, busy }}
      disabled={inactivo}
      onPress={onPress}
      style={{
        minHeight: controlSize(44),
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
        paddingHorizontal: 16,
        backgroundColor: inactivo ? colores.acentoDeshabilitado : colores.acento,
      }}
      {...props}
    >
      <GTexto variante="label" color={colores.fondo}>
        {label}
      </GTexto>
    </Pressable>
  );
}
