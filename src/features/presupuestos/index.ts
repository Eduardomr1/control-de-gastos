/**
 * Barrel del feature. Única puerta de salida: nada de `api/` ni `store/` sale
 * de aquí (Regla 4).
 */

export { PresupuestosScreen } from './screens/PresupuestosScreen';
export { ResumenDePresupuestos } from './components/ResumenDePresupuestos';
export { usePresupuestos } from './hooks/usePresupuestos';
export { avisoDeUmbral, type AvisoDePresupuesto } from './aviso';
export { limpiarPresupuestos } from './api/presupuestos.local';
export type { Presupuesto } from './types';
