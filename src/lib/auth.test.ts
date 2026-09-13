/**
 * Pruebas de sesion.
 *
 * useSession() vive en useSession.ts, aparte, y no se cubre en ningun lado:
 * es un hook de React y este proyecto corre las pruebas en entorno node. Este
 * archivo prueba la logica propia de auth.ts: la traduccion de errores y que
 * signOut delega la limpieza local al feature de gastos antes de cerrar la
 * sesion remota. El ORDEN push-antes-de-limpiar y la resiliencia sin red son
 * propiedad de limpiarAlCerrarSesion() y se prueban en
 * features/gastos/limpiarAlCerrarSesion.test.ts, no aqui.
 */
import { signIn, signOut } from './auth';

jest.mock('@/shared/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn(),
      signOut: jest.fn().mockResolvedValue({ error: null }),
    },
  },
}));
jest.mock('@/features/gastos', () => ({
  limpiarAlCerrarSesion: jest.fn().mockResolvedValue(undefined),
}));

const { supabase } = jest.requireMock('@/shared/lib/supabase');
const { limpiarAlCerrarSesion } = jest.requireMock('@/features/gastos');

beforeEach(() => {
  jest.clearAllMocks();
  supabase.auth.signOut.mockResolvedValue({ error: null });
  limpiarAlCerrarSesion.mockResolvedValue(undefined);
});

describe('signIn', () => {
  it('no lanza cuando las credenciales son validas', async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({ error: null });
    await expect(signIn('a@test.com', 'secreta123')).resolves.toBeUndefined();
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'a@test.com',
      password: 'secreta123',
    });
  });

  it('traduce credenciales invalidas a un Failure de tipo DatosInvalidos', async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({
      error: { message: 'Invalid login credentials' },
    });
    await expect(signIn('a@test.com', 'mala')).rejects.toEqual({
      tipo: 'DatosInvalidos',
      motivo: 'credenciales',
    });
  });

  it('traduce la cuenta sin confirmar a DatosInvalidos con motivo propio', async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({
      error: { message: 'Email not confirmed' },
    });
    await expect(signIn('a@test.com', 'secreta123')).rejects.toEqual({
      tipo: 'DatosInvalidos',
      motivo: 'cuenta_no_confirmada',
    });
  });

  it('cae a Desconocido ante un error que no reconoce, sin filtrar el mensaje crudo', async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({
      error: { message: 'network layer exploded' },
    });
    await expect(signIn('a@test.com', 'secreta123')).rejects.toMatchObject({ tipo: 'Desconocido' });
  });
});

describe('signOut', () => {
  it('limpia los datos locales del feature de gastos antes de cerrar la sesión remota', async () => {
    const orden: string[] = [];
    limpiarAlCerrarSesion.mockImplementation(async () => {
      orden.push('limpiar-local');
    });
    supabase.auth.signOut.mockImplementation(async () => {
      orden.push('cerrar-sesion-remota');
      return { error: null };
    });

    await signOut();

    expect(orden).toEqual(['limpiar-local', 'cerrar-sesion-remota']);
  });

  it('propaga si la limpieza local falla, sin cerrar la sesión remota a medias', async () => {
    limpiarAlCerrarSesion.mockRejectedValue(new Error('fallo inesperado'));
    await expect(signOut()).rejects.toThrow('fallo inesperado');
    expect(supabase.auth.signOut).not.toHaveBeenCalled();
  });
});
