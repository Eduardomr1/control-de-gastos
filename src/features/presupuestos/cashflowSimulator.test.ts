import { MoneyError } from '@/shared/lib/money';
import {
  simularRunwayMonteCarlo,
  calcularFondoEmergenciaRecomendado,
} from './cashflowSimulator';

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

  describe('calcularFondoEmergenciaRecomendado', () => {
    it('calcula reserva base de 3 meses para perfil asalariado sin dependientes', () => {
      const rec = calcularFondoEmergenciaRecomendado({
        gastosFijosMensualesCents: 1500000, // $15,000.00
        gastosVariablesEsencialesCents: 500000, // $5,000.00
        perfilEstabilidad: 'fijo_asalariado',
        tieneDependientes: false,
        saldoActualCents: 1000000, // $10,000.00
      });

      expect(rec.gastoMensualEsencialCents).toBe(2000000);
      expect(rec.mesesAjustadosRecomendados).toBe(3);
      expect(rec.montoObjetivoCents).toBe(6000000); // 3 * $20,000 = $60,000.00
      expect(rec.brechaFaltanteCents).toBe(5000000);
      expect(rec.porcentajeCobertura).toBe(17); // 1,000,000 / 6,000,000 = 16.66% -> 17%
      expect(rec.desgloseFactores).toEqual({
        baseMeses: 3,
        ajustePerfilMeses: 0,
        ajusteDependientesMeses: 0,
      });
    });

    it('ajusta horizonte ante perfil freelance y personas dependientes', () => {
      const rec = calcularFondoEmergenciaRecomendado({
        gastosFijosMensualesCents: 2000000, // $20,000.00
        gastosVariablesEsencialesCents: 1000000, // $10,000.00
        mesesObjetivo: 4,
        perfilEstabilidad: 'freelance_independiente', // +3 meses
        tieneDependientes: true, // +2 meses
        saldoActualCents: 30000000, // $300,000.00
      });

      // 4 base + 3 freelance + 2 dependientes = 9 meses
      expect(rec.mesesAjustadosRecomendados).toBe(9);
      expect(rec.gastoMensualEsencialCents).toBe(3000000);
      expect(rec.montoObjetivoCents).toBe(27000000); // 9 * $30,000 = $270,000.00
      expect(rec.brechaFaltanteCents).toBe(0); // Cubierto en su totalidad
      expect(rec.porcentajeCobertura).toBe(100);
      expect(rec.desgloseFactores).toEqual({
        baseMeses: 4,
        ajustePerfilMeses: 3,
        ajusteDependientesMeses: 2,
      });
    });

    it('aplica ajuste intermedio para perfil comisionista', () => {
      const rec = calcularFondoEmergenciaRecomendado({
        gastosFijosMensualesCents: 1000000,
        gastosVariablesEsencialesCents: 1000000,
        perfilEstabilidad: 'variable_comisiones', // +2 meses
        tieneDependientes: false,
      });

      expect(rec.mesesAjustadosRecomendados).toBe(5); // 3 base + 2 perfil
      expect(rec.montoObjetivoCents).toBe(10000000);
    });

    it('rechaza montos monetarios o meses fuera de límites', () => {
      expect(() =>
        calcularFondoEmergenciaRecomendado({
          gastosFijosMensualesCents: -100,
          gastosVariablesEsencialesCents: 50000,
        })
      ).toThrow(MoneyError);

      expect(() =>
        calcularFondoEmergenciaRecomendado({
          gastosFijosMensualesCents: 10000,
          gastosVariablesEsencialesCents: 50000,
          mesesObjetivo: 0,
        })
      ).toThrow(MoneyError);

      expect(() =>
        calcularFondoEmergenciaRecomendado({
          gastosFijosMensualesCents: 10000,
          gastosVariablesEsencialesCents: 50000,
          mesesObjetivo: 25,
        })
      ).toThrow(MoneyError);
    });
  });
});
