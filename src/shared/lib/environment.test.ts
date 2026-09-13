import { isRemote } from './environment';

describe('isRemote', () => {
  it('es false sin credenciales de Supabase en el entorno de pruebas', () => {
    expect(isRemote).toBe(false);
  });
});
