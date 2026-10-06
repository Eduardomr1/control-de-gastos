import { leerRecibo } from './parser';

const HOY = '2026-09-23';

function total(lineas: string[]): number | null {
  return leerRecibo(lineas, HOY).totalCents;
}

describe('leerRecibo · total', () => {
  it('lee el total del mismo renglón', () => {
    expect(total(['OXXO', 'COCA COLA 600ML 18.50', 'TOTAL $18.50'])).toBe(18_50);
  });

  it('lee el total del renglón de abajo', () => {
    expect(total(['OXXO', 'TOTAL', '$234.50', 'GRACIAS'])).toBe(234_50);
  });

  /** El EFECTIVO es mayor que el total: tomar "el más grande" lo registra a él. */
  it('no confunde el efectivo ni el cambio con el total', () => {
    expect(
      total(['SUBTOTAL 200.00', 'IVA 32.00', 'TOTAL 232.00', 'EFECTIVO 500.00', 'CAMBIO 268.00']),
    ).toBe(232_00);
  });

  it('ignora el subtotal aunque venga primero', () => {
    expect(total(['SUBTOTAL 862.07', 'IVA 137.93', 'TOTAL 1,000.00'])).toBe(1_000_00);
  });

  /** Dice TOTAL y no es dinero. */
  it('ignora "TOTAL ARTICULOS" porque es un conteo', () => {
    expect(total(['TOTAL ARTICULOS 7', 'TOTAL $345.00'])).toBe(345_00);
  });

  it('el total con propina gana al total sin propina', () => {
    expect(
      total(['SUBTOTAL 500.00', 'TOTAL 580.00', 'PROPINA 58.00', 'TOTAL CON PROPINA 638.00']),
    ).toBe(638_00);
  });

  it('una propina sugerida no cuenta como cobrada', () => {
    expect(
      total(['TOTAL 580.00', 'PROPINA SUGERIDA 10% 58.00', 'PROPINA SUGERIDA 15% 87.00']),
    ).toBe(580_00);
  });

  it('entre dos TOTAL igual de fuertes, el último', () => {
    expect(total(['TOTAL 500.00', 'PROPINA 75.00', 'TOTAL 575.00'])).toBe(575_00);
  });

  /**
   * El OCR lee primero la columna de rótulos y luego la de importes. Emparejar
   * "TOTAL con el renglón siguiente" le daría el importe del SUBTOTAL.
   */
  it('empareja columnas separadas en orden', () => {
    expect(
      total([
        'SUBTOTAL',
        'IVA',
        'TOTAL',
        'EFECTIVO',
        'CAMBIO',
        '$200.00',
        '$32.00',
        '$232.00',
        '$300.00',
        '$68.00',
      ]),
    ).toBe(232_00);
  });

  it('con más montos que rótulos no adivina la pareja', () => {
    expect(total(['SUBTOTAL', 'TOTAL', '10.00', '20.00', '30.00'])).toBeNull();
  });

  describe('errores de OCR en el rótulo', () => {
    it('lee T0TAL con cero', () => {
      expect(total(['T0TAL 99.00'])).toBe(99_00);
    });

    it('lee TOTA1 con uno', () => {
      expect(total(['TOTA1 99.00'])).toBe(99_00);
    });
  });

  describe('errores de OCR en el monto', () => {
    it('corrige la O leída en lugar de cero', () => {
      expect(total(['TOTAL 1O0.5O'])).toBe(100_50);
    });

    it('corrige la l leída en lugar de uno', () => {
      expect(total(['TOTAL 2l4.00'])).toBe(214_00);
    });

    it('lee la S que el OCR puso en lugar del signo de pesos', () => {
      expect(total(['TOTAL S234.50'])).toBe(234_50);
    });

    it('acepta espacio como separador de miles', () => {
      expect(total(['TOTAL $1 234.50'])).toBe(1_234_50);
    });

    it('acepta coma decimal con punto de miles', () => {
      expect(total(['TOTAL 1.234,50'])).toBe(1_234_50);
    });

    it('acepta coma decimal sola', () => {
      expect(total(['TOTAL 234,50'])).toBe(234_50);
    });

    it('completa el decimal que el OCR perdió', () => {
      expect(total(['TOTAL 234.5'])).toBe(234_50);
    });

    it('lee el total en pesos enteros', () => {
      expect(total(['TOTAL 234'])).toBe(234_00);
    });

    it('lee el total con MXN o M.N. pegado', () => {
      expect(total(['TOTAL M.N. 234.50'])).toBe(234_50);
      expect(total(['TOTAL 234.50 MXN'])).toBe(234_50);
    });

    it('no pierde la L de TOTAL cuando el monto viene pegado', () => {
      expect(total(['TOTAL234.50'])).toBe(234_50);
    });
  });

  describe('lo que no es dinero', () => {
    it('no toma un folio de venta como total', () => {
      expect(total(['NOTA DE VENTA 12345', 'GRACIAS'])).toBeNull();
    });

    it('no toma la hora ni la fecha como montos', () => {
      expect(total(['FECHA 23/09/2026 14:35', 'TOTAL 99.00'])).toBe(99_00);
    });

    it('no toma la fecha con puntos como monto en el respaldo', () => {
      expect(total(['23.09.2026', 'COCA 18.50'])).toBe(18_50);
    });

    it('descarta los números largos sin decimales', () => {
      expect(total(['7501055303786', 'TOTAL 45.00'])).toBe(45_00);
    });

    it('no confunde la tarjeta enmascarada con dinero', () => {
      expect(total(['TARJETA ****1234', 'IMPORTE $450.00'])).toBe(450_00);
    });

    it('no toma un porcentaje como monto', () => {
      expect(total(['IVA 16%', 'TOTAL 116.00'])).toBe(116_00);
    });
  });

  describe('respaldos', () => {
    it('sin rótulo de total, usa EFECTIVO menos CAMBIO', () => {
      expect(total(['COCA 18.50', 'PAN 12.00', 'EFECTIVO 50.00', 'CAMBIO 19.50'])).toBe(30_50);
    });

    /** Un voucher de terminal solo trae un importe. */
    it('con un solo monto en todo el ticket, lo toma', () => {
      expect(total(['BBVA', 'VENTA APROBADA', '$ 1,250.00', 'AUT 123456'])).toBe(1_250_00);
    });

    /** Con dos, elegir el mayor es como se termina registrando el EFECTIVO. */
    it('con varios montos y ningún rótulo, no adivina', () => {
      expect(total(['COCA 18.50', 'PAN 12.00', 'LECHE 28.00'])).toBeNull();
    });

    it('un IMPORTE solo cuenta si es el único', () => {
      expect(total(['IMPORTE 45.00', 'IMPORTE 30.00'])).toBeNull();
    });

    it('un recibo vacío no tiene total', () => {
      expect(total([])).toBeNull();
    });
  });
});

function fecha(lineas: string[]): string | null {
  return leerRecibo(lineas, HOY).fecha;
}

describe('leerRecibo · fecha', () => {
  it('lee dd/mm/aaaa, día primero como en México', () => {
    expect(fecha(['FECHA: 05/09/2026'])).toBe('2026-09-05');
  });

  it('lee año de dos dígitos', () => {
    expect(fecha(['05-09-26 14:35'])).toBe('2026-09-05');
  });

  it('lee aaaa-mm-dd', () => {
    expect(fecha(['2026-09-05T14:35'])).toBe('2026-09-05');
  });

  it('lee el mes abreviado', () => {
    expect(fecha(['23/SEP/2026'])).toBe('2026-09-23');
    expect(fecha(['23-sep-26'])).toBe('2026-09-23');
  });

  it('lee el mes por nombre completo', () => {
    expect(fecha(['23 DE SEPTIEMBRE DE 2026'])).toBe('2026-09-23');
  });

  it('lee el mes antes del día', () => {
    expect(fecha(['SEP 23 2026'])).toBe('2026-09-23');
  });

  it('acepta la fecha sin acentos ni mayúsculas', () => {
    expect(fecha(['fecha 23 de septiembre de 2026'])).toBe('2026-09-23');
  });

  it('ignora la caducidad y se queda con la de compra', () => {
    expect(fecha(['CADUCIDAD 31/12/2026', 'FECHA 20/09/2026'])).toBe('2026-09-20');
  });

  it('ignora la vigencia de una promoción', () => {
    expect(fecha(['VIGENCIA PROMO HASTA 30/09/2026', '20/09/2026 13:02'])).toBe('2026-09-20');
  });

  /** Una compra no pasó mañana. */
  it('descarta las fechas futuras', () => {
    expect(fecha(['10/10/2026'])).toBeNull();
  });

  it('descarta un día que no existe', () => {
    expect(fecha(['30/02/2026'])).toBeNull();
  });

  it('prefiere la fecha con rótulo o con hora sobre una suelta', () => {
    expect(fecha(['01/09/2026', 'FECHA 15/09/2026'])).toBe('2026-09-15');
  });

  it('sin fecha devuelve null', () => {
    expect(fecha(['OXXO', 'TOTAL 99.00'])).toBeNull();
  });
});

function comercio(lineas: string[]): string | null {
  return leerRecibo(lineas, HOY).comercio;
}

describe('leerRecibo · comercio', () => {
  it('reconoce una cadena conocida', () => {
    expect(comercio(['CADENA COMERCIAL OXXO SA DE CV', 'OXXO SUC. CENTRO'])).toBe('OXXO');
  });

  it('reconoce la cadena con ruido de OCR', () => {
    expect(comercio(['0XX0', 'TOTAL 99.00'])).toBe('OXXO');
  });

  it('distingue Oxxo Gas de OXXO', () => {
    expect(comercio(['OXXO GAS', 'MAGNA 20.5 LTS'])).toBe('Oxxo Gas');
  });

  it('reconoce Walmart con guion', () => {
    expect(comercio(['WAL-MART DE MEXICO', 'TOTAL 99.00'])).toBe('Walmart');
  });

  /** "TOTAL NETO" no es la tienda Neto. */
  it('no confunde un rótulo con una cadena', () => {
    expect(comercio(['ABARROTES LUPITA', 'TOTAL NETO 99.00'])).toBe('Abarrotes Lupita');
  });

  it('sin cadena conocida, toma el primer renglón con cara de nombre', () => {
    expect(
      comercio(['TICKET DE VENTA', 'TAQUERIA EL GÜERO', 'AV. JUAREZ 123', 'TOTAL 150.00']),
    ).toBe('Taqueria El Güero');
  });

  it('le quita la razón social al nombre', () => {
    expect(comercio(['DISTRIBUIDORA DEL NORTE S.A. DE C.V.', 'TOTAL 1,160.00'])).toBe(
      'Distribuidora Del Norte',
    );
  });

  it('se salta el RFC y la dirección', () => {
    expect(
      comercio(['RFC: ABC123456XY1', 'CALLE 5 DE MAYO 12', 'PAPELERIA ESTRELLA', 'TOTAL 45.00']),
    ).toBe('Papeleria Estrella');
  });

  it('sin nada con cara de nombre, devuelve null', () => {
    expect(comercio(['12345', 'TOTAL 99.00'])).toBeNull();
  });
});
