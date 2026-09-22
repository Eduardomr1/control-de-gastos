/**
 * Barrel del feature. Única puerta de salida: nada de `api/` ni `store/` sale
 * de aquí (Regla 4).
 */

export { AgregarIngresoScreen } from './screens/AgregarIngresoScreen';
export { useIngresos } from './hooks/useIngresos';
export { limpiarIngresos } from './api/ingresos.local';
export type { Income } from './types';
