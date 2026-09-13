/**
 * Barrel del feature. Única puerta de salida: nada de `api/` ni `store/` sale
 * de aquí (Regla 4). El resto de la app —incluida `src/lib/auth.ts`, que se
 * mudará a `features/auth/` en la Fase 4— consume el feature solo por esto.
 */

export { ListaScreen } from './screens/ListaScreen';
export { AgregarScreen } from './screens/AgregarScreen';
export { useGastos } from './hooks/useGastos';
export { useCrearGasto } from './hooks/useCrearGasto';
export { isRemote } from './api';
export { limpiarAlCerrarSesion } from './limpiarAlCerrarSesion';
