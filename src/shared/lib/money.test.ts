import {
  MoneyError,
  allocateCents,
  assertCents,
  formatMoney,
  parseAmount,
  percentOf,
  percentShare,
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

describe('assertCents', () => {
  it('acepta enteros positivos, cero y negativos dentro del rango seguro', () => {
    expect(() => assertCents(0)).not.toThrow();
    expect(() => assertCents(250_50)).not.toThrow();
    expect(() => assertCents(-99_99)).not.toThrow();
  });

  it.each([0.5, -1.25, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1])(
    'rechaza el valor no entero o inseguro %p',
    (invalido) => {
      expect(() => assertCents(invalido)).toThrow(MoneyError);
    },
  );
});

describe('percentShare', () => {
  it('calcula el porcentaje redondeado y devuelve 0 cuando el total es cero', () => {
    expect(percentShare(250_00, 1_000_00)).toBe(25);
    expect(percentShare(1, 3)).toBe(33);
    expect(percentShare(2, 3)).toBe(67);
    expect(percentShare(500_00, 0)).toBe(0);
  });
});

describe('allocateCents', () => {
  it('reparte por el método de mayor resto dando prioridad al resto fraccionario mayor', () => {
    // 100 * [1, 1, 4] / 6 -> cuotas exactas [16.666..., 16.666..., 66.666...]
    // pisos [16, 16, 66] = 98 (faltan 2). Los tres empatan con resto 4/6 -> ganan índices 0 y 1.
    expect(allocateCents(100, [1, 1, 4])).toEqual([17, 17, 66]);
    // 10 * [1, 2, 5] / 8 -> cuotas [1.25, 2.50, 6.25] -> pisos [1, 2, 6] = 9 (falta 1).
    // El mayor resto es 0.50 (índice 1), no el índice 0.
    expect(allocateCents(10, [1, 2, 5])).toEqual([1, 3, 6]);
  });

  it.each([
    [1, [50, 30, 20]],
    [2, [50, 30, 20]],
    [100_01, [50, 30, 20]],
    [9_999, [33, 33, 34]],
    [12_345_67, [7, 11, 13, 17]],
    [5_000_00, [1, 2, 3, 5, 8]],
  ])('conserva exactamente %i centavos con pesos %j', (total, pesos) => {
    const partes = allocateCents(total, pesos);
    expect(partes).toHaveLength(pesos.length);
    expect(sumCents(partes)).toBe(total);
  });

  it('jamás asigna un centavo residual a una categoría con peso cero', () => {
    const partes = allocateCents(1, [0, 1, 1]);
    expect(partes).toEqual([0, 1, 0]);
    expect(allocateCents(-1, [0, 1, 1])).toEqual([0, -1, 0]);
  });

  it('conserva el signo y evita -0 con montos negativos o cero', () => {
    const negativo = allocateCents(-1000, [1, 1, 1]);
    expect(negativo).toEqual([-334, -333, -333]);
    expect(sumCents(negativo)).toBe(-1000);
    expect(allocateCents(0, [3, 7])).toEqual([0, 0]);
  });

  it('mantiene exactitud con montos grandes cuyo producto intermedio rebasa MAX_SAFE_INTEGER', () => {
    const montoGrande = 1_000_000_000_000_00; // $1,000,000,000,000.00
    const pesos = [333, 333, 334];
    const partes = allocateCents(montoGrande, pesos);
    expect(sumCents(partes)).toBe(montoGrande);
  });

  it('rechaza entradas inválidas con MoneyError', () => {
    expect(() => allocateCents(10.5, [1, 1])).toThrow(MoneyError);
    expect(() => allocateCents(100, [])).toThrow(MoneyError);
    expect(() => allocateCents(100, [0, 0, 0])).toThrow(MoneyError);
    expect(() => allocateCents(100, [-1, 3])).toThrow(MoneyError);
    expect(() => allocateCents(100, [1.5, 2.5])).toThrow(MoneyError);
  });
});
