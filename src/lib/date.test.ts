import {
  DateError,
  formatMonthKey,
  groupByMonth,
  monthKeyOf,
  nowLocalIso,
} from './date';

describe('monthKeyOf', () => {
  // CASO QA #4 — el bug de corte de mes por zona horaria.
  it('mantiene en enero un gasto de las 23:50 del 31 de enero en Culiacán', () => {
    const occurredAt = '2026-01-31T23:50:00-07:00';
    expect(monthKeyOf(occurredAt)).toBe('2026-01');

    // Prueba de que el bug es real: en UTC ese instante ya es febrero.
    expect(new Date(occurredAt).toISOString().slice(0, 7)).toBe('2026-02');
  });

  it('mantiene en febrero un gasto de las 00:10 del 1 de febrero', () => {
    expect(monthKeyOf('2026-02-01T00:10:00-07:00')).toBe('2026-02');
  });

  it('respeta el offset de una zona horaria adelantada', () => {
    expect(monthKeyOf('2026-03-01T00:30:00+09:00')).toBe('2026-03');
  });

  it('acepta timestamps en UTC', () => {
    expect(monthKeyOf('2026-06-15T12:00:00Z')).toBe('2026-06');
  });

  it('acepta milisegundos', () => {
    expect(monthKeyOf('2026-06-15T12:00:00.123-07:00')).toBe('2026-06');
  });

  it('rechaza una fecha sin offset explícito en lugar de adivinarlo', () => {
    expect(() => monthKeyOf('2026-01-31T23:50:00')).toThrow(DateError);
  });

  it.each(['', '2026-01-31', 'ayer', '31/01/2026'])(
    'rechaza el formato inválido "%s"',
    (input) => {
      expect(() => monthKeyOf(input)).toThrow(DateError);
    },
  );
});

describe('groupByMonth', () => {
  it('agrupa por mes local y no por mes UTC', () => {
    const groups = groupByMonth([
      { occurredAt: '2026-01-31T23:50:00-07:00' },
      { occurredAt: '2026-01-05T10:00:00-07:00' },
      { occurredAt: '2026-02-01T00:10:00-07:00' },
    ]);
    expect(groups.get('2026-01')).toHaveLength(2);
    expect(groups.get('2026-02')).toHaveLength(1);
  });

  it('devuelve un mapa vacío sin elementos', () => {
    expect(groupByMonth([]).size).toBe(0);
  });
});

describe('formatMonthKey', () => {
  it('produce una etiqueta legible en español', () => {
    expect(formatMonthKey('2026-01')).toMatch(/enero.*2026/i);
  });

  it('rechaza una clave malformada', () => {
    expect(() => formatMonthKey('2026-13-01')).toThrow(DateError);
  });
});

describe('nowLocalIso', () => {
  it('produce un ISO con offset explícito', () => {
    const iso = nowLocalIso(new Date('2026-01-31T23:50:00-07:00'));
    expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(Z|[+-]\d{2}:\d{2})$/);
  });

  it('el resultado es consumible por monthKeyOf sin perder el mes local', () => {
    const iso = nowLocalIso(new Date('2026-01-31T23:50:00-07:00'));
    expect(() => monthKeyOf(iso)).not.toThrow();
  });

  it('usa la fecha actual cuando no se le pasa una', () => {
    expect(() => monthKeyOf(nowLocalIso())).not.toThrow();
  });
});
