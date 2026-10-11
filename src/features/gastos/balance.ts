export interface MetricasDashboard {
  readonly balanceCents: number;
  readonly esPositivo: boolean;
  readonly estadoFinanciero: 'positivo' | 'neutro' | 'negativo';
  /**
   * Tasa de ahorro en puntos básicos (basis points, bps).
   * 100 bps = 1.00%. Entero puro sin punto flotante (BUG-001).
   * Rango: 0 a 10000 bps (0% a 100%).
   */
  readonly tasaAhorroBps: number;
}

/**
 * Calcula las métricas financieras clave del dashboard a partir de montos enteros en centavos.
 * Diseñado bajo arquitectura pura para desacoplar cálculos del renderizado UI.
 */
export function calcularMetricasDashboard(
  ingresosCents: number,
  gastosCents: number
): MetricasDashboard {
  const balanceCents = ingresosCents - gastosCents;
  const esPositivo = balanceCents >= 0;

  let estadoFinanciero: 'positivo' | 'neutro' | 'negativo' = 'neutro';
  if (balanceCents > 0) estadoFinanciero = 'positivo';
  else if (balanceCents < 0) estadoFinanciero = 'negativo';

  // Si no hay ingresos, la tasa de ahorro es 0 bps
  let tasaAhorroBps = 0;
  if (ingresosCents > 0 && balanceCents > 0) {
    // Multiplicación previa por 10,000 para preservar precisión entera antes de la división
    tasaAhorroBps = Math.floor((balanceCents * 10000) / ingresosCents);
    if (tasaAhorroBps > 10000) tasaAhorroBps = 10000;
  }

  return {
    balanceCents,
    esPositivo,
    estadoFinanciero,
    tasaAhorroBps,
  };
}
