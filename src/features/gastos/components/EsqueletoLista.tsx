import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { rowMinHeight } from '@/shared/theme/tipografia';

export function EsqueletoLista() {
  return (
    <SafeAreaView
      style={{ flex: 1, padding: 16, backgroundColor: '#FFFFFF' }}
      testID="skeleton-lista"
    >
      {[0, 1, 2, 3].map((i) => (
        <View
          key={i}
          style={{
            minHeight: rowMinHeight(),
            marginBottom: 12,
            borderRadius: 8,
            backgroundColor: '#E5E7EB',
          }}
        />
      ))}
    </SafeAreaView>
  );
}
