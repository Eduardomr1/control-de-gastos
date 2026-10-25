import { DateError } from '@/shared/lib/date';
import { MoneyError } from '@/shared/lib/money';
import type { Expense } from '@/types/expense';

import { evaluarAlertasMensuales, proyectarGastoMensual } from './proyeccion';
import type { Presupuesto } from './types';

function gasto(g: Partial<Expense> & { id: string; amountCents: number }): Expense {
  return {
    currency: 'MXN',
    categoryId: 'comida',
    occurredAt: '2026-10-05T12:00:00-07:00',
    syncState: 'synced',
    updatedAt: '2026-10-05T12:00:00-07:00',
    ...g,
  };
}

function presupuesto(
  p: Partial<Presupuesto> & { id: string; categoryId: string; limiteCents: number },
): Presupuesto {
  return {
    syncState: 'synced',
    updatedAt: '2026-10-01T09:00:00-07:00',
    ...p,
  };
}

describe('proyectarGastoMensual', () => {
  it('dispara alerta_proyectada cuando el ritmo temprano rebasa el mes aunque aún no cruce el 80%', () => {
    // Día 5 de 31 en octubre: gastar $450 de $1,000 es apenas 45% hoy, pero a
    // $90/día proyecta cerrar en $2,790 (279%) y agotar el límite el día 12.
    const resultado = proyectarGastoMensual(
      [gasto({ id: 'g1', amountCents: 450_00, occurredAt: '2026-10-05T09:30:00-07:00' })],
      1_000_00,
      '2026-10-05T18:00:00-07:00',
      'comida',
    );

    expect(resultado).toEqual({
      mes: '2026-10',
      diasTranscurridos: 5,
      diasTotales: 31,
      diasRestantes: 26,
      gastadoCents: 450_00,
      limiteCents: 1_000_00,
      ritmoDiarioCents: 90_00,
      proyectadoFinDeMesCents: 2_790_00,
      margenProyectadoCents: -1_790_00,
      // $550.00 restantes / 26 días = $21.1538... -> 2115 centavos truncados
      presupuestoDiarioRestanteCents: 21_15,
      // ceil(1000 * 5 / 450) = ceil(11.11) = 12
      diaEstimadoAgotamiento: 12,
      riesgo: 'alerta_proyectada',
    });
  });

  it('clasifica riesgo bajo cuando el ritmo proyectado cierra dentro del límite', () => {
    const resultado = proyectarGastoMensual(
      [gasto({ id: 'g1', amountCents: 200_00, occurredAt: '2026-10-10T11:00:00-07:00' })],
      1_000_00,
      '2026-10-10T20:00:00-07:00',
    );

    expect(resultado.riesgo).toBe('bajo');
    expect(resultado.ritmoDiarioCents).toBe(20_00);
    expect(resultado.proyectadoFinDeMesCents).toBe(620_00);
    expect(resultado.margenProyectadoCents).toBe(380_00);
    expect(resultado.diaEstimadoAgotamiento).toBeNull();
  });

  it('distingue umbral_80 al final del mes y excedido al alcanzar el 100%', () => {
    // Día 30 de 30 en septiembre con esattamente 80% gastado: proyecta 80%, pero ya tocó el umbral del 80%.
    const enUmbral = proyectarGastoMensual(
      [gasto({ id: 'g1', amountCents: 800_00, occurredAt: '2026-09-20T10:00:00-07:00' })],
      1_000_00,
      '2026-09-30T22:00:00-07:00',
    );
    expect(enUmbral.riesgo).toBe('umbral_80');
    expect(enUmbral.diasRestantes).toBe(0);
    expect(enUmbral.presupuestoDiarioRestanteCents).toBe(0);
    expect(enUmbral.diaEstimadoAgotamiento).toBeNull();

    const excedido = proyectarGastoMensual(
      [gasto({ id: 'g2', amountCents: 1_250_00, occurredAt: '2026-09-10T10:00:00-07:00' })],
      1_000_00,
      '2026-09-15T12:00:00-07:00',
    );
    expect(excedido.riesgo).toBe('excedido');
    expect(excedido.presupuestoDiarioRestanteCents).toBe(0);
    expect(excedido.diaEstimadoAgotamiento).toBe(12);
  });

  it('ajusta el denominador real del calendario en febrero normal (28) y bisiesto (29)', () => {
    const febNormal = proyectarGastoMensual(
      [gasto({ id: 'g1', amountCents: 140_00, occurredAt: '2026-02-07T10:00:00-07:00' })],
      600_00,
      '2026-02-07T18:00:00-07:00',
    );
    const febBisiesto = proyectarGastoMensual(
      [gasto({ id: 'g1', amountCents: 140_00, occurredAt: '2028-02-07T10:00:00-07:00' })],
      600_00,
      '2028-02-07T18:00:00-07:00',
    );

    expect(febNormal.diasTotales).toBe(28);
    expect(febNormal.proyectadoFinDeMesCents).toBe(560_00);
    expect(febBisiesto.diasTotales).toBe(29);
    expect(febBisiesto.proyectadoFinDeMesCents).toBe(580_00);
  });

  it('respeta la fecha local sin corrimiento UTC e ignora borrados, otras categorías y días posteriores', () => {
    const resultado = proyectarGastoMensual(
      [
        // 23:50 local del día 10 (en UTC ya es día 11): sí entra en el corte del día 10
        gasto({
          id: 'entra-local',
          categoryId: 'comida',
          amountCents: 300_00,
          occurredAt: '2026-10-10T23:50:00-07:00',
        }),
        gasto({
          id: 'dia-posterior',
          categoryId: 'comida',
          amountCents: 900_00,
          occurredAt: '2026-10-11T08:00:00-07:00',
        }),
        gasto({
          id: 'otra-categoria',
          categoryId: 'transporte',
          amountCents: 400_00,
          occurredAt: '2026-10-04T10:00:00-07:00',
        }),
        gasto({
          id: 'otro-mes',
          categoryId: 'comida',
          amountCents: 400_00,
          occurredAt: '2026-09-30T23:55:00-07:00',
        }),
        gasto({
          id: 'eliminado',
          categoryId: 'comida',
          amountCents: 500_00,
          occurredAt: '2026-10-03T10:00:00-07:00',
          deletedAt: '2026-10-04T09:00:00-07:00',
        }),
      ],
      1_500_00,
      '2026-10-10T23:59:00-07:00',
      'comida',
    );

    expect(resultado.gastadoCents).toBe(300_00);
    expect(resultado.proyectadoFinDeMesCents).toBe(930_00);
  });

  it('redondea half-up en centavos sin usar punto flotante', () => {
    // 100 centavos en 3 días: ritmo diario = 33.33 -> 33; proyección 31 días = 3100 / 3 = 1033.33 -> 1033
    // 200 centavos en 3 días: ritmo diario = 66.66 -> 67; proyección 31 días = 6200 / 3 = 2066.66 -> 2067
    const r1 = proyectarGastoMensual(
      [gasto({ id: 'g1', amountCents: 1_00, occurredAt: '2026-10-01T10:00:00-07:00' })],
      50_00,
      '2026-10-03T10:00:00-07:00',
    );
    const r2 = proyectarGastoMensual(
      [gasto({ id: 'g2', amountCents: 2_00, occurredAt: '2026-10-01T10:00:00-07:00' })],
      50_00,
      '2026-10-03T10:00:00-07:00',
    );

    expect(r1.ritmoDiarioCents).toBe(33);
    expect(r1.proyectadoFinDeMesCents).toBe(10_33);
    expect(r2.ritmoDiarioCents).toBe(67);
    expect(r2.proyectadoFinDeMesCents).toBe(20_67);
  });

  it('rechaza límites no enteros, cero o negativos y fechas sin offset explícito', () => {
    expect(() =>
      proyectarGastoMensual([], 0, '2026-10-10T10:00:00-07:00'),
    ).toThrow(MoneyError);
    expect(() =>
      proyectarGastoMensual([], -500, '2026-10-10T10:00:00-07:00'),
    ).toThrow(MoneyError);
    expect(() =>
      proyectarGastoMensual([], 100.5, '2026-10-10T10:00:00-07:00'),
    ).toThrow(MoneyError);
    expect(() =>
      proyectarGastoMensual([], 1_000_00, '2026-10-10'),
    ).toThrow(DateError);
  });
});

describe('evaluarAlertasMensuales', () => {
  it('prioriza por severidad de riesgo, luego por mayor déficit proyectado y desempata por categoría', () => {
    const presupuestos: Presupuesto[] = [
      presupuesto({ id: 'p-salud', categoryId: 'salud', limiteCents: 500_00 }),
      presupuesto({ id: 'p-comida-gen', categoryId: 'comida', limiteCents: 800_00 }),
      // El presupuesto específico del mes gana sobre el general
      presupuesto({
        id: 'p-comida-oct',
        categoryId: 'comida',
        limiteCents: 1_000_00,
        mesReferencia: '2026-10',
      }),
      presupuesto({ id: 'p-ocio', categoryId: 'ocio', limiteCents: 400_00 }),
      presupuesto({ id: 'p-hogar', categoryId: 'hogar', limiteCents: 600_00 }),
      presupuesto({ id: 'p-auto', categoryId: 'auto', limiteCents: 600_00 }),
      // Presupuesto de otro mes sin general: no aplica en 2026-10
      presupuesto({
        id: 'p-viajes-nov',
        categoryId: 'viajes',
        limiteCents: 2_000_00,
        mesReferencia: '2026-11',
      }),
      presupuesto({
        id: 'p-borrado',
        categoryId: 'borrada',
        limiteCents: 300_00,
        deletedAt: '2026-10-02T10:00:00-07:00',
      }),
    ];

    const gastos: Expense[] = [
      // ocio: 450 / 400 -> excedido
      gasto({ id: 'g1', categoryId: 'ocio', amountCents: 450_00 }),
      // salud: 420 / 500 -> umbral_80 (84%)
      gasto({ id: 'g2', categoryId: 'salud', amountCents: 420_00 }),
      // comida: día 10, 500 / 1000 -> 50% hoy, proyecta 1550 (margen -550) -> alerta_proyectada
      gasto({ id: 'g3', categoryId: 'comida', amountCents: 500_00 }),
      // hogar y auto: día 10, 0 gastado -> ambos riesgo bajo y margen +600 (desempate alfabético)
    ];

    const alertas = evaluarAlertasMensuales(
      presupuestos,
      gastos,
      '2026-10-10T15:00:00-07:00',
    );

    expect(alertas.map((a) => `${a.categoryId}:${a.proyeccion.riesgo}`)).toEqual([
      'ocio:excedido',
      'salud:umbral_80',
      'comida:alerta_proyectada',
      'auto:bajo',
      'hogar:bajo',
    ]);
    expect(alertas[2]?.proyeccion.limiteCents).toBe(1_000_00);
  });

  it('ordena dos categorías del mismo riesgo colocando primero el menor margen proyectado', () => {
    const alertas = evaluarAlertasMensuales(
      [
        presupuesto({ id: 'p1', categoryId: 'transporte', limiteCents: 1_000_00 }),
        presupuesto({ id: 'p2', categoryId: 'comida', limiteCents: 1_000_00 }),
      ],
      [
        gasto({ id: 'g1', categoryId: 'transporte', amountCents: 400_00 }), // proyecta 1240 -> margen -240
        gasto({ id: 'g2', categoryId: 'comida', amountCents: 600_00 }), // proyecta 1860 -> margen -860
      ],
      '2026-10-10T12:00:00-07:00',
    );

    expect(alertas.map((a) => a.categoryId)).toEqual(['comida', 'transporte']);
  });
});
