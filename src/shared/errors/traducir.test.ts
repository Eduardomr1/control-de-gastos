import { traducirPostgrest, traducirAuth } from './traducir';

describe('traducirPostgrest', () => {
  it('tabla inexistente (42P01) -> ServidorNoDisponible', () => {
    expect(traducirPostgrest({ message: 'relation "expenses" does not exist', code: '42P01' })).toEqual({
      tipo: 'ServidorNoDisponible',
      detalleTecnico: 'relation "expenses" does not exist',
    });
  });

  it('un 5xx -> ServidorNoDisponible', () => {
    expect(traducirPostgrest({ message: 'internal error', status: 503 })).toEqual({
      tipo: 'ServidorNoDisponible',
      detalleTecnico: 'internal error',
    });
  });

  it('JWT invalido (PGRST301) -> SesionExpirada', () => {
    expect(traducirPostgrest({ message: 'JWT expired', code: 'PGRST301' })).toEqual({
      tipo: 'SesionExpirada',
    });
  });

  it('401 -> SesionExpirada', () => {
    expect(traducirPostgrest({ message: 'unauthorized', status: 401 })).toEqual({
      tipo: 'SesionExpirada',
    });
  });

  it('fallo de red -> SinRed', () => {
    expect(traducirPostgrest({ message: 'TypeError: Network request failed' })).toEqual({
      tipo: 'SinRed',
    });
  });

  it('un error sin patron conocido -> Desconocido, con el detalle solo para consola', () => {
    expect(traducirPostgrest({ message: 'algo que no habiamos visto' })).toEqual({
      tipo: 'Desconocido',
      detalleTecnico: 'algo que no habiamos visto',
    });
  });
});

describe('traducirAuth', () => {
  it('credenciales invalidas -> DatosInvalidos/credenciales', () => {
    expect(traducirAuth({ message: 'Invalid login credentials' })).toEqual({
      tipo: 'DatosInvalidos',
      motivo: 'credenciales',
    });
  });

  it('cuenta sin confirmar -> DatosInvalidos/cuenta_no_confirmada', () => {
    expect(traducirAuth({ message: 'Email not confirmed' })).toEqual({
      tipo: 'DatosInvalidos',
      motivo: 'cuenta_no_confirmada',
    });
  });

  it('fallo de red -> SinRed', () => {
    expect(traducirAuth({ message: 'fetch failed' })).toEqual({ tipo: 'SinRed' });
  });

  it('un error sin patron conocido -> Desconocido', () => {
    expect(traducirAuth({ message: 'network layer exploded' })).toEqual({
      tipo: 'Desconocido',
      detalleTecnico: 'network layer exploded',
    });
  });
});
