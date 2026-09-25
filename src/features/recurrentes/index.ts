/**
 * Barrel del feature. Única puerta de salida: nada de `api/` ni `store/` sale
 * de aquí (Regla 4).
 */

export { RecurrentesScreen } from './screens/RecurrentesScreen';
export { useRecurrentes, useArranqueDeRecurrentes } from './hooks/useRecurrentes';
export { limpiarRecurrentes } from './api/recurrentes.local';
export type { Recurrente } from './types';
