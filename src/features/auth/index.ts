/**
 * Barrel del feature. Única puerta de salida: `signIn` no sale de aquí —solo
 * lo usa `LoginScreen`, dentro del feature—, pero `signOut` sí, porque
 * `ListaScreen` (en gastos) lo necesita para el botón "Salir".
 */
export { LoginScreen } from './screens/LoginScreen';
export { useSession } from './hooks/useSession';
export { signOut } from './api/auth.remote';
