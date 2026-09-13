import { router } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { esFailure } from '@/shared/errors';
import { colores } from '@/shared/theme/colores';
import { typography } from '@/shared/theme/tipografia';
import { GBoton, GCampo } from '@/shared/ui';
import { signIn } from '../api/auth.remote';

/** Failure → copy visible. Único lugar que traduce el tipo a texto de UI. */
function copiaLogin(e: unknown): string {
  if (!esFailure(e)) return 'No se pudo iniciar sesión. Revisa tu conexión.';
  switch (e.tipo) {
    case 'DatosInvalidos':
      return e.motivo === 'cuenta_no_confirmada'
        ? 'La cuenta aún no está confirmada'
        : 'Correo o contraseña incorrectos';
    case 'SinRed':
      return 'Sin conexión. Revisa tu red e intenta de nuevo.';
    default:
      return 'No se pudo iniciar sesión. Revisa tu conexión.';
  }
}

export function LoginScreen() {
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
      setError(copiaLogin(e));
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
        backgroundColor: colores.fondo,
      }}
      testID="screen-login"
    >
      <Text style={{ ...typography.amount(), color: colores.texto }}>Gastos</Text>

      <GCampo
        testID="input-email"
        value={email}
        onChangeText={setEmail}
        placeholder="correo@ejemplo.mx"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        accessibilityLabel="Correo electrónico"
      />

      <GCampo
        testID="input-password"
        value={password}
        onChangeText={setPassword}
        placeholder="Contraseña"
        secureTextEntry
        autoComplete="password"
        accessibilityLabel="Contraseña"
        error={error ?? undefined}
      />

      <GBoton
        testID="btn-login"
        label={busy ? 'Entrando…' : 'Entrar'}
        disabled={!email || !password}
        busy={busy}
        onPress={onSubmit}
        accessibilityLabel="Iniciar sesión"
      />
    </SafeAreaView>
  );
}
