/**
 * Pruebas unitarias para el motor de planificación y optimización de metas de ahorro.
 */

import { MoneyError } from '@/shared/lib/money';
import {
  calcularAporteMensualRequerido,
  calcularHitosAhorro,
  calcularVelocidadRecuperacion,
  optimizarDistribucionExcedente,
  type ItemMetaParaAsignacion,
} from './savingsGoalEngine';

describe('savingsGoalEngine', () => {
  describe('calcularAporteMensualRequerido', () => {
    it('calcula la cuota mensual lineal sin rendimientos ni inflacion', () => {
      // Objetivo: $12,000 (1,200,000 centavos), Actual: $2,000 (200,000 centavos), Plazo: 10 meses
      const res = calcularAporteMensualRequerido({
        objetivoCents: 1_200_000,
        actualCents: 200_000,
        mesesPlazo: 10,
      });

      expect(res.objetivoNominalCents).toBe(1_200_000);
      expect(res.objetivoAjustadoInflacionCents).toBe(1_200_000);
      expect(res.aporteMensualCents).toBe(100_000); // 1,000,000 / 10 = 100,000 centavos ($1,000)
      expect(res.totalAportesEstimadosCents).toBe(1_000_000);
      expect(res.interesesGanadosEstimadosCents).toBe(0);
      expect(res.progresoPorcentual).toBe(16.67);
      expect(res.esAlcanzable).toBe(true);
    });

    it('redondea hacia arriba fracciones indivisibles de centavos', () => {
      // Faltante: 100,000 centavos en 3 meses = 33,333.33 -> 33,334
      const res = calcularAporteMensualRequerido({
        objetivoCents: 100_000,
        actualCents: 0,
        mesesPlazo: 3,
      });

      expect(res.aporteMensualCents).toBe(33_334);
      expect(res.totalAportesEstimadosCents).toBe(100_002);
    });

    it('devuelve cuota cero si la meta ya fue completada o superada', () => {
      const res = calcularAporteMensualRequerido({
        objetivoCents: 500_000,
        actualCents: 550_000,
        mesesPlazo: 6,
      });

      expect(res.aporteMensualCents).toBe(0);
      expect(res.totalAportesEstimadosCents).toBe(0);
      expect(res.progresoPorcentual).toBe(100);
    });

    it('calcula aportes considerando tasa de rendimiento con interes compuesto', () => {
      // Objetivo: $100,000 (10,000,000 centavos), Plazo: 12 meses, Rendimiento: 10% anual
      const res = calcularAporteMensualRequerido({
        objetivoCents: 10_000_000,
        actualCents: 0,
        mesesPlazo: 12,
        rendimientoAnualPorc: 10,
      });

      // Con 10% anual, la cuota es menor a la lineal (10,000,000 / 12 = 833,334)
      expect(res.aporteMensualCents).toBeLessThan(833_334);
      expect(res.aporteMensualCents).toBeGreaterThan(700_000);
      expect(res.interesesGanadosEstimadosCents).toBeGreaterThan(0);
    });

    it('ajusta el objetivo ante inflacion esperada a largo plazo', () => {
      // Objetivo: $100,000 a 24 meses con 5% de inflacion anual
      const res = calcularAporteMensualRequerido({
        objetivoCents: 10_000_000,
        actualCents: 0,
        mesesPlazo: 24,
        inflacionAnualPorc: 5,
      });

      // (1 + 0.05)^2 = 1.1025 -> 11,025,000 centavos
      expect(res.objetivoAjustadoInflacionCents).toBe(11_025_000);
      expect(res.aporteMensualCents).toBe(Math.ceil(11_025_000 / 24));
    });

    it('valida montos y plazos invalidos', () => {
      expect(() =>
        calcularAporteMensualRequerido({
          objetivoCents: 0,
          actualCents: 0,
          mesesPlazo: 12,
        })
      ).toThrow(MoneyError);

      expect(() =>
        calcularAporteMensualRequerido({
          objetivoCents: 100_000,
          actualCents: -50,
          mesesPlazo: 12,
        })
      ).toThrow(MoneyError);

      expect(() =>
        calcularAporteMensualRequerido({
          objetivoCents: 100_000,
          actualCents: 0,
          mesesPlazo: 0,
        })
      ).toThrow(MoneyError);
    });
  });

  describe('calcularHitosAhorro', () => {
    it('genera el cronograma de hitos para 25%, 50%, 75% y 100%', () => {
      // Objetivo: 1,000,000 ($10,000), Actual: 300,000 ($3,000), Aporte: 100,000 ($1,000)
      const hitos = calcularHitosAhorro(1_000_000, 300_000, 100_000);

      expect(hitos).toHaveLength(4);

      // Hito 25%: $2,500 (250,000 centavos) -> ya alcanzado
      expect(hitos[0]).toEqual({
        porcentaje: 25,
        montoHitoCents: 250_000,
        mesEstimado: 0,
        alcanzado: true,
        diferenciaFaltanteCents: 0,
      });

      // Hito 50%: $5,000 (500,000 centavos) -> falta 200,000 -> 2 meses
      expect(hitos[1]).toEqual({
        porcentaje: 50,
        montoHitoCents: 500_000,
        mesEstimado: 2,
        alcanzado: false,
        diferenciaFaltanteCents: 200_000,
      });

      // Hito 75%: $7,500 (750,000 centavos) -> falta 450,000 -> 5 meses
      expect(hitos[2]!.mesEstimado).toBe(5);
      expect(hitos[2]!.alcanzado).toBe(false);

      // Hito 100%: $10,000 (1,000,000 centavos) -> falta 700,000 -> 7 meses
      expect(hitos[3]!.mesEstimado).toBe(7);
      expect(hitos[3]!.alcanzado).toBe(false);
    });

    it('maneja metas sin aportes mensuales sin bucle infinito', () => {
      const hitos = calcularHitosAhorro(1_000_000, 100_000, 0, 0);
      expect(hitos[0]!.alcanzado).toBe(false);
      expect(hitos[0]!.mesEstimado).toBe(Infinity);
    });
  });

  describe('calcularVelocidadRecuperacion', () => {
    it('detecta retrasos en el plan y calcula el incremento mensual necesario', () => {
      // Objetivo: 1,200,000 ($12,000), Plan original: $1,000/mes durante 12 meses
      // Han pasado 4 meses (se esperaba tener $4,000 = 400,000 cents), pero solo tiene $2,500 (250,000 cents)
      // Quedan 8 meses
      const res = calcularVelocidadRecuperacion({
        objetivoCents: 1_200_000,
        actualCents: 250_000,
        mesesRestantes: 8,
        aporteMensualPrevioCents: 100_000,
        mesesTranscurridos: 4,
      });

      expect(res.estaAlDia).toBe(false);
      expect(res.esperadoActualCents).toBe(400_000);
      expect(res.deficitAcumuladoCents).toBe(150_000);

      // Faltante: 1,200,000 - 250,000 = 950,000 en 8 meses = 118,750 centavos ($1,187.50)
      expect(res.nuevoAporteMensualCents).toBe(118_750);
      expect(res.incrementoMensualCents).toBe(18_750);

      // Si mantiene el aporte de 100,000 cents: 950,000 / 100,000 = 10 meses totales -> 2 meses adicionales
      expect(res.mesesAdicionalesSiMantieneAporte).toBe(2);
    });

    it('reporta al dia si el ahorro acumulado supera la trayectoria', () => {
      const res = calcularVelocidadRecuperacion({
        objetivoCents: 1_000_000,
        actualCents: 500_000,
        mesesRestantes: 6,
        aporteMensualPrevioCents: 100_000,
        mesesTranscurridos: 3, // esperado 300,000, tiene 500,000
      });

      expect(res.estaAlDia).toBe(true);
      expect(res.deficitAcumuladoCents).toBe(0);
      expect(res.incrementoMensualCents).toBe(0);
    });
  });

  describe('optimizarDistribucionExcedente', () => {
    it('distribuye cero si el excedente disponible es 0', () => {
      const metas: ItemMetaParaAsignacion[] = [
        { id: '1', nombre: 'Fondo', prioridad: 'alta', objetivoCents: 100_000, actualCents: 20_000 },
      ];

      const res = optimizarDistribucionExcedente({
        excedenteDisponibleCents: 0,
        metas,
      });

      expect(res.totalDistribuidoCents).toBe(0);
      expect(res.excedenteNoAsignadoCents).toBe(0);
      expect(res.asignaciones[0]!.aporteAsignadoCents).toBe(0);
    });

    it('prioriza cuotas minimas sugeridas segun jerarquia de prioridad', () => {
      const metas: ItemMetaParaAsignacion[] = [
        {
          id: 'baja-1',
          nombre: 'Viaje',
          prioridad: 'baja',
          objetivoCents: 100_000,
          actualCents: 0,
          cuotaMinimaSugeridaCents: 30_000,
        },
        {
          id: 'alta-1',
          nombre: 'Emergencia',
          prioridad: 'alta',
          objetivoCents: 200_000,
          actualCents: 0,
          cuotaMinimaSugeridaCents: 50_000,
        },
      ];

      // Excedente limitado: solo 60,000 centavos
      // La meta alta consume 50,000 primero, quedan 10,000 para la meta baja
      const res = optimizarDistribucionExcedente({
        excedenteDisponibleCents: 60_000,
        metas,
      });

      expect(res.totalDistribuidoCents).toBe(60_000);
      expect(res.excedenteNoAsignadoCents).toBe(0);

      const asignacionAlta = res.asignaciones.find((a) => a.id === 'alta-1')!;
      const asignacionBaja = res.asignaciones.find((a) => a.id === 'baja-1')!;

      expect(asignacionAlta.aporteAsignadoCents).toBe(50_000);
      expect(asignacionBaja.aporteAsignadoCents).toBe(10_000);
    });

    it('aplica el algoritmo de Hamilton sin perder ni inventar un centavo', () => {
      const metas: ItemMetaParaAsignacion[] = [
        { id: '1', nombre: 'Meta A', prioridad: 'alta', objetivoCents: 1_000_000, actualCents: 0 },
        { id: '2', nombre: 'Meta B', prioridad: 'media', objetivoCents: 1_000_000, actualCents: 0 },
        { id: '3', nombre: 'Meta C', prioridad: 'baja', objetivoCents: 1_000_000, actualCents: 0 },
      ];

      // Excedente de 100,001 centavos (indivisible exactamente)
      const excedente = 100_001;
      const res = optimizarDistribucionExcedente({
        excedenteDisponibleCents: excedente,
        metas,
      });

      expect(res.totalDistribuidoCents).toBe(excedente);
      expect(res.excedenteNoAsignadoCents).toBe(0);

      const sumaAsignada = res.asignaciones.reduce((acc, a) => acc + a.aporteAsignadoCents, 0);
      expect(sumaAsignada).toBe(excedente);

      // Con pesos 5, 3, 1 (total 9):
      // Meta A: 5/9 * 100001 = 55556.11
      // Meta B: 3/9 * 100001 = 33333.66
      // Meta C: 1/9 * 100001 = 11111.22
      const a = res.asignaciones.find((item) => item.id === '1')!;
      const b = res.asignaciones.find((item) => item.id === '2')!;
      const c = res.asignaciones.find((item) => item.id === '3')!;

      expect(a.aporteAsignadoCents).toBeGreaterThan(b.aporteAsignadoCents);
      expect(b.aporteAsignadoCents).toBeGreaterThan(c.aporteAsignadoCents);
    });

    it('respeta topes de completitud y devuelve el excedente no utilizado', () => {
      const metas: ItemMetaParaAsignacion[] = [
        { id: '1', nombre: 'Meta Casi Lista', prioridad: 'alta', objetivoCents: 50_000, actualCents: 45_000 },
      ];

      // Excedente de 100,000 centavos, pero la meta solo necesita 5,000 para completarse
      const res = optimizarDistribucionExcedente({
        excedenteDisponibleCents: 100_000,
        metas,
      });

      expect(res.totalDistribuidoCents).toBe(5_000);
      expect(res.excedenteNoAsignadoCents).toBe(95_000);
      expect(res.metasCompletadasCount).toBe(1);
      expect(res.asignaciones[0]!.metaCompletada).toBe(true);
      expect(res.asignaciones[0]!.nuevoActualCents).toBe(50_000);
      expect(res.asignaciones[0]!.porcentajeProgresoPostAsignacion).toBe(100);
    });
  });
});
