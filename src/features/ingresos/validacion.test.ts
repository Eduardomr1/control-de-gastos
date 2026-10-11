import { validarEntradaIngreso } from './validacion';

describe('validarEntradaIngreso', () => {
  it('valida exitosamente un monto entero en pesos', () => {
    const resultado = validarEntradaIngreso({
      amountText: '1500',
      fuente: 'Sueldo',
    });

    expect(resultado.esValido).toBe(true);
    expect(resultado.error).toBeNull();
    expect(resultado.payload).toEqual({
      amountCents: 1500_00,
      currency: 'MXN',
      fuente: 'Sueldo',
    });
  });

  it('valida exitosamente montos con centavos y separadores de miles', () => {
    const resultado = validarEntradaIngreso({
      amountText: '12,500.50',
      fuente: 'Honorarios',
    });

    expect(resultado.esValido).toBe(true);
    expect(resultado.error).toBeNull();
    expect(resultado.payload?.amountCents).toBe(12_500_50);
    expect(resultado.payload?.fuente).toBe('Honorarios');
  });

  it('incluye la nota limpia (trim) y cuentaId cuando son proporcionadas', () => {
    const resultado = validarEntradaIngreso({
      amountText: '500',
      fuente: 'Ventas',
      noteText: '   Pago de consultoría   ',
      cuentaId: 'cuenta-banamex-123',
    });

    expect(resultado.esValido).toBe(true);
    expect(resultado.payload?.note).toBe('Pago de consultoría');
    expect(resultado.payload?.cuentaId).toBe('cuenta-banamex-123');
  });

  it('omite la propiedad note si el texto de la nota es puramente espacios en blanco', () => {
    const resultado = validarEntradaIngreso({
      amountText: '500',
      fuente: 'Ventas',
      noteText: '     ',
    });

    expect(resultado.esValido).toBe(true);
    expect(resultado.payload?.note).toBeUndefined();
    expect('note' in (resultado.payload ?? {})).toBe(false);
  });

  it('rechaza cuando el monto está vacío', () => {
    const resultado = validarEntradaIngreso({
      amountText: '',
      fuente: 'Sueldo',
    });

    expect(resultado.esValido).toBe(false);
    expect(resultado.error).toBe('Ingresa un monto');
    expect(resultado.payload).toBeUndefined();
  });

  it('rechaza cuando el monto es cero o negativo', () => {
    const resCero = validarEntradaIngreso({
      amountText: '0',
      fuente: 'Sueldo',
    });
    expect(resCero.esValido).toBe(false);
    expect(resCero.error).toBe('El monto debe ser mayor a cero');

    const resNeg = validarEntradaIngreso({
      amountText: '-50',
      fuente: 'Sueldo',
    });
    expect(resNeg.esValido).toBe(false);
    expect(resNeg.error).toBe('El monto debe ser mayor a cero');
  });

  it('rechaza cuando el texto del monto no es un número válido', () => {
    const resultado = validarEntradaIngreso({
      amountText: 'abc',
      fuente: 'Sueldo',
    });

    expect(resultado.esValido).toBe(false);
    expect(resultado.error).toMatch(/Monto inválido/);
  });

  it('rechaza si la fuente está vacía', () => {
    const resultado = validarEntradaIngreso({
      amountText: '100',
      fuente: '   ',
    });

    expect(resultado.esValido).toBe(false);
    expect(resultado.error).toBe('Selecciona una fuente de ingreso');
  });
});
