import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, router, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';

import { useSession } from '@/lib/auth';
import { isRemote } from '@/lib/repository';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Los datos siguen siendo útiles offline: no se descartan al perder red.
      staleTime: 1000 * 60,
      gcTime: 1000 * 60 * 60 * 24,
      retry: 3,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30_000),
    },
  },
});

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="auto" />
      <AuthGate />
    </QueryClientProvider>
  );
}

/**
 * Redirige a login cuando no hay sesión. Sin backend configurado no hay nada
 * que autenticar, así que la app corre directo contra el repositorio local.
 */
function AuthGate() {
  const { userId, loading } = useSession();
  const segments = useSegments();

  useEffect(() => {
    if (!isRemote || loading) return;

    const inLogin = segments[0] === 'login';
    if (!userId && !inLogin) router.replace('/login');
    if (userId && inLogin) router.replace('/');
  }, [userId, loading, segments]);

  // Carga Verdadera: nada se renderiza hasta saber si hay sesión, para no
  // mostrar la lista un instante y arrancarla de golpe.
  if (isRemote && loading) return <View style={{ flex: 1 }} testID="skeleton-sesion" />;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="login" />
      <Stack.Screen name="add" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
