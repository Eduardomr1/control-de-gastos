/**
 * Barrel del feature. Única puerta de salida: nada de `api/` ni `store/` sale
 * de aquí (Regla 4).
 */

export { ListaScreen } from './screens/ListaScreen';
export { AgregarScreen } from './screens/AgregarScreen';
export { useGastos } from './hooks/useGastos';
export { useCrearGasto } from './hooks/useCrearGasto';
export { limpiarAlCerrarSesion } from './limpiarAlCerrarSesion';
