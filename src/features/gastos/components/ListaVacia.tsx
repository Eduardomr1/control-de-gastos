import { View } from 'react-native';

import { colores } from '@/shared/theme/colores';
import { scaledSize } from '@/shared/theme/tipografia';
import { GTexto } from '@/shared/ui';

export function ListaVacia({ mes }: { mes: string }) {
  const circulo = scaledSize(64, 1.5);
  return (
    <View
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        gap: 14,
        paddingHorizontal: 40,
        paddingVertical: 48,
      }}
      testID="lista-vacia"
    >
      <View
        accessible={false}
        style={{
          width: circulo,
          height: circulo,
          borderRadius: 999,
          borderWidth: 1,
          borderStyle: 'dashed',
          borderColor: '#C7C7CC',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 6,
        }}
      >
        {/* Escala con su círculo y con el mismo tope, no por su cuenta. */}
        <GTexto
          color="#C7C7CC"
          style={{ fontSize: scaledSize(26, 1.5), lineHeight: scaledSize(30, 1.5) }}
        >
          +
        </GTexto>
      </View>

      <GTexto variante="titulo" style={{ textAlign: 'center' }}>
        {`Aún no registras gastos en ${mes}.`}
      </GTexto>
      <GTexto
        variante="body"
        color={colores.textoSecundario}
        style={{ textAlign: 'center' }}
      >
        Cuando lo hagas, los verás aquí agrupados por mes.
      </GTexto>
    </View>
  );
}
