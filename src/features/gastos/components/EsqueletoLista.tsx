import { ActivityIndicator, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colores } from '@/shared/theme/colores';
import { scaledSize } from '@/shared/theme/tipografia';
import { GTexto } from '@/shared/ui';

/**
 * Pantalla de espera de la lista. Carga Verdadera: mientras esto se ve, no hay
 * ni una fila renderizada a medias detrás. Ver BUG-006.
 */
export function EsqueletoLista() {
  return (
    <SafeAreaView
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 20,
        backgroundColor: colores.fondo,
      }}
      testID="skeleton-lista"
    >
      <View
        style={{
          width: scaledSize(56, 1.5),
          height: scaledSize(56, 1.5),
          borderRadius: 999,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(93,63,211,0.16)',
        }}
      >
        <ActivityIndicator color={colores.acento} />
      </View>
      <GTexto variante="body" color={colores.textoSecundario}>
        Cargando tus gastos
      </GTexto>
    </SafeAreaView>
  );
}
