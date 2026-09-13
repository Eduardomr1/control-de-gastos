import { TextInput, View, type TextInputProps } from 'react-native';

import { colores } from '@/shared/theme/colores';
import { GTexto } from './GTexto';

interface GCampoProps extends TextInputProps {
  /** Mensaje de error. Su sola presencia pinta el borde en rojo. */
  error?: string;
}

/** Campo de texto con estado de error y color de placeholder del tema. */
export function GCampo({ error, style, ...props }: GCampoProps) {
  return (
    <View>
      <TextInput
        placeholderTextColor={colores.textoSecundario}
        style={[
          {
            minHeight: 44,
            borderWidth: 1,
            borderColor: error ? colores.error : colores.borde,
            borderRadius: 8,
            paddingHorizontal: 12,
            color: colores.texto,
          },
          style,
        ]}
        {...props}
      />
      {error ? (
        <GTexto variante="caption" color={colores.error}>
          {error}
        </GTexto>
      ) : null}
    </View>
  );
}
