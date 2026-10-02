/**
 * Barrel del feature. Única puerta de salida: nada de `api/` ni `store/` sale
 * de aquí (Regla 4).
 */

export { MetasScreen } from './screens/MetasScreen';
export { limpiarMetas } from './api/metas.local';
export type { Meta } from './types';
