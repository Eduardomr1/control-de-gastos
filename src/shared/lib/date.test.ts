import {
  DateError,
  esFechaDelCalendario,
  formatDayShort,
  formatMonthName,
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

describe('formatDayShort', () => {
  // Mismo bug de zona horaria que monthKeyOf, ahora visible en la fila.
  it('muestra el 31 de enero de un gasto de las 23:50 en Culiacán', () => {
    const occurredAt = '2026-01-31T23:50:00-07:00';
    expect(formatDayShort(occurredAt)).toMatch(/^31 /);

    // En UTC ese instante ya es el 1 de febrero.
    expect(new Date(occurredAt).toISOString().slice(8, 10)).toBe('01');
  });

  it('no antepone cero al día', () => {
    expect(formatDayShort('2026-09-05T12:00:00-07:00')).toMatch(/^5 /);
  });

  it('rechaza un ISO sin offset explícito', () => {
    expect(() => formatDayShort('2026-09-05T12:00:00')).toThrow(DateError);
  });
});

describe('formatMonthName', () => {
  it('produce el nombre del mes sin año', () => {
    expect(formatMonthName('2026-09')).toBe('septiembre');
  });

  // El encabezado decía "Total de septiembre de 2026": el año lo aporta
  // formatMonthKey en el encabezado de sección, no este.
  it('no incluye el año, a diferencia de formatMonthKey', () => {
    expect(formatMonthName('2026-01')).not.toMatch(/2026/);
    expect(formatMonthKey('2026-01')).toMatch(/2026/);
  });

  it('rechaza una clave malformada', () => {
    expect(() => formatMonthName('2026-13-01')).toThrow(DateError);
  });
});

describe('esFechaDelCalendario', () => {
  it('acepta un dia que existe', () => {
    expect(esFechaDelCalendario('2026-09-23')).toBe(true);
  });

  /**
   * Tiene la forma correcta y no es una fecha. `Date.parse` la aceptaria y la
   * recorreria en silencio al 2 de marzo.
   */
  it('rechaza el 30 de febrero', () => {
    expect(esFechaDelCalendario('2026-02-30')).toBe(false);
  });

  it('acepta el 29 de febrero solo en bisiesto', () => {
    expect(esFechaDelCalendario('2028-02-29')).toBe(true);
    expect(esFechaDelCalendario('2027-02-29')).toBe(false);
  });

  it('rechaza el mes 13 y el mes cero', () => {
    expect(esFechaDelCalendario('2026-13-01')).toBe(false);
    expect(esFechaDelCalendario('2026-00-10')).toBe(false);
  });

  it('rechaza el dia cero', () => {
    expect(esFechaDelCalendario('2026-09-00')).toBe(false);
  });

  it('rechaza otros formatos', () => {
    expect(esFechaDelCalendario('23/09/2026')).toBe(false);
    expect(esFechaDelCalendario('2026-9-3')).toBe(false);
    expect(esFechaDelCalendario('2026-09-23T10:00:00-07:00')).toBe(false);
    expect(esFechaDelCalendario('')).toBe(false);
  });
});
