import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { esFailure } from '@/shared/errors';
import { colores } from '@/shared/theme/colores';
import { scaledSize } from '@/shared/theme/tipografia';
import { GBoton, GCampo, GTexto } from '@/shared/ui';
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
        paddingHorizontal: 28,
        justifyContent: 'center',
        gap: 28,
        // ponytail: paleta clara fija. Sin color explicito, el tema oscuro del
        // sistema deja texto negro sobre fondo oscuro y la pantalla se ve vacia.
        backgroundColor: colores.fondo,
      }}
      testID="screen-login"
    >
      <View style={{ gap: 8 }}>
        <Marca />
        <GTexto variante="tituloPantalla">Gastos</GTexto>
        <GTexto variante="body" color={colores.textoSecundario}>
          Tu dinero, en orden.
        </GTexto>
      </View>

      <View style={{ gap: 18 }}>
        <GCampo
          testID="input-email"
          etiqueta="Correo"
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
          etiqueta="Contraseña"
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          secureTextEntry
          autoComplete="password"
          accessibilityLabel="Contraseña"
          error={error ?? undefined}
        />
      </View>

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

/**
 * Marca de la app: anillo de acento con punto al centro. Escala con la fuente
 * y con tope, para no quedar como un punto perdido junto al título a 300%.
 */
function Marca() {
  const anillo = scaledSize(40, 1.5);
  const punto = scaledSize(12, 1.5);
  return (
    <View
      accessible={false}
      style={{
        width: anillo,
        height: anillo,
        borderRadius: 999,
        borderWidth: 2,
        borderColor: colores.acento,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
      }}
    >
      <View
        style={{
          width: punto,
          height: punto,
          borderRadius: 999,
          backgroundColor: colores.acento,
        }}
      />
    </View>
  );
}
