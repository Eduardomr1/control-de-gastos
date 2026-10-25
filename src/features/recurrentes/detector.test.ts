import {
  detectarPatronesRecurrentes,
  type TransaccionHistorica,
} from './detector';

describe('detectarPatronesRecurrentes', () => {
  it('detecta suscripción mensual con intervalo aproximado de 30 días', () => {
    const transacciones: TransaccionHistorica[] = [
      { id: '1', nombre: 'Netflix', amountCents: 21900, fecha: '2026-07-05T12:00:00Z', categoryId: 'cat-ent' },
      { id: '2', nombre: 'Netflix', amountCents: 21900, fecha: '2026-08-05T12:00:00Z', categoryId: 'cat-ent' },
      { id: '3', nombre: 'Netflix', amountCents: 21900, fecha: '2026-09-05T12:00:00Z', categoryId: 'cat-ent' },
    ];

    const patrones = detectarPatronesRecurrentes(transacciones);
    expect(patrones).toHaveLength(1);
    expect(patrones[0]?.nombreSugerido).toBe('Netflix');
    expect(patrones[0]?.amountCents).toBe(21900);
    expect(patrones[0]?.frecuencia).toBe('mensual');
    expect(patrones[0]?.ocurrenciasCount).toBe(3);
  });

  it('detecta pagos semanales como membresía de gimnasio', () => {
    const transacciones: TransaccionHistorica[] = [
      { id: '1', nombre: 'Gym Pase Semanal', amountCents: 15000, fecha: '2026-09-01T08:00:00Z' },
      { id: '2', nombre: 'gym pase semanal', amountCents: 15000, fecha: '2026-09-08T08:00:00Z' },
      { id: '3', nombre: 'GYM PASE SEMANAL', amountCents: 15000, fecha: '2026-09-15T08:00:00Z' },
    ];

    const patrones = detectarPatronesRecurrentes(transacciones);
    expect(patrones).toHaveLength(1);
    expect(patrones[0]?.frecuencia).toBe('semanal');
    expect(patrones[0]?.amountCents).toBe(15000);
  });

  it('ignora transacciones esporádicas sin intervalo regular', () => {
    const transacciones: TransaccionHistorica[] = [
      { id: '1', nombre: 'Restaurante', amountCents: 45000, fecha: '2026-09-01T14:00:00Z' },
      { id: '2', nombre: 'Restaurante', amountCents: 45000, fecha: '2026-09-03T14:00:00Z' }, // 2 días
      { id: '3', nombre: 'Restaurante', amountCents: 45000, fecha: '2026-09-20T14:00:00Z' }, // 17 días
    ];

    const patrones = detectarPatronesRecurrentes(transacciones);
    expect(patrones).toHaveLength(0);
  });
});
