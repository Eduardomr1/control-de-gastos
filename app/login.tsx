import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { signIn } from '@/lib/auth';
import { typography } from '@/lib/typography';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit() {
    setBusy(true);
    setError(null);
    try {
      await signIn(email.trim(), password);
      router.replace('/');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo iniciar sesión');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView
      style={{
        flex: 1,
        padding: 24,
        gap: 16,
        justifyContent: 'center',
        // ponytail: paleta clara fija. Sin color explicito, el tema oscuro del
        // sistema deja texto negro sobre fondo oscuro y la pantalla se ve vacia.
        backgroundColor: '#FFFFFF',
      }}
      testID="screen-login"
    >
      <Text style={{ ...typography.amount(), color: '#0B0F14' }}>Gastos</Text>

      <TextInput
        testID="input-email"
        value={email}
        onChangeText={setEmail}
        placeholder="correo@ejemplo.mx"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        accessibilityLabel="Correo electrónico"
        placeholderTextColor="#6B7280"
        style={campo(Boolean(error))}
      />

      <TextInput
        testID="input-password"
        value={password}
        onChangeText={setPassword}
        placeholder="Contraseña"
        secureTextEntry
        autoComplete="password"
        accessibilityLabel="Contraseña"
        placeholderTextColor="#6B7280"
        style={campo(Boolean(error))}
      />

      {error ? (
        <Text testID="error-login" style={{ ...typography.caption(), color: '#DC2626' }}>
          {error}
        </Text>
      ) : null}

      <Pressable
        testID="btn-login"
        accessibilityRole="button"
        accessibilityLabel="Iniciar sesión"
        disabled={busy || !email || !password}
        onPress={onSubmit}
        style={{
          minHeight: 56,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 8,
          backgroundColor: busy || !email || !password ? '#93C5FD' : '#2563EB',
        }}
      >
        <Text style={{ ...typography.label(), color: '#fff' }}>
          {busy ? 'Entrando…' : 'Entrar'}
        </Text>
      </Pressable>
    </SafeAreaView>
  );
}

function campo(hasError: boolean) {
  return {
    // minHeight, nunca height. Ver BUG-005.
    minHeight: 56,
    borderWidth: 1,
    borderColor: hasError ? '#DC2626' : '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    color: '#0B0F14',
    ...typography.label(),
  };
}
