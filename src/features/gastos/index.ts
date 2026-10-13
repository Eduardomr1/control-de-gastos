/**
 * Barrel del feature. Única puerta de salida: nada de `api/` ni `store/` sale
 * de aquí (Regla 4).
 */

export { ListaScreen, extractGastoKey } from './screens/ListaScreen';
export { AgregarScreen } from './screens/AgregarScreen';
export { useGastos } from './hooks/useGastos';
export { useCrearGasto } from './hooks/useCrearGasto';
export { limpiarAlCerrarSesion } from './limpiarAlCerrarSesion';
export { validarEntradaGasto } from './validacion';
export type { ValidacionGastoInput, GastoPayloadValidado } from './validacion';
export { HeaderColapsable } from './components/HeaderColapsable';
export { TotalDelMes } from './components/TotalDelMes';
export { FilaGasto, areFilaGastoPropsEqual } from './components/FilaGasto';
export type { FilaGastoProps } from './components/FilaGasto';
export { calcularMetricasDashboard } from './balance';
export type { MetricasDashboard } from './balance';
export {
  determinarDireccionSwipe,
  calcularDesplazamientoSwipe,
  calcularEstadoSwipe,
  calcularFeedbackVisualSwipe,
  resolverReleaseSwipe,
  generarA11yAccionSwipe,
  CONFIG_SWIPE_PREDETERMINADA,
} from './swipe';
export type {
  ConfiguracionSwipe,
  DireccionSwipe,
  TipoAccionSwipe,
  EstadoSwipe,
  FeedbackVisualSwipe,
  DecisionReleaseSwipe,
} from './swipe';
export { createExpense as crearGasto, fetchExpenses as obtenerGastos } from './api';

