/**
 * Barrel del feature. Única puerta de salida: nada de `api/` ni `store/` sale
 * de aquí (Regla 4).
 */

export { MetasScreen } from './screens/MetasScreen';
export { limpiarMetas } from './api/metas.local';
export type { Meta } from './types';
export {
  calcularAporteMensualRequerido,
  calcularHitosAhorro,
  calcularVelocidadRecuperacion,
  optimizarDistribucionExcedente,
} from './savingsGoalEngine';
export type {
  PrioridadMeta,
  ParametrosCalculoMeta,
  ProyeccionMetaAhorro,
  HitoAhorro,
  ParametrosRecuperacionMeta,
  ResultadoRecuperacion,
  ItemMetaParaAsignacion,
  AsignacionMeta,
  PlanDistribucionMetas,
} from './savingsGoalEngine';
