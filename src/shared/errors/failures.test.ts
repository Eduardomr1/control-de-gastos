import { esFailure } from './failures';

describe('esFailure', () => {
  it('reconoce un Failure válido', () => {
    expect(esFailure({ tipo: 'SinRed' })).toBe(true);
    expect(esFailure({ tipo: 'DatosInvalidos', motivo: 'credenciales' })).toBe(true);
  });

  it('rechaza un Error normal de JavaScript', () => {
    expect(esFailure(new Error('cualquier cosa'))).toBe(false);
  });

  it('rechaza null', () => {
    expect(esFailure(null)).toBe(false);
  });

  it('rechaza valores primitivos', () => {
    expect(esFailure('un string')).toBe(false);
    expect(esFailure(42)).toBe(false);
    expect(esFailure(undefined)).toBe(false);
  });

  it('rechaza un objeto sin la propiedad tipo', () => {
    expect(esFailure({ message: 'no es un Failure' })).toBe(false);
  });
});
