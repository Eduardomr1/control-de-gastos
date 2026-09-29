/**
 * Barrel del feature. Única puerta de salida: nada de `api/` ni `store/` sale
 * de aquí (Regla 4).
 */

export { CuentasScreen } from './screens/CuentasScreen';
export { SelectorDeCuenta } from './components/SelectorDeCuenta';
export { TarjetasDeSaldo } from './components/TarjetasDeSaldo';
export { useCuentas } from './hooks/useCuentas';
export { saldosPorCuenta, saldoTotal } from './saldos';
export { limpiarCuentas } from './api/cuentas.local';
export { CUENTA_GENERAL } from './types';
export type { Cuenta, SaldoDeCuenta } from './types';
