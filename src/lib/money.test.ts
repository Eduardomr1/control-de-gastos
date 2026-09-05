import {
  MoneyError,
  formatMoney,
  parseAmount,
  percentOf,
  splitCents,
  sumCents,
} from './money';

describe('parseAmount', () => {
  it.each([
    ['0', 0],
    ['1', 100],
    ['1.5', 150],
    ['1.50', 150],
    ['0.01', 1],
    ['1234.56', 123456],
    ['-45.30', -4530],
  ])('convierte "%s" a %i centavos', (input, expected) => {
    expect(parseAmount(input)).toBe(expected);
  });

  it('acepta coma decimal, como la teclea un usuario mexicano', () => {
    expect(parseAmount('1234,56')).toBe(123456);
  });

  it('acepta separador de miles con punto decimal', () => {
    expect(parseAmount('1,234.56')).toBe(123456);
  });

  it('acepta separador de miles con coma decimal (formato europeo)', () => {
    expect(parseAmount('1.234,56')).toBe(123456);
  });

  it('trata "1,234" como mil doscientos treinta y cuatro, no como 1.234', () => {
    expect(parseAmount('1,234')).toBe(123400);
  });

  it.each(['', '   ', 'abc', '1.2.3', '$50', '.'])(
    'rechaza la entrada inválida "%s"',
    (input) => {
      expect(() => parseAmount(input)).toThrow(MoneyError);
    },
  );

  it('rechaza más de dos decimales en lugar de redondear en silencio', () => {
    expect(() => parseAmount('1.005')).toThrow(MoneyError);
  });
});

describe('sumCents', () => {
  // CASO QA #5 — el bug clásico de punto flotante.
  it('suma 0.1 + 0.2 dando exactamente 0.3', () => {
    const total = sumCents([parseAmount('0.1'), parseAmount('0.2')]);
    expect(total).toBe(30);
    expect(formatMoney(total)).toBe('$0.30');
    // La misma operación en floats falla:
    expect(0.1 + 0.2).not.toBe(0.3);
  });

  it('suma 100 gastos de 0.01 dando exactamente 1.00', () => {
    const amounts = Array.from({ length: 100 }, () => parseAmount('0.01'));
    expect(sumCents(amounts)).toBe(100);
  });

  it('devuelve 0 para una lista vacía', () => {
    expect(sumCents([])).toBe(0);
  });

  it('rechaza montos no enteros para atajar corrupción aguas arriba', () => {
    expect(() => sumCents([10.5])).toThrow(MoneyError);
  });
});

describe('splitCents', () => {
  it('reparte 10.00 entre 3 sin perder centavos', () => {
    const parts = splitCents(1000, 3);
    expect(parts).toEqual([334, 333, 333]);
    expect(sumCents(parts)).toBe(1000);
  });

  it.each([1, 2, 3, 7, 11, 13])(
    'siempre conserva el total al repartir entre %i',
    (parts) => {
      expect(sumCents(splitCents(9999, parts))).toBe(9999);
    },
  );

  it('conserva el total con montos negativos', () => {
    expect(sumCents(splitCents(-1000, 3))).toBe(-1000);
  });

  it('rechaza un número de porciones inválido', () => {
    expect(() => splitCents(100, 0)).toThrow(MoneyError);
  });
});

describe('percentOf', () => {
  it('calcula el IVA de 100.00 como 16.00', () => {
    expect(percentOf(10000, 16)).toBe(1600);
  });

  it('redondea al centavo más cercano', () => {
    expect(percentOf(333, 50)).toBe(167); // 166.5 -> 167
  });

  it('redondea simétricamente en negativos', () => {
    expect(percentOf(-333, 50)).toBe(-167);
  });
});

describe('formatMoney', () => {
  it('formatea centavos como pesos mexicanos', () => {
    expect(formatMoney(123456)).toBe('$1,234.56');
  });

  it('siempre muestra dos decimales', () => {
    expect(formatMoney(100)).toBe('$1.00');
  });

  it('rechaza centavos no enteros', () => {
    expect(() => formatMoney(10.5)).toThrow(MoneyError);
  });
});

describe('guardas de desbordamiento', () => {
  it('rechaza un monto que excede el entero seguro', () => {
    expect(() => parseAmount('999999999999999999999')).toThrow(MoneyError);
  });

  it('rechaza una suma que desborda el entero seguro', () => {
    const huge = Number.MAX_SAFE_INTEGER - 1;
    expect(() => sumCents([huge, huge])).toThrow(MoneyError);
  });

  it('rechaza un porcentaje no finito', () => {
    expect(() => percentOf(1000, Number.POSITIVE_INFINITY)).toThrow(MoneyError);
  });
});
