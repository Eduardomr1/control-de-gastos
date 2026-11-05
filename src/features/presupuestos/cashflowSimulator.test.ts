import { MoneyError } from '@/shared/lib/money';
import { simularRunwayMonteCarlo } from './cashflowSimulator';

describe('cashflowSimulator - simularRunwayMonteCarlo', () => {
  describe('validación de parámetros', () => {
    it('rechaza variabilidades porcentuales fuera del rango 0-100', () => {
      expect(() =>
        simularRunwayMonteCarlo({
          saldoInicialCents: 100000,
          ingresosMensualesEsperadosCents: 50000,
          variabilidadIngresosPorc: -5,
          gastosFijosMensualesCents: 20000,
          gastosVariablesPromedioCents: 10000,
          variabilidadGastosPorc: 20,
        })
      ).toThrow(MoneyError);

      expect(() =>
        simularRunwayMonteCarlo({
          saldoInicialCents: 100000,
          ingresosMensualesEsperadosCents: 50000,
          variabilidadIngresosPorc: 120,
          gastosFijosMensualesCents: 20000,
          gastosVariablesPromedioCents: 10000,
          variabilidadGastosPorc: 20,
        })
      ).toThrow(MoneyError);
    });

    it('rechaza horizonte de meses o iteraciones inválidas', () => {
      expect(() =>
        simularRunwayMonteCarlo({
          saldoInicialCents: 100000,
          ingresosMensualesEsperadosCents: 50000,
          variabilidadIngresosPorc: 10,
          gastosFijosMensualesCents: 20000,
          gastosVariablesPromedioCents: 10000,
          variabilidadGastosPorc: 20,
          numMeses: 0,
        })
      ).toThrow(MoneyError);

      expect(() =>
        simularRunwayMonteCarlo({
          saldoInicialCents: 100000,
          ingresosMensualesEsperadosCents: 50000,
          variabilidadIngresosPorc: 10,
          gastosFijosMensualesCents: 20000,
          gastosVariablesPromedioCents: 10000,
          variabilidadGastosPorc: 20,
          iteraciones: 5,
        })
      ).toThrow(MoneyError);
    });

    it('rechaza montos monetarios fraccionarios o negativos', () => {
      expect(() =>
        simularRunwayMonteCarlo({
          saldoInicialCents: 1000.5,
          ingresosMensualesEsperadosCents: 50000,
          variabilidadIngresosPorc: 10,
          gastosFijosMensualesCents: 20000,
          gastosVariablesPromedioCents: 10000,
          variabilidadGastosPorc: 20,
        })
      ).toThrow(MoneyError);

      expect(() =>
        simularRunwayMonteCarlo({
          saldoInicialCents: 100000,
          ingresosMensualesEsperadosCents: -50000,
          variabilidadIngresosPorc: 10,
          gastosFijosMensualesCents: 20000,
          gastosVariablesPromedioCents: 10000,
          variabilidadGastosPorc: 20,
        })
      ).toThrow(MoneyError);
    });
  });

  describe('comportamiento estocástico y convergencia de percentiles', () => {
    it('garantiza reproducibilidad determinista con misma semilla', () => {
      const config = {
        saldoInicialCents: 5000000, // $50,000.00
        ingresosMensualesEsperadosCents: 3000000, // $30,000.00
        variabilidadIngresosPorc: 25,
        gastosFijosMensualesCents: 2000000, // $20,000.00
        gastosVariablesPromedioCents: 800000, // $8,000.00
        variabilidadGastosPorc: 30,
        numMeses: 12,
        iteraciones: 500,
        semilla: 999,
      };

      const res1 = simularRunwayMonteCarlo(config);
      const res2 = simularRunwayMonteCarlo(config);

      expect(res1).toEqual(res2);
    });

    it('respeta invariantes matemáticas de orden P10 <= P50 <= P90', () => {
      const res = simularRunwayMonteCarlo({
        saldoInicialCents: 1500000, // $15,000.00
        ingresosMensualesEsperadosCents: 2000000, // $20,000.00
        variabilidadIngresosPorc: 40,
        gastosFijosMensualesCents: 1800000, // $18,000.00
        gastosVariablesPromedioCents: 500000, // $5,000.00
        variabilidadGastosPorc: 35,
        numMeses: 12,
        iteraciones: 1000,
        semilla: 42,
      });

      expect(res.runwayMesesP10).toBeLessThanOrEqual(res.runwayMesesP50);
      expect(res.runwayMesesP50).toBeLessThanOrEqual(res.runwayMesesP90);

      expect(res.saldoFinalP10Cents).toBeLessThanOrEqual(res.saldoFinalP50Cents);
      expect(res.saldoFinalP50Cents).toBeLessThanOrEqual(res.saldoFinalP90Cents);
      expect(res.iteracionesEjecutadas).toBe(1000);
    });

    it('identifica insolvencia del 100% ante balance cero y gastos sin ingresos', () => {
      const res = simularRunwayMonteCarlo({
        saldoInicialCents: 0,
        ingresosMensualesEsperadosCents: 0,
        variabilidadIngresosPorc: 0,
        gastosFijosMensualesCents: 1000000,
        gastosVariablesPromedioCents: 200000,
        variabilidadGastosPorc: 10,
        numMeses: 12,
        iteraciones: 200,
        semilla: 123,
      });

      expect(res.probabilidadInsolvenciaPorc).toBe(100);
      expect(res.runwayMesesP10).toBe(1);
      expect(res.runwayMesesP50).toBe(1);
      expect(res.runwayMesesP90).toBe(1);
      expect(res.mesPrimerQuiebreMedio).toBe(1);
    });

    it('confirma 0% de probabilidad de insolvencia con amplio superávit y baja varianza', () => {
      const res = simularRunwayMonteCarlo({
        saldoInicialCents: 50000000, // $500,000.00
        ingresosMensualesEsperadosCents: 10000000, // $100,000.00
        variabilidadIngresosPorc: 5,
        gastosFijosMensualesCents: 2000000, // $20,000.00
        gastosVariablesPromedioCents: 1000000, // $10,000.00
        variabilidadGastosPorc: 5,
        numMeses: 12,
        iteraciones: 500,
        semilla: 777,
      });

      expect(res.probabilidadInsolvenciaPorc).toBe(0);
      expect(res.runwayMesesP10).toBe(12);
      expect(res.runwayMesesP50).toBe(12);
      expect(res.runwayMesesP90).toBe(12);
      expect(res.mesPrimerQuiebreMedio).toBeNull();
      expect(res.saldoFinalP10Cents).toBeGreaterThan(50000000);
    });
  });
});
