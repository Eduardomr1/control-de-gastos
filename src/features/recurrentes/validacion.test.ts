import { validarEntradaRecurrente } from './validacion';

describe('validarEntradaRecurrente', () => {
  it('rechaza nombres vacíos o de solo espacios en blanco', () => {
    const res = validarEntradaRecurrente({
      nombre: '   ',
      montoText: '250',
      frecuencia: 'mensual',
    });

    expect(res.esValido).toBe(false);
    if (!res.esValido) {
      expect(res.error).toBe('Ponle un nombre para reconocerlo');
    }
  });

  it('rechaza nombres que superan los 60 caracteres', () => {
    const res = validarEntradaRecurrente({
      nombre: 'A'.repeat(61),
      montoText: '250',
      frecuencia: 'mensual',
    });

    expect(res.esValido).toBe(false);
    if (!res.esValido) {
      expect(res.error).toBe('El nombre no puede exceder 60 caracteres');
    }
  });

  it('rechaza montos vacíos, no numéricos o mal formateados', () => {
    const invalidos = ['', '   ', 'abc', '$100', '12.345'];

    for (const montoText of invalidos) {
      const res = validarEntradaRecurrente({
        nombre: 'Suscripción',
        montoText,
        frecuencia: 'mensual',
      });

      expect(res.esValido).toBe(false);
      if (!res.esValido) {
        expect(res.error).toBe('Ingresa un monto válido');
      }
    }
  });

  it('rechaza montos menores o iguales a cero', () => {
    const invalidos = ['0', '0.00', '-50'];

    for (const montoText of invalidos) {
      const res = validarEntradaRecurrente({
        nombre: 'Suscripción',
        montoText,
        frecuencia: 'mensual',
      });

      expect(res.esValido).toBe(false);
      if (!res.esValido) {
        expect(res.error).toBe('El monto debe ser mayor a cero');
      }
    }
  });

  it('devuelve payload sanitizado y estructurado cuando los datos son válidos', () => {
    const res = validarEntradaRecurrente({
      nombre: '  Gimnasio Sport City  ',
      montoText: '1250.50',
      frecuencia: 'mensual',
      categoryId: 'salud',
    });

    expect(res.esValido).toBe(true);
    if (res.esValido) {
      expect(res.payload).toEqual({
        tipo: 'gasto',
        nombre: 'Gimnasio Sport City',
        amountCents: 125050,
        currency: 'MXN',
        frecuencia: 'mensual',
        categoryId: 'salud',
      });
    }
  });

  it('soporta tipo ingreso con fuente configurada', () => {
    const res = validarEntradaRecurrente({
      nombre: 'Freelance diseño',
      montoText: '5000',
      frecuencia: 'quincenal' as any, // prueba de frecuencia no contemplada
    });

    expect(res.esValido).toBe(false);
    if (!res.esValido) {
      expect(res.error).toBe('Frecuencia no válida');
    }
  });

  it('acepta frecuencias anuales y semanales', () => {
    const resAnual = validarEntradaRecurrente({
      nombre: 'Seguro auto',
      montoText: '12000',
      frecuencia: 'anual',
    });
    expect(resAnual.esValido).toBe(true);

    const resSemanal = validarEntradaRecurrente({
      nombre: 'Clases de música',
      montoText: '400',
      frecuencia: 'semanal',
    });
    expect(resSemanal.esValido).toBe(true);
  });
});
