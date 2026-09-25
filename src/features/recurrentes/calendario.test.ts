import { ocurrencia, ocurrenciasPendientes, proximaOcurrencia } from './calendario';

const T = 'T09:00:00-07:00';

describe('ocurrencia', () => {
  it('la ocurrencia 0 es la fecha de inicio', () => {
    expect(ocurrencia(`2026-09-15${T}`, 'mensual', 0)).toBe(`2026-09-15${T}`);
  });

  it('conserva la hora y el offset', () => {
    expect(ocurrencia('2026-01-10T23:45:30+02:00', 'mensual', 1)).toBe(
      '2026-02-10T23:45:30+02:00',
    );
  });

  describe('semanal', () => {
    it('suma siete días', () => {
      expect(ocurrencia(`2026-09-15${T}`, 'semanal', 1)).toBe(`2026-09-22${T}`);
    });

    it('cruza el fin de mes', () => {
      expect(ocurrencia(`2026-09-28${T}`, 'semanal', 1)).toBe(`2026-10-05${T}`);
    });

    it('cruza el fin de año', () => {
      expect(ocurrencia(`2026-12-28${T}`, 'semanal', 1)).toBe(`2027-01-04${T}`);
    });

    it('cruza febrero de un año bisiesto', () => {
      expect(ocurrencia(`2028-02-26${T}`, 'semanal', 1)).toBe(`2028-03-04${T}`);
    });

    it('avanza varias semanas de una vez', () => {
      expect(ocurrencia(`2026-01-01${T}`, 'semanal', 10)).toBe(`2026-03-12${T}`);
    });
  });

  describe('mensual', () => {
    it('suma un mes', () => {
      expect(ocurrencia(`2026-09-15${T}`, 'mensual', 1)).toBe(`2026-10-15${T}`);
    });

    it('cruza el fin de año', () => {
      expect(ocurrencia(`2026-11-15${T}`, 'mensual', 2)).toBe(`2027-01-15${T}`);
    });

    /**
     * El día 31 no existe en febrero. Se recorta al último del mes.
     */
    it('recorta el 31 al último día del mes', () => {
      expect(ocurrencia(`2026-01-31${T}`, 'mensual', 1)).toBe(`2026-02-28${T}`);
      expect(ocurrencia(`2026-01-31${T}`, 'mensual', 3)).toBe(`2026-04-30${T}`);
    });

    it('el 29 de febrero existe en año bisiesto', () => {
      expect(ocurrencia(`2028-01-31${T}`, 'mensual', 1)).toBe(`2028-02-29${T}`);
    });

    /**
     * El corazón del diseño. Encadenando —"la siguiente es un mes después de
     * la anterior"— el 28 de febrero se vuelve la nueva base y "el 31 de cada
     * mes" se convierte en "el 28 de cada mes" para siempre. Con el inicio
     * como ancla fija, marzo vuelve al 31.
     */
    it('el recorte de febrero no contagia a los meses siguientes', () => {
      const inicio = `2026-01-31${T}`;
      expect(ocurrencia(inicio, 'mensual', 1)).toBe(`2026-02-28${T}`);
      expect(ocurrencia(inicio, 'mensual', 2)).toBe(`2026-03-31${T}`);
      expect(ocurrencia(inicio, 'mensual', 3)).toBe(`2026-04-30${T}`);
      expect(ocurrencia(inicio, 'mensual', 4)).toBe(`2026-05-31${T}`);
    });

    it('avanza doce meses y cae en el mismo día del año siguiente', () => {
      expect(ocurrencia(`2026-09-15${T}`, 'mensual', 12)).toBe(`2027-09-15${T}`);
    });
  });

  describe('anual', () => {
    it('suma un año', () => {
      expect(ocurrencia(`2026-09-15${T}`, 'anual', 1)).toBe(`2027-09-15${T}`);
    });

    /** El 29 de febrero solo existe uno de cada cuatro años. */
    it('recorta el 29 de febrero en año no bisiesto', () => {
      expect(ocurrencia(`2028-02-29${T}`, 'anual', 1)).toBe(`2029-02-28${T}`);
    });

    it('vuelve al 29 cuatro años después, sin arrastrar el recorte', () => {
      expect(ocurrencia(`2028-02-29${T}`, 'anual', 4)).toBe(`2032-02-29${T}`);
    });
  });
});

describe('ocurrenciasPendientes', () => {
  it('sin nada generado devuelve todas las vencidas', () => {
    expect(
      ocurrenciasPendientes(`2026-07-01${T}`, 'mensual', undefined, `2026-09-20${T}`),
    ).toEqual([`2026-07-01${T}`, `2026-08-01${T}`, `2026-09-01${T}`]);
  });

  it('no devuelve las futuras', () => {
    expect(
      ocurrenciasPendientes(`2026-10-01${T}`, 'mensual', undefined, `2026-09-20${T}`),
    ).toEqual([]);
  });

  it('la ocurrencia de hoy cuenta como vencida', () => {
    expect(
      ocurrenciasPendientes(`2026-09-20${T}`, 'mensual', undefined, `2026-09-20${T}`),
    ).toEqual([`2026-09-20${T}`]);
  });

  /**
   * El riesgo central de la Fase 3: abrir la app tres veces el mismo día no
   * debe generar el mismo gasto tres veces.
   */
  it('no devuelve lo ya generado', () => {
    const ya = `2026-09-01${T}`;
    expect(ocurrenciasPendientes(`2026-07-01${T}`, 'mensual', ya, `2026-09-20${T}`)).toEqual(
      [],
    );
  });

  /**
   * La app estuvo cerrada dos meses. Los dos cobros entran, cada uno con SU
   * fecha, no los dos con la de hoy: un cobro de agosto pertenece al corte de
   * agosto.
   */
  it('recupera varios periodos tras una reapertura tardía', () => {
    expect(
      ocurrenciasPendientes(`2026-06-05${T}`, 'mensual', `2026-06-05${T}`, `2026-09-20${T}`),
    ).toEqual([`2026-07-05${T}`, `2026-08-05${T}`, `2026-09-05${T}`]);
  });

  it('aplicarlo dos veces seguidas no devuelve nada la segunda', () => {
    const inicio = `2026-07-01${T}`;
    const hoy = `2026-09-20${T}`;
    const primera = ocurrenciasPendientes(inicio, 'mensual', undefined, hoy);
    const ultima = primera[primera.length - 1];
    expect(ocurrenciasPendientes(inicio, 'mensual', ultima, hoy)).toEqual([]);
  });

  it('funciona con semanales', () => {
    expect(
      ocurrenciasPendientes(`2026-09-01${T}`, 'semanal', undefined, `2026-09-20${T}`),
    ).toEqual([`2026-09-01${T}`, `2026-09-08${T}`, `2026-09-15${T}`]);
  });

  /**
   * Comparar por instante y no por texto: las 22:00-07:00 del día 20 son
   * ANTERIORES a las 02:00+02:00 del día 21, y como cadenas salen al revés.
   */
  it('compara instantes, no cadenas', () => {
    expect(
      ocurrenciasPendientes(
        '2026-09-20T22:00:00-07:00',
        'mensual',
        undefined,
        '2026-09-21T02:00:00+02:00',
      ),
    ).toEqual([]);
  });
});

describe('proximaOcurrencia', () => {
  it('devuelve la siguiente estrictamente posterior a la fecha dada', () => {
    expect(proximaOcurrencia(`2026-09-01${T}`, 'mensual', `2026-09-20${T}`)).toBe(
      `2026-10-01${T}`,
    );
  });

  it('el inicio futuro es su propia próxima ocurrencia', () => {
    expect(proximaOcurrencia(`2026-12-01${T}`, 'mensual', `2026-09-20${T}`)).toBe(
      `2026-12-01${T}`,
    );
  });

  /** Estrictamente posterior: el cobro de hoy ya pasó, el próximo es el otro. */
  it('la ocurrencia de hoy no es la próxima', () => {
    expect(proximaOcurrencia(`2026-09-20${T}`, 'mensual', `2026-09-20${T}`)).toBe(
      `2026-10-20${T}`,
    );
  });
});
