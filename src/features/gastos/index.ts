/**
 * Barrel del feature. Única puerta de salida: nada de `api/` ni `store/` sale
 * de aquí (Regla 4).
 */

export { ListaScreen } from './screens/ListaScreen';
export { AgregarScreen } from './screens/AgregarScreen';
export { useGastos } from './hooks/useGastos';
export { useCrearGasto } from './hooks/useCrearGasto';
export { limpiarAlCerrarSesion } from './limpiarAlCerrarSesion';
// Lo usa el generador de recurrentes: un cobro vencido tiene que entrar por la
// misma puerta que un gasto capturado a mano, no por una propia.
export { createExpense as crearGasto, fetchExpenses as obtenerGastos } from './api';
