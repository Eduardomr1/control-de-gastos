import { validarEntradaGasto } from './validacion';

describe('validarEntradaGasto', () => {
  it('rechaza categorías vacías o compuestas únicamente de espacios en blanco', () => {
    const res = validarEntradaGasto({
      amountText: '150.00',
      categoryId: '   ',
    });

    expect(res.esValido).toBe(false);
    if (!res.esValido) {
      expect(res.error).toBe('Selecciona una categoría para el gasto');
    }
  });

  it('rechaza montos no numéricos, vacíos o mal formateados', () => {
    const invalidos = ['', '   ', 'abc', '$50', '25.999'];

    for (const amountText of invalidos) {
      const res = validarEntradaGasto({
        amountText,
        categoryId: 'comida',
      });

      expect(res.esValido).toBe(false);
      if (!res.esValido) {
        expect(res.error).toBe('Ingresa un monto numérico válido');
      }
    }
  });

  it('rechaza montos menores o iguales a cero', () => {
    const noPositivos = ['0', '0.00', '-10.50', '-100'];

    for (const amountText of noPositivos) {
      const res = validarEntradaGasto({
        amountText,
        categoryId: 'comida',
      });

      expect(res.esValido).toBe(false);
      if (!res.esValido) {
        expect(res.error).toBe('El monto debe ser mayor a cero');
      }
    }
  });

  it('genera payload limpio con conversión precisa a centavos', () => {
    const res = validarEntradaGasto({
      amountText: '350.50',
      categoryId: 'transporte',
      noteText: '  Gasolina semana 41  ',
      cuentaId: 'cuenta-banco-1',
      reciboUri: 'file:///path/to/recibo.jpg',
    });

    expect(res.esValido).toBe(true);
    if (res.esValido) {
      expect(res.payload).toEqual({
        amountCents: 35050,
        currency: 'MXN',
        categoryId: 'transporte',
        note: 'Gasolina semana 41',
        cuentaId: 'cuenta-banco-1',
        reciboUri: 'file:///path/to/recibo.jpg',
      });
    }
  });

  it('omite propiedades opcionales cuando vienen vacías o no definidas', () => {
    const res = validarEntradaGasto({
      amountText: '120',
      categoryId: 'servicios',
      noteText: '   ',
    });

    expect(res.esValido).toBe(true);
    if (res.esValido) {
      expect(res.payload.amountCents).toBe(12000);
      expect(res.payload.note).toBeUndefined();
      expect(res.payload.cuentaId).toBeUndefined();
      expect(res.payload.reciboUri).toBeUndefined();
      expect('note' in res.payload).toBe(false);
      expect('cuentaId' in res.payload).toBe(false);
      expect('reciboUri' in res.payload).toBe(false);
    }
  });
});
