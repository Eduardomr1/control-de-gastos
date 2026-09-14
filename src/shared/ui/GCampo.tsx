import { useState } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';

import { colores } from '@/shared/theme/colores';
import { scaledSize, typography } from '@/shared/theme/tipografia';
import { GTexto } from './GTexto';

interface GCampoProps extends TextInputProps {
  /** Versalita sobre el campo. Ausente, el campo va sin encabezado. */
  etiqueta?: string;
  /** Mensaje de error. Su sola presencia pinta el borde en rojo. */
  error?: string | undefined;
}

/** Campo de texto con etiqueta, estado de foco y estado de error. */
export function GCampo({ etiqueta, error, style, onFocus, onBlur, ...props }: GCampoProps) {
  const [enfocado, setEnfocado] = useState(false);

  const borde = error ? colores.error : enfocado ? colores.acento : colores.borde;

  return (
    <View style={{ gap: 8 }}>
      {etiqueta ? (
        <GTexto variante="eyebrow" color={colores.textoSecundario}>
          {etiqueta}
        </GTexto>
      ) : null}

      <TextInput
        placeholderTextColor={colores.textoSecundario}
        onFocus={(e) => {
          setEnfocado(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setEnfocado(false);
          onBlur?.(e);
        }}
        style={[
          {
            // minHeight, nunca height: la altura fija recorta el texto al
            // ampliar la fuente. Ver BUG-005.
            minHeight: scaledSize(50),
            borderWidth: 1,
            borderColor: borde,
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 12,
            backgroundColor: colores.superficie,
            color: colores.texto,
            ...typography.label(),
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
