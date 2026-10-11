import { calcularMetricasDashboard } from './balance';

describe('calcularMetricasDashboard', () => {
  it('calcula balance positivo cuando los ingresos superan los gastos', () => {
    const metricas = calcularMetricasDashboard(2000000, 1500000); // 20,000 MXN vs 15,000 MXN

    expect(metricas.balanceCents).toBe(500000);
    expect(metricas.esPositivo).toBe(true);
    expect(metricas.estadoFinanciero).toBe('positivo');
    expect(metricas.tasaAhorroBps).toBe(2500); // 25.00%
  });

  it('calcula balance negativo cuando los gastos superan los ingresos', () => {
    const metricas = calcularMetricasDashboard(1000000, 1200000); // 10,000 MXN vs 12,000 MXN

    expect(metricas.balanceCents).toBe(-200000);
    expect(metricas.esPositivo).toBe(false);
    expect(metricas.estadoFinanciero).toBe('negativo');
    expect(metricas.tasaAhorroBps).toBe(0);
  });

  it('calcula estado neutro cuando ingresos y gastos son exactamente iguales', () => {
    const metricas = calcularMetricasDashboard(850000, 850000);

    expect(metricas.balanceCents).toBe(0);
    expect(metricas.esPositivo).toBe(true);
    expect(metricas.estadoFinanciero).toBe('neutro');
    expect(metricas.tasaAhorroBps).toBe(0);
  });

  it('maneja con seguridad ingresos en cero sin dividir por cero', () => {
    const metricas = calcularMetricasDashboard(0, 50000);

    expect(metricas.balanceCents).toBe(-50000);
    expect(metricas.esPositivo).toBe(false);
    expect(metricas.estadoFinanciero).toBe('negativo');
    expect(metricas.tasaAhorroBps).toBe(0);
  });

  it('acota la tasa de ahorro a 10000 bps cuando no hay gastos', () => {
    const metricas = calcularMetricasDashboard(150000, 0);

    expect(metricas.balanceCents).toBe(150000);
    expect(metricas.tasaAhorroBps).toBe(10000); // 100.00%
  });
});
