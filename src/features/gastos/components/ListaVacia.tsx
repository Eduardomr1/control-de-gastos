import { Text, View } from 'react-native';

import { typography } from '@/shared/theme/tipografia';

export function ListaVacia() {
  return (
    <View style={{ padding: 32, alignItems: 'center' }}>
      <Text style={{ ...typography.label(), color: '#6B7280' }}>
        Aún no hay gastos este mes
      </Text>
    </View>
  );
}
